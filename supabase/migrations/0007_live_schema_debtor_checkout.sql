begin;

-- Additive compatibility migration for the live Jirani schema.
-- This file is intentionally NOT applied.

create table if not exists public.product_price_options (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (organization_id, product_id, unit_price)
);

alter table public.product_price_options enable row level security;

create index if not exists product_price_options_org_product_active_idx
  on public.product_price_options (organization_id, product_id)
  where is_active = true;

create unique index if not exists customers_user_org_active_normalized_name_idx
  on public.customers (organization_id, user_id, lower(btrim(name)))
  where status = 'active';

insert into public.product_price_options (organization_id, product_id, unit_price, created_by)
select p.organization_id, p.id, p.selling_price, p.user_id
from public.products p
where p.status = 'active'
  and p.selling_price >= 0
on conflict (organization_id, product_id, unit_price) do nothing;

create or replace function public.create_sale_atomic(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid := nullif(payload->>'organization_id', '')::uuid;
  v_customer uuid := nullif(payload->>'customer_id', '')::uuid;
  v_customer_name text := nullif(btrim(payload->>'customer_name'), '');
  v_key text := nullif(payload->>'idempotency_key', '');
  v_payment text := coalesce(payload->>'payment_method', 'cash');
  v_sale uuid;
  v_total numeric := 0;
  v_subtotal numeric := 0;
  v_discount numeric := greatest(0, coalesce((payload->>'discount')::numeric, 0));
  v_tax numeric := greatest(0, coalesce((payload->>'tax')::numeric, 0));
  v_paid numeric := greatest(0, coalesce((payload->>'amount_paid')::numeric, 0));
  v_outstanding numeric;
  v_customer_balance numeric;
  v_credit_limit numeric;
  v_due_at timestamptz := nullif(payload->>'due_at', '')::timestamptz;
  v_items jsonb := coalesce(payload->'items', '[]'::jsonb);
  v_receipt text;
  v_cost numeric := 0;
  v_item jsonb;
  v_product record;
  v_price numeric;
  v_quantity integer;
  v_payment_method text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if v_org is null or not public.is_org_member(v_org) then raise exception 'Not authorized for this shop'; end if;
  if v_key is null then raise exception 'Idempotency key is required'; end if;

  select s.id into v_sale
  from public.sales s
  where s.organization_id = v_org and s.idempotency_key = v_key
  limit 1;
  if v_sale is not null then
    return jsonb_build_object('id', v_sale, 'duplicate', true);
  end if;

  if jsonb_array_length(v_items) = 0 then raise exception 'Cart is empty'; end if;
  if v_payment not in ('cash', 'mpesa', 'card', 'mobile_money', 'credit', 'debt') then raise exception 'Unsupported payment method'; end if;

  for v_item in select value from jsonb_array_elements(v_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then raise exception 'Invalid item quantity'; end if;

    select p.id, p.name, p.selling_price, p.cost_price, p.quantity, p.user_id
      into v_product
    from public.products p
    where p.id = (v_item->>'product_id')::uuid
      and p.organization_id = v_org
      and p.status = 'active'
    for update;
    if not found then raise exception 'Product not found in this shop'; end if;
    if v_product.quantity < v_quantity then raise exception 'Insufficient stock for %', v_product.name; end if;

    v_price := (v_item->>'unit_price')::numeric;
    if v_price is null or v_price < 0 then raise exception 'Invalid unit price'; end if;
    if not exists (
      select 1 from public.product_price_options o
      where o.organization_id = v_org
        and o.product_id = v_product.id
        and o.unit_price = v_price
        and o.is_active
    ) then raise exception 'Price is not approved for %', v_product.name; end if;

    v_subtotal := v_subtotal + (v_price * v_quantity);
    v_cost := v_cost + (v_product.cost_price * v_quantity);
  end loop;

  v_discount := least(v_discount, v_subtotal);
  v_total := round(v_subtotal - v_discount + v_tax, 2);
  if v_paid > v_total then raise exception 'Amount paid exceeds sale total'; end if;
  v_outstanding := round(v_total - v_paid, 2);

  if v_outstanding > 0 then
    if v_customer is null and v_customer_name is null then raise exception 'A debtor is required for an outstanding sale'; end if;
    if v_customer is not null then
      perform 1 from public.customers c where c.id = v_customer and c.organization_id = v_org and c.user_id = v_user and c.status = 'active' for update;
      if not found then raise exception 'Customer is not authorized for this shop'; end if;
    else
      select c.id into v_customer from public.customers c
      where c.organization_id = v_org and c.user_id = v_user and c.status = 'active'
        and lower(btrim(c.name)) = lower(v_customer_name)
      order by c.created_at asc limit 1 for update;
      if v_customer is null then
        insert into public.customers (organization_id, user_id, name, credit_limit, balance, status)
        values (v_org, v_user, btrim(v_customer_name), 0, 0, 'active')
        on conflict do nothing;
        select c.id into v_customer from public.customers c
        where c.organization_id = v_org and c.user_id = v_user and c.status = 'active'
          and lower(btrim(c.name)) = lower(v_customer_name)
        order by c.created_at asc limit 1 for update;
      end if;
    end if;
    select c.balance, c.credit_limit into v_customer_balance, v_credit_limit from public.customers c where c.id = v_customer for update;
    if coalesce(v_credit_limit, 0) > 0 and coalesce(v_customer_balance, 0) + v_outstanding > v_credit_limit then raise exception 'Credit limit exceeded'; end if;
  end if;

  v_payment_method := case when v_outstanding > 0 then 'debt' when v_payment = 'mobile_money' then 'mpesa' when v_payment = 'credit' then 'cash' else v_payment end;
  insert into public.sales (organization_id, user_id, customer_id, subtotal, discount, tax, total, profit, payment_method, status, due_at, idempotency_key)
  values (v_org, v_user, v_customer, round(v_subtotal, 2), v_discount, v_tax, v_total, round(v_subtotal - v_discount - v_cost, 2), v_payment_method, 'completed', case when v_outstanding > 0 then v_due_at end, v_key)
  returning id, receipt_number into v_sale, v_receipt;

  for v_item in select value from jsonb_array_elements(v_items) loop
    v_quantity := (v_item->>'quantity')::integer;
    v_price := (v_item->>'unit_price')::numeric;
    select p.id, p.name, p.cost_price into v_product from public.products p where p.id = (v_item->>'product_id')::uuid for update;
    insert into public.sale_items (organization_id, user_id, sale_id, product_id, product_name, quantity, unit_price, cost_price, line_total)
    values (v_org, v_user, v_sale, v_product.id, v_product.name, v_quantity, v_price, v_product.cost_price, round(v_quantity * v_price, 2));
    update public.products set quantity = quantity - v_quantity where id = v_product.id;
    insert into public.inventory_movements (organization_id, user_id, product_id, movement_type, quantity, created_by)
    values (v_org, v_user, v_product.id, 'sale', -v_quantity, v_user);
  end loop;

  if v_paid > 0 then
    insert into public.payments (organization_id, user_id, customer_id, sale_id, payment_type, amount, method, received_by, idempotency_key)
    values (v_org, v_user, case when v_outstanding > 0 then v_customer else null end, v_sale, 'sale', v_paid, case when v_payment = 'mpesa' then 'mobile_money' when v_payment in ('debt', 'credit') then 'cash' else v_payment end, v_user, v_key || ':sale');
  end if;
  if v_outstanding > 0 then update public.customers set balance = coalesce(balance, 0) + v_outstanding where id = v_customer; end if;

  return jsonb_build_object('id', v_sale, 'receipt_number', v_receipt, 'total', v_total, 'subtotal', v_subtotal, 'amount_paid', v_paid, 'outstanding', v_outstanding, 'duplicate', false);
end;
$$;

create or replace function public.record_customer_payment(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid(); v_org uuid := nullif(payload->>'organization_id','')::uuid; v_customer uuid := nullif(payload->>'customer_id','')::uuid; v_amount numeric := (payload->>'amount')::numeric; v_key text := nullif(payload->>'idempotency_key',''); v_balance numeric; v_payment uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if v_org is null or not public.is_org_member(v_org) then raise exception 'Not authorized for this shop'; end if;
  if v_amount is null or v_amount <= 0 or v_key is null then raise exception 'Invalid repayment'; end if;
  select p.id into v_payment from public.payments p where p.organization_id = v_org and p.idempotency_key = v_key limit 1;
  if v_payment is not null then return jsonb_build_object('id', v_payment, 'duplicate', true); end if;
  select c.balance into v_balance from public.customers c where c.id = v_customer and c.organization_id = v_org and c.user_id = v_user and c.status = 'active' for update;
  if not found then raise exception 'Debtor not found'; end if;
  if v_amount > coalesce(v_balance, 0) then raise exception 'Payment exceeds outstanding balance'; end if;
  insert into public.payments (organization_id, user_id, customer_id, payment_type, amount, method, reference, received_by, idempotency_key)
  values (v_org, v_user, v_customer, 'debt', v_amount, coalesce(payload->>'method','cash'), nullif(payload->>'reference',''), v_user, v_key) returning id into v_payment;
  update public.customers set balance = balance - v_amount where id = v_customer;
  return jsonb_build_object('id', v_payment, 'amount', v_amount, 'balance', v_balance - v_amount, 'duplicate', false);
end;
$$;

revoke all on function public.create_sale_atomic(jsonb) from anon;
revoke all on function public.record_customer_payment(jsonb) from anon;
grant execute on function public.create_sale_atomic(jsonb) to authenticated;
grant execute on function public.record_customer_payment(jsonb) to authenticated;

commit;
