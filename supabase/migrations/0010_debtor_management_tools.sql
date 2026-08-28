-- Debtor management: opening balances, audited adjustments, archiving, and due dates.
create table if not exists public.debtor_adjustments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  amount numeric(14,2) not null check (amount <> 0),
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  due_at timestamptz,
  kind text not null default 'adjustment' check (kind in ('opening','adjustment','clear')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.debtor_adjustments enable row level security;
create index if not exists debtor_adjustments_customer_idx on public.debtor_adjustments(organization_id, customer_id, created_at desc);
drop policy if exists debtor_adjustments_member on public.debtor_adjustments;
create policy debtor_adjustments_member on public.debtor_adjustments for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
alter table public.customers add column if not exists archived_at timestamptz;

-- The create_debtor, adjust_debtor_balance, and update_debtor_due_date functions are installed in the live Supabase project.
