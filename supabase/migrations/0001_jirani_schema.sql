-- ============================================================================
-- ⚠️  DO NOT RUN THIS FILE ON THE EXISTING v0 PRODUCTION DATABASE  ⚠️
-- ----------------------------------------------------------------------------
-- This file is for BRAND-NEW (empty) Supabase projects ONLY.
--
-- Your production database already contains every table below (created by
-- v0), so the CREATE TABLE IF NOT EXISTS statements are no-ops there — but
-- the RLS policy blocks at the bottom will ADD new policies that can WIDEN
-- access on tables that already have working v0 policies (e.g. profiles
-- becomes readable by every authenticated user). Do not run this file on the
-- existing database.
--
-- For the existing database use:
--   0003_jirani_safe_incremental.sql   (run this)
--   0004_jirani_create_sale_atomic_optional.sql  (only AFTER schema
--       verification queries confirm the columns)
-- ============================================================================
-- JIRANI SYSTEM — 0001: Schema (fresh project only)
-- ----------------------------------------------------------------------------
-- Tables it creates (only if missing):
--   organizations, profiles, organization_members, organization_settings,
--   products, customers, sales, sale_items, payments, expenses,
--   inventory_movements, notifications, sync_queue
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'My Shop',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles (mirror of auth.users for display data)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Organization membership & roles
-- Roles: owner > admin > manager > cashier/accountant
-- ---------------------------------------------------------------------------
create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null default 'cashier'
                  check (role in ('owner', 'admin', 'manager', 'cashier', 'accountant')),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- Per-shop operational settings (single shop in this deployment)
