-- ============================================================================
-- JIRANI SYSTEM — 0004 (OPTIONAL): create_sale_atomic replacement
-- ----------------------------------------------------------------------------
-- ⚠️  RUN THIS ONLY AFTER 0003, AND ONLY AFTER REVIEWING THE VERIFICATION
--     QUERIES BELOW. Do not run this file on a fresh/empty project — for a
--     fresh project use 0001 + 0002 instead.
--
-- This file upgrades the checkout path on the EXISTING v0 database:
--   - authoritative prices/costs/stock (client values are ignored)
--   - stock decremented + audit rows written in the same transaction
--   - idempotency_key dedupe (duplicate checkouts return the same sale)
--   - credit sales require a customer, persist due_at, enforce credit limit
--
-- What it changes:
--   ✅ ALTER TABLE ... ADD COLUMN IF NOT EXISTS  (additive only — nothing is
--      dropped, truncated, or type-changed; if a column already exists the
--      statement is a no-op)
--   ✅ CREATE OR REPLACE FUNCTION create_sale_atomic
--   ✅ CREATE OR REPLACE FUNCTION is_org_member / is_org_admin
--      (tiny RLS helpers the RPC uses; names are unlikely to collide with v0,
--       and CREATE OR REPLACE is safe either way)
--   ❌ No table creation, no DROP/DELETE/TRUNCATE, no policy changes
--
-- COLUMN DEPENDENCIES of the replacement function (what MUST exist):
--   sales:         organization_id, receipt_number, customer_id, subtotal,
--                  discount, tax, total, profit, payment_method, status,
--                  due_at, idempotency_key, created_by, created_at
--                  → subtotal, discount, tax, idempotency_key, created_by are
--                    ADDED below if missing; the rest are already referenced
--                    by the deployed app code.
--   sale_items:    organization_id, sale_id, product_id, product_name,
--                  quantity, unit_price, cost_price, created_at
--                  → unit_price, cost_price are ADDED below if missing;
--                    sale_id/product_id must exist (the v0 RPC writes them).
--   products:      id, name, selling_price, cost_price, quantity, status,
--                  organization_id   (all referenced by the app today)
--   customers:     id, credit_limit, organization_id   (referenced by app)
--   inventory_movements: organization_id, product_id, movement_type,
--                  quantity, created_by  (referenced by app today)
-- ============================================================================

-- ===========================================================================
-- STEP 0 — VERIFICATION QUERIES (run these FIRST, read the output, then run
-- the rest of this file; if any expected column is missing, STOP and report
-- the output before proceeding)
-- ===========================================================================

-- 0a. Actual columns of the six tables the checkout path touches
select table_name, column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_schema = 'public'
   and table_name in ('sales', 'sale_items', 'payments', 'customers', 'products', 'inventory_movements')
 order by table_name, ordinal_position;

-- 0b. Existing auth.users triggers (confirms the current profile bootstrap
--     trigger name so we never collide with it)
select trigger_name, event_manipulation, action_timing
  from information_schema.triggers
 where event_object_schema = 'auth' and event_object_table = 'users'
 order by trigger_name;

-- 0c. Existing relevant functions (will be replaced by this file)
select p.proname, pg_get_function_identity_arguments(p.oid) as args
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('create_sale_atomic', 'can_register_new_user', 'is_org_member', 'is_org_admin')
 order by p.proname;

-- 0d. Duplicate idempotency keys (the unique index from 0003 may have been
--     skipped if this is non-empty)
select organization_id, idempotency_key, count(*) as dupes
  from public.sales
 where idempotency_key is not null
 group by organization_id, idempotency_key
having count(*) > 1;

-- 0e. Sanity: any NOT NULL columns on sales/sale_items without defaults
--     (the function insert must list every one of them)
select table_name, column_name
  from information_schema.columns
 where table_schema = 'public'
   and table_name in ('sales', 'sale_items')
   and is_nullable = 'NO'
   and column_default is null
 order by table_name, ordinal_position;

