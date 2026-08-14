-- ============================================================================
-- ⚠️  DO NOT RUN THIS FILE ON THE EXISTING v0 PRODUCTION DATABASE  ⚠️
-- ----------------------------------------------------------------------------
-- This file pairs with 0001 and is for BRAND-NEW projects ONLY.
--
-- On the existing v0 database, running this file would REPLACE the working
-- production functions/triggers that the deployed app already uses:
--   - create_sale_atomic            → depends on unverified sales columns
--   - get_or_create_current_organization → unnecessary replacement
--   - handle_new_user + on_auth_user_created trigger → already exists in v0
--   - can_register_new_user         → behavior change (closed by default)
--
-- For the existing database use 0003 (safe incremental) and, only after
-- schema verification, 0004 (create_sale_atomic replacement).
-- ============================================================================
-- JIRANI SYSTEM — 0002: Functions, RPCs and triggers (fresh project only)
-- ----------------------------------------------------------------------------
-- Includes:
--   - RLS helpers: is_org_member, is_org_admin
--   - Registration gate: jirani_registration_open, can_register_new_user,
--     jirani_gate_signup trigger on auth.users (server-side signup control)
--   - Profile bootstrap: handle_new_user trigger on auth.users
--   - get_or_create_current_organization (org bootstrap)
--   - create_sale_atomic (authoritative, atomic, idempotent checkout)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Registration gate
-- ---------------------------------------------------------------------------
-- Rule: while the system has no shops yet, the FIRST signup is allowed (that
-- is how the shop owner creates their account). Once a shop exists, new
-- registrations are only allowed while at least one shop has
-- "allow_new_user_registration" turned on in Settings.
create or replace function public.jirani_registration_open()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not exists (select 1 from public.organizations) then true
    else coalesce(
      (select bool_or(allow_new_user_registration) from public.organization_settings),
      false
    )
  end;
$$;

create or replace function public.can_register_new_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.jirani_registration_open();
$$;

-- Hard server/database-side gate: blocks the auth.users insert itself.
create or replace function public.jirani_gate_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.jirani_registration_open() then
    raise exception using
      errcode = 'P0001',
      message = 'New account registration is currently closed';
  end if;
  return new;
end;
$$;

drop trigger if exists jirani_gate_signup_trigger on auth.users;
create trigger jirani_gate_signup_trigger
  before insert on auth.users
  for each row execute function public.jirani_gate_signup();

-- ---------------------------------------------------------------------------
-- Profile bootstrap: every new auth user gets a profiles row.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Organization bootstrap
-- ---------------------------------------------------------------------------
-- Returns the caller's shop id, creating the shop + owner membership the
-- first time a user opens the dashboard. SECURITY DEFINER so the insert is not
-- blocked by RLS on organizations / organization_members.
create or replace function public.get_or_create_current_organization()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_org  uuid;
  v_name text;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select m.organization_id into v_org
    from public.organization_members m
   where m.user_id = v_user
     and m.is_active
   order by m.created_at asc
   limit 1;

  if v_org is not null then
    return v_org;
  end if;

  select coalesce(nullif(trim(p.full_name), ''), nullif(au.email, ''), 'My Shop')
    into v_name
    from auth.users au
    left join public.profiles p on p.id = au.id
   where au.id = v_user;

  insert into public.organizations (name)
  values (coalesce(v_name, 'My Shop'))
  returning id into v_org;

  insert into public.organization_members (organization_id, user_id, role, is_active)
  values (v_org, v_user, 'owner', true);

  return v_org;
end;
$$;

-- ---------------------------------------------------------------------------
-- Atomic, authoritative, idempotent checkout
-- ---------------------------------------------------------------------------
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
--
-- Security properties:
--   - Prices, costs and stock are read from the database, never from the client.
--   - Stock is decremented and audit rows inserted in the same transaction.
--   - A repeated idempotency_key returns the existing sale (duplicate = true).
--   - Credit sales require a customer and respect the customer's credit limit.
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
  v_tax   := round((v_subtotal - v_discount) * v_tax_rate / 100, 2);
  v_total := round(v_subtotal - v_discount + v_tax, 2);
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