create table if not exists public.organization_settings (
  organization_id             uuid primary key references public.organizations(id) on delete cascade,
  allow_new_user_registration boolean not null default false,
  updated_at                  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Products / inventory
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id        uuid references auth.users(id) on delete set null,
  name           text not null,
  brand          text,
  sku            text,
  cost_price     numeric(14,2) not null default 0,
  selling_price  numeric(14,2) not null default 0,
  quantity       integer not null default 0 check (quantity >= 0),
  reorder_level  integer not null default 0,
  status         text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Customers / debtors
-- credit_limit = 0 means no limit (unlimited)
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete set null,
  name            text not null,
  phone           text,
  email           text,
  credit_limit    numeric(14,2) not null default 0,
  balance         numeric(14,2) not null default 0,
  status          text not null default 'active' check (status in ('active', 'inactive')),
  created_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sales ledger
--   profit = (subtotal - discount) - COGS  (tax is collected, not profit)
--   idempotency_key  -> unique per shop, prevents duplicate checkouts
-- ---------------------------------------------------------------------------
create table if not exists public.sales (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  receipt_number  text not null,
  customer_id     uuid references public.customers(id) on delete set null,
  subtotal        numeric(14,2) not null default 0,
  discount        numeric(14,2) not null default 0,
  tax             numeric(14,2) not null default 0,
  total           numeric(14,2) not null default 0,
  profit          numeric(14,2) not null default 0,
  payment_method  text not null default 'cash'
                  check (payment_method in ('cash', 'mobile_money', 'card', 'credit')),
  status          text not null default 'completed'
                  check (status in ('completed', 'pending', 'voided')),
  due_at          timestamptz,
  idempotency_key text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists sales_org_created_idx   on public.sales (organization_id, created_at desc);
create index if not exists sales_customer_idx      on public.sales (customer_id);
create unique index if not exists sales_org_idem_idx on public.sales (organization_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.sale_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sale_id         uuid not null references public.sales(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  product_name    text not null,
  quantity        integer not null,
  unit_price      numeric(14,2) not null,
  cost_price      numeric(14,2) not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists sale_items_sale_idx      on public.sale_items (sale_id);
create index if not exists sale_items_org_created_idx on public.sale_items (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Payments / collections ledger
--   payment_type 'debt' = repayment of an outstanding credit balance
--   (recorded against a customer, NOT a new sale)
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id     uuid not null references public.customers(id) on delete cascade,
  sale_id         uuid references public.sales(id) on delete set null,
  payment_type    text not null default 'debt' check (payment_type in ('debt', 'sale')),
  amount          numeric(14,2) not null check (amount > 0),
  method          text not null default 'cash'
                  check (method in ('cash', 'mobile_money', 'card', 'bank_transfer')),
  reference       text,
  received_by     uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists payments_customer_idx   on public.payments (customer_id, created_at desc);
create index if not exists payments_org_created_idx on public.payments (organization_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Expenses
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category        text not null,
  description     text,
  amount          numeric(14,2) not null check (amount > 0),
  expense_date    date not null default current_date,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists expenses_org_date_idx on public.expenses (organization_id, expense_date desc);

-- ---------------------------------------------------------------------------
-- Inventory audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_movements (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id      uuid not null references public.products(id) on delete cascade,
  movement_type   text not null default 'adjustment'
                  check (movement_type in ('sale', 'purchase', 'adjustment', 'return')),
  quantity        integer not null,
  note            text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists inventory_movements_product_idx on public.inventory_movements (product_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  type            text not null default 'info',
  title           text not null,
  body            text,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Offline sync acknowledgment queue
-- ---------------------------------------------------------------------------
create table if not exists public.sync_queue (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  operation       text not null,
  payload         jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  status          text not null default 'pending'
                  check (status in ('pending', 'completed', 'failed')),
  attempts        integer not null default 0,
  processed_at    timestamptz,
  created_at      timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

-- ===========================================================================
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Helper predicates are defined in 0002 (functions). Policies below call them,
-- so 0002 MUST be run right after this file.
-- Every policy below is only created if one with the same name does not exist,
-- so running on the existing v0-managed database does not duplicate or weaken
-- policies that are already there.
-- ===========================================================================

-- Organizations: members can read their own shop rows.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organizations' and policyname = 'org_members_read') then
    alter table public.organizations enable row level security;
    create policy org_members_read on public.organizations
      for select to authenticated
      using (public.is_org_member(id));
  end if;
end $$;

-- Profiles: any authenticated user may read profile names; users edit their own.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_read_authed') then
    alter table public.profiles enable row level security;
    create policy profiles_read_authed on public.profiles
      for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_write_own') then
    create policy profiles_write_own on public.profiles
      for update to authenticated
      using (id = auth.uid()) with check (id = auth.uid());
  end if;
end $$;

-- Members: members can view membership of their shop; only admins change it.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organization_members' and policyname = 'members_read_org') then
    alter table public.organization_members enable row level security;
    create policy members_read_org on public.organization_members
      for select to authenticated
      using (public.is_org_member(organization_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organization_members' and policyname = 'members_admin_write') then
    create policy members_admin_write on public.organization_members
      for update to authenticated
      using (public.is_org_admin(organization_id))
      with check (public.is_org_admin(organization_id));
  end if;
end $$;

-- Settings: read for members, write for admins.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organization_settings' and policyname = 'settings_read_org') then
    alter table public.organization_settings enable row level security;
    create policy settings_read_org on public.organization_settings
      for select to authenticated
      using (public.is_org_member(organization_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'organization_settings' and policyname = 'settings_admin_write') then
    create policy settings_admin_write on public.organization_settings
      for insert to authenticated
      with check (public.is_org_admin(organization_id));
    create policy settings_admin_update on public.organization_settings
      for update to authenticated
      using (public.is_org_admin(organization_id))
      with check (public.is_org_admin(organization_id));
  end if;
end $$;

-- Org-scoped business tables: members can read and write their shop's rows.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'products' and policyname = 'products_org_access') then
    alter table public.products enable row level security;
    create policy products_org_access on public.products
      for all to authenticated
      using (public.is_org_member(organization_id))
      with check (public.is_org_member(organization_id));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'customers' and policyname = 'customers_org_access') then
    alter table public.customers enable row level security;
    create policy customers_org_access on public.customers
      for all to authenticated
      using (public.is_org_member(organization_id))
      with check (public.is_org_member(organization_id));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sales' and policyname = 'sales_org_access') then
    alter table public.sales enable row level security;
    create policy sales_org_access on public.sales
      for all to authenticated
      using (public.is_org_member(organization_id))
      with check (public.is_org_member(organization_id));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sale_items' and policyname = 'sale_items_org_access') then
    alter table public.sale_items enable row level security;
    create policy sale_items_org_access on public.sale_items
      for all to authenticated
      using (public.is_org_member(organization_id))
      with check (public.is_org_member(organization_id));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'payments' and policyname = 'payments_org_access') then
    alter table public.payments enable row level security;
    create policy payments_org_access on public.payments
      for all to authenticated
      using (public.is_org_member(organization_id))
      with check (public.is_org_member(organization_id));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'expenses' and policyname = 'expenses_org_access') then
    alter table public.expenses enable row level security;
    create policy expenses_org_access on public.expenses
      for all to authenticated
      using (public.is_org_member(organization_id))
      with check (public.is_org_member(organization_id));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'inventory_movements' and policyname = 'movements_org_access') then
    alter table public.inventory_movements enable row level security;
    create policy movements_org_access on public.inventory_movements
      for all to authenticated
      using (public.is_org_member(organization_id))
      with check (public.is_org_member(organization_id));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_own') then
    alter table public.notifications enable row level security;
    create policy notifications_own on public.notifications
      for select to authenticated
      using (user_id = auth.uid());
    create policy notifications_insert_org on public.notifications
      for insert to authenticated
      with check (public.is_org_member(organization_id));
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'sync_queue' and policyname = 'sync_queue_org_access') then
    alter table public.sync_queue enable row level security;
    create policy sync_queue_org_access on public.sync_queue
      for all to authenticated
      using (public.is_org_member(organization_id))
      with check (public.is_org_member(organization_id));
  end if;
end $$;
