-- ============================================================================
-- JIRANI SYSTEM — 0003: SAFE INCREMENTAL MIGRATION (existing v0 database)
-- ----------------------------------------------------------------------------
-- Run THIS file on the production database that v0 created. It is the only
-- migration that should run against the existing database in this step.
--
-- What it does / does NOT do:
--   ✅ CREATE INDEX IF NOT EXISTS       (query performance, non-destructive)
--   ✅ CREATE OR REPLACE FUNCTION       (signup-gate helpers only)
--   ✅ CREATE TRIGGER                   (optional signup gate, explained below)
--   ❌ CREATE TABLE / ALTER TABLE       (all tables already exist; schema is
--                                        not changed by this file)
--   ❌ DROP / DELETE / TRUNCATE         (none)
--   ❌ RLS policy changes               (your existing v0 policies stay as-is)
--   ❌ create_sale_atomic replacement   (see 0004, gated on verification)
--   ❌ get_or_create_current_organization / handle_new_user replacement
--                                        (existing v0 versions keep working)
-- ============================================================================

-- ===========================================================================
-- 1) Read-optimization indexes (only where the base column exists)
-- ===========================================================================
-- Each index below is skipped automatically if its key column is missing, so
-- nothing here can fail against a differently-shaped live schema.

-- sales: dashboard & reports filter by org + date
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sales' and column_name = 'organization_id'
  ) then
    execute 'create index if not exists sales_org_created_idx on public.sales (organization_id, created_at desc)';
  end if;
end $$;

-- sales: customer history lookups (customers page)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sales' and column_name = 'customer_id'
  ) then
    execute 'create index if not exists sales_customer_idx on public.sales (customer_id)';
  end if;
end $$;

-- sale_items: join by sale and report by org/date
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sale_items' and column_name = 'sale_id'
  ) then
    execute 'create index if not exists sale_items_sale_idx on public.sale_items (sale_id)';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sale_items' and column_name = 'organization_id'
  ) then
    execute 'create index if not exists sale_items_org_created_idx on public.sale_items (organization_id, created_at desc)';
  end if;
end $$;

-- payments: per-customer payment history and org/date reports
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'customer_id'
  ) then
    execute 'create index if not exists payments_customer_idx on public.payments (customer_id, created_at desc)';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'organization_id'
  ) then
    execute 'create index if not exists payments_org_created_idx on public.payments (organization_id, created_at desc)';
  end if;
end $$;

-- expenses: org/date reports
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'expenses' and column_name = 'organization_id'
  ) then
    execute 'create index if not exists expenses_org_date_idx on public.expenses (organization_id, expense_date desc)';
  end if;
end $$;

-- notifications: inbox queries
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'notifications' and column_name = 'user_id'
  ) then
    execute 'create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc)';
  end if;
end $$;

-- inventory_movements: per-product audit trail
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory_movements' and column_name = 'product_id'
  ) then
    execute 'create index if not exists inventory_movements_product_idx on public.inventory_movements (product_id, created_at desc)';
  end if;
end $$;

-- ===========================================================================
-- 2) Duplicate-checkout backstop (SKIPPED automatically when not possible)
-- ===========================================================================
-- A unique index on sales(organization_id, idempotency_key) is what makes a
-- repeated checkout idempotent at the database level. It is only created when
--   a) the column exists, and
--   b) no duplicate (organization_id, idempotency_key) rows exist today.
-- If duplicates exist, the index is NOT created and a notice is raised —
-- review those rows before deciding how to proceed.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sales' and column_name = 'idempotency_key'
  ) then
    raise notice 'SKIPPED sales idempotency unique index: sales.idempotency_key does not exist yet (run 0004 after verification if you want it).';
  elsif exists (
    select 1
      from public.sales
     where idempotency_key is not null
     group by organization_id, idempotency_key
    having count(*) > 1
  ) then
    raise notice 'SKIPPED sales idempotency unique index: duplicate (organization_id, idempotency_key) rows exist. Review them first.';
  else
    execute 'create unique index if not exists sales_org_idem_idx on public.sales (organization_id, idempotency_key) where idempotency_key is not null';
  end if;
end $$;

-- ===========================================================================
-- 3) Signup-gate functions
-- ===========================================================================
-- The app's sign-up page ALREADY calls can_register_new_user() before every
-- signup, so this RPC exists in your database. It is replaced here so the
-- app-level gate and the database-level gate (section 4) agree on one rule:
--
--   RULE: if no shop exists yet, the first-ever account may register (this is
--   how the shop owner creates their account). Once at least one shop exists,
--   registration is only allowed while Settings → Account registration is
--   Open for the shop.
--
-- Behavior change to be aware of: if your database has no row in
-- organization_settings yet, new registrations are now CLOSED by default
-- until the admin opens them in Settings. Existing accounts are unaffected.
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

-- ===========================================================================
-- 4) OPTIONAL: server-side signup gate trigger
-- ===========================================================================
-- WHY A TRIGGER IS REQUIRED: the app-level check in section 3 only protects
-- the UI flow. Anyone can call the Supabase auth API directly and bypass it.
-- A BEFORE INSERT trigger on auth.users is the only way to make the
-- registration restriction unconditional at the database level.
--
-- WHY IT IS SAFE FOR THE EXISTING OWNER/ADMIN:
--   - The trigger only fires on INSERT of a NEW auth.users row. It never
--     touches existing rows, so the current owner/admin account (and their
--     sessions) are completely unaffected.
--   - The rule allows registration whenever no shop exists, so a fresh
--     deployment can always bootstrap its first owner account.
--   - If the shop is ever locked down, the owner can re-open registration
--     from Settings (their session is unaffected), or temporarily disable the
--     gate with:
--         drop trigger if exists jirani_gate_signup_trigger on auth.users;
--     and re-enable it by running the CREATE TRIGGER below again.
--
-- If you prefer to keep only the app-level gate for now, skip this section.
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