-- ===========================================================================
-- STEP 1 — ADDITIVE COLUMNS (no-ops when already present)
-- ===========================================================================
alter table public.sales add column if not exists subtotal numeric(14,2) not null default 0;
alter table public.sales add column if not exists discount numeric(14,2) not null default 0;
alter table public.sales add column if not exists tax numeric(14,2) not null default 0;
alter table public.sales add column if not exists idempotency_key text;
alter table public.sales add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.sale_items add column if not exists unit_price numeric(14,2) not null default 0;
alter table public.sale_items add column if not exists cost_price numeric(14,2) not null default 0;

-- ===========================================================================
-- STEP 2 — RLS helpers used by the replacement function
-- ===========================================================================
create or replace function public.is_org_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.organization_members m
     where m.organization_id = target
       and m.user_id = auth.uid()
       and m.is_active
  );
$$;

create or replace function public.is_org_admin(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.organization_members m
     where m.organization_id = target
       and m.user_id = auth.uid()
       and m.is_active
       and m.role in ('owner', 'admin', 'manager')
  );
$$;

-- ===========================================================================
-- STEP 3 — CREATE SALE ATOMIC (replaces the v0 version)
-- ===========================================================================
-- Contract (unchanged from the v0 function the app already calls):
--   create_sale_atomic(payload jsonb)
--     payload.organization_id  uuid
--     payload.receipt_number   text (optional; generated when omitted)
--     payload.customer_id      uuid (required for credit sales)
--     payload.discount         numeric
--     payload.tax              numeric (percent, e.g. 16 = 16%)
--     payload.payment_method   text in (cash, mobile_money, card, credit)
--     payload.due_at           timestamptz (optional, credit sales)
--     payload.idempotency_key  text (dedupe key)
--     payload.items            [{ product_id, quantity }]
--   returns a row: (id, receipt_number, total, subtotal, duplicate)
create or replace function public.create_sale_atomic(payload jsonb)
returns table (id uuid, receipt_number text, total numeric, subtotal numeric, duplicate boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org       uuid := (payload ->> 'organization_id')::uuid;
  v_receipt   text := coalesce(
                      nullif(payload ->> 'receipt_number', ''),
                      'JR-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' ||
                      lpad(floor(random() * 100000)::int::text, 5, '0')
                    );
  v_customer  uuid := nullif(payload ->> 'customer_id', '')::uuid;
  v_discount  numeric := greatest(0, coalesce((payload ->> 'discount')::numeric, 0));
  v_tax_rate  numeric := greatest(0, coalesce((payload ->> 'tax')::numeric, 0));
  v_payment   text := coalesce(payload ->> 'payment_method', 'cash');
  v_key       text := coalesce(nullif(payload ->> 'idempotency_key', ''), gen_random_uuid()::text);
  v_due       timestamptz := nullif(payload ->> 'due_at', '')::timestamptz;
  v_user      uuid := auth.uid();
  v_items     jsonb := coalesce(payload -> 'items', '[]'::jsonb);
  v_sale      uuid;
  v_subtotal  numeric := 0;
  v_cost      numeric := 0;
  v_tax       numeric := 0;
  v_total     numeric := 0;
  v_profit    numeric := 0;
  v_credit_limit numeric := 0;
  v_outstanding numeric := 0;
  v_item      jsonb;
  v_product   record;
  v_qty       integer;
begin
  if v_org is null or jsonb_array_length(v_items) = 0 then
    raise exception 'Invalid sale payload';
  end if;
  if not public.is_org_member(v_org) then
    raise exception 'Not authorized for this shop';
  end if;

  -- Idempotency: return the existing sale when this key was already processed.
  select s.id, s.receipt_number, s.total, s.subtotal
    into v_sale, v_receipt, v_total, v_subtotal
    from public.sales s
   where s.organization_id = v_org
     and s.idempotency_key = v_key;

  if v_sale is not null then
    id := v_sale; receipt_number := v_receipt; total := v_total;
    subtotal := v_subtotal; duplicate := true;
    return next;
    return;
  end if;

  if v_payment not in ('cash', 'mobile_money', 'card', 'credit') then
    raise exception 'Unknown payment method';
  end if;
  if v_payment = 'credit' and v_customer is null then
    raise exception 'A customer is required for credit sales';
  end if;

  -- Validate the customer and pre-compute the outstanding balance (credit only).
  if v_customer is not null then
    select c.credit_limit into v_credit_limit
      from public.customers c
     where c.id = v_customer and c.organization_id = v_org;
    if v_credit_limit is null then
      raise exception 'Customer not found in this shop';
    end if;
    if v_payment = 'credit' then
      select coalesce(sum(s.total), 0) into v_outstanding
        from public.sales s
       where s.organization_id = v_org
         and s.customer_id = v_customer
         and s.payment_method = 'credit'
         and s.status = 'completed';
      select v_outstanding - coalesce(sum(p.amount), 0) into v_outstanding
        from public.payments p
       where p.organization_id = v_org
         and p.customer_id = v_customer;
    end if;
  end if;

  -- Authoritative pricing: read price/cost/stock from the database.
  for v_item in select * from jsonb_array_elements(v_items) loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid item quantity';
    end if;

    select id, name, selling_price, cost_price, quantity
      into v_product
      from public.products
     where id = (v_item ->> 'product_id')::uuid
       and organization_id = v_org
       and status = 'active'
     for update;

    if v_product.id is null then
      raise exception 'Product not found in this shop';
    end if;
    if v_product.quantity < v_qty then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;

    v_subtotal := v_subtotal + (v_product.selling_price * v_qty);
    v_cost     := v_cost + (v_product.cost_price * v_qty);
  end loop;

  if v_discount > v_subtotal then
    v_discount := v_subtotal;
  end if;
  v_tax    := round((v_subtotal - v_discount) * v_tax_rate / 100, 2);
  v_total  := round(v_subtotal - v_discount + v_tax, 2);
  v_profit := round(v_subtotal - v_discount - v_cost, 2);

  -- Credit limit check (only when a limit is configured; 0 = unlimited).
  if v_payment = 'credit' and v_credit_limit > 0
     and (v_outstanding + v_total) > v_credit_limit then
    raise exception 'Credit limit exceeded for this customer';
  end if;

  insert into public.sales (
    organization_id, receipt_number, customer_id, subtotal, discount, tax,
    total, profit, payment_method, status, due_at, idempotency_key, created_by
  )
  values (
    v_org, v_receipt, v_customer, round(v_subtotal, 2), round(v_discount, 2),
    v_tax, v_total, v_profit, v_payment, 'completed', v_due, v_key, v_user
  )
  returning id into v_sale;

  for v_item in select * from jsonb_array_elements(v_items) loop
    v_qty := (v_item ->> 'quantity')::integer;

    select id, name, selling_price, cost_price
      into v_product
      from public.products
     where id = (v_item ->> 'product_id')::uuid
       and organization_id = v_org;

    insert into public.sale_items (
      organization_id, sale_id, product_id, product_name,
      quantity, unit_price, cost_price
    )
    values (
      v_org, v_sale, v_product.id, v_product.name,
      v_qty, v_product.selling_price, v_product.cost_price
    );

    update public.products
       set quantity = quantity - v_qty
     where id = v_product.id;

    insert into public.inventory_movements (
      organization_id, product_id, movement_type, quantity, created_by
    )
    values (v_org, v_product.id, 'sale', -v_qty, v_user);
  end loop;

  -- Keep the stored customer balance in sync for credit sales.
  if v_payment = 'credit' and v_customer is not null then
    update public.customers
       set balance = balance + v_total
     where id = v_customer;
  end if;

  id := v_sale; receipt_number := v_receipt; total := v_total;
  subtotal := v_subtotal; duplicate := false;
  return next;
end;
$$;
