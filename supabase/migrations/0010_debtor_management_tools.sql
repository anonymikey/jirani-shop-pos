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

-- create_debtor is also applied to the live project. It reuses an existing customer by organization/name,
-- adds the opening balance, clears archived_at, and records the opening adjustment atomically.
create or replace function public.create_debtor(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid := nullif(payload->>'organization_id','')::uuid;
  v_name text := nullif(btrim(payload->>'name'),'');
  v_phone text := nullif(btrim(payload->>'phone'),'');
  v_amount numeric(14,2) := round((payload->>'opening_amount')::numeric,2);
  v_due timestamptz := nullif(payload->>'due_at','')::timestamptz;
  v_customer uuid;
begin
  if v_user is null or v_org is null or not public.is_org_member(v_org) then raise exception 'Not authorized'; end if;
  if v_name is null or char_length(v_name)>160 or v_amount is null or v_amount<=0 then raise exception 'Invalid debtor details'; end if;
  insert into public.customers(organization_id,user_id,name,phone,credit_limit,balance)
  values(v_org,v_user,v_name,v_phone,0,v_amount)
  on conflict (organization_id, lower(btrim(name))) do update
    set phone = coalesce(excluded.phone, public.customers.phone), balance = public.customers.balance + excluded.balance, archived_at = null
  returning id into v_customer;
  insert into public.debtor_adjustments(organization_id,customer_id,amount,reason,due_at,kind,created_by)
  values(v_org,v_customer,v_amount,'Opening debt',v_due,'opening',v_user);
  return jsonb_build_object('id',v_customer);
end;
$$;
