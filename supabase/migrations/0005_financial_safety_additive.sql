begin;

alter table public.sales
  add column if not exists voided_by uuid references auth.users(id) on delete set null,
  add column if not exists voided_at timestamptz,
  add column if not exists void_reason text;

alter table public.payments
  add column if not exists idempotency_key text,
  add column if not exists reversed_at timestamptz,
  add column if not exists reversed_by uuid references auth.users(id) on delete set null,
  add column if not exists reversal_of uuid references public.payments(id) on delete set null;

alter table public.inventory_movements
  add column if not exists reversal_of uuid references public.inventory_movements(id) on delete set null;

create unique index if not exists payments_org_idempotency_unique
  on public.payments (organization_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists payments_org_customer_created_idx
  on public.payments (organization_id, customer_id, created_at desc);

create index if not exists sales_active_customer_idx
  on public.sales (organization_id, customer_id, created_at desc)
  where status = 'completed';

commit;
