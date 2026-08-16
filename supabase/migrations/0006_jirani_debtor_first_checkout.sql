begin;

-- Approved checkout prices. A line price must match an active option for the
-- same organization/product; the current catalog price is seeded as an option.
create table if not exists public.product_price_options (
  id uuid primary key default public.gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  unit_price numeric(14,2) not null check (unit_price >= 0),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, product_id, unit_price)
);

alter table public.product_price_options enable row level security;

create policy "price_options_select_org_members" on public.product_price_options
  for select to authenticated using (public.is_org_member(organization_id));
create policy "price_options_insert_org_members" on public.product_price_options
  for insert to authenticated with check (public.is_org_member(organization_id));
create policy "price_options_update_org_members" on public.product_price_options
  for update to authenticated using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create unique index if not exists customers_org_normalized_active_name_idx
  on public.customers (organization_id, lower(btrim(name)))
  where status = 'active';

-- Fully paid anonymous sales still record their payment against the sale;
-- customer_id must therefore be nullable for that supported flow.
alter table public.payments alter column customer_id drop not null;

insert into public.product_price_options (organization_id, product_id, unit_price)
select p.organization_id, p.id, p.selling_price
from public.products p
where p.status = 'active'
on conflict (organization_id, product_id, unit_price) do nothing;

create or replace function public.create_sale_atomic(payload jsonb)
returns table(id uuid, receipt_number text, total numeric, subtotal numeric, amount_paid numeric, outstanding numeric, duplicate boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := nullif(payload->>'organization_id','')::uuid;
  v_user uuid := auth.uid();
  v_customer uuid := nullif(payload->>'customer_id','')::uuid;
  v_customer_name text := nullif(btrim(payload->>'customer_name'),'');
  v_payment text := coalesce(payload->>'payment_method','cash');
  v_key text := coalesce(nullif(payload->>'idempotency_key',''), public.gen_random_uuid()::text);
  v_receipt text := coalesce(nullif(payload->>'receipt_number',''),'JR-' || to_char(now(),'YYYYMMDDHH24MISS'));
  v_discount numeric := greatest(0, coalesce((payload->>'discount')::numeric, 0));
  v_tax_rate numeric := greatest(0, coalesce((payload->>'tax')::numeric, 0));
  v_paid numeric := greatest(0, coalesce((payload->>'amount_paid')::numeric, 0));
  v_due timestamptz := nullif(payload->>'due_at','')::timestamptz;
  v_items jsonb := coalesce(payload->'items','[]'::jsonb);
  v_sale uuid; v_subtotal numeric := 0; v_tax numeric := 0; v_total numeric := 0;
  v_cost numeric := 0; v_balance numeric := 0; v_limit numeric := 0;
  v_item jsonb; v_product record; v_price numeric; v_qty integer;
begin
  if v_user is null or v_org is null or not public.is_org_member(v_org) then raise exception 'Not authorized for this shop'; end if;

  select s.id, s.receipt_number, s.total, s.subtotal,
         coalesce((select sum(pay.amount) from public.payments pay where pay.sale_id = s.id and pay.reversed_at is null), 0)
    into v_sale, v_receipt, v_total, v_subtotal, v_paid
    from public.sales s
   where s.organization_id = v_org and s.idempotency_key = v_key;
  if v_sale is not null then
    id := v_sale; receipt_number := v_receipt; total := v_total; subtotal := v_subtotal;
    amount_paid := v_paid; outstanding := greatest(0, v_total - v_paid); duplicate := true; return next; return;
  end if;

  if v_payment not in ('cash','mobile_money','card','credit') then raise exception 'Unknown payment method'; end if;
  if jsonb_array_length(v_items) = 0 then raise exception 'Cart is empty'; end if;

  for v_item in select * from jsonb_array_elements(v_items) loop
    v_qty := (v_item->>'quantity')::integer;
    v_price := (v_item->>'unit_price')::numeric;
    if v_qty is null or v_qty <= 0 or v_price is null or v_price < 0 then raise exception 'Invalid line item'; end if;
    select p.id, p.name, p.cost_price, p.quantity into v_product
      from public.products p
     where p.id = (v_item->>'product_id')::uuid and p.organization_id = v_org and p.status = 'active'
     for update;
    if v_product.id is null then raise exception 'Product not found in this shop'; end if;
    if v_product.quantity < v_qty then raise exception 'Insufficient stock for %', v_product.name; end if;
    if not exists (select 1 from public.product_price_options o where o.organization_id = v_org and o.product_id = v_product.id and o.unit_price = v_price and o.is_active) then
      raise exception 'Price is not approved for %', v_product.name;
    end if;
    v_subtotal := v_subtotal + v_price * v_qty;
    v_cost := v_cost + v_product.cost_price * v_qty;
  end loop;

  v_discount := least(v_discount, v_subtotal);
  v_tax := round((v_subtotal - v_discount) * v_tax_rate / 100, 2);
  v_total := round(v_subtotal - v_discount + v_tax, 2);
  if v_paid > v_total then raise exception 'Amount paid exceeds sale total'; end if;
  v_balance := round(v_total - v_paid, 2);

  if v_balance > 0 then
    if v_customer is null and v_customer_name is null then raise exception 'A customer is required for outstanding sales'; end if;
    if v_customer is null then
      select c.id into v_customer from public.customers c
       where c.organization_id = v_org and lower(btrim(c.name)) = lower(v_customer_name) and c.status = 'active'
       order by c.created_at asc limit 1 for update;
      if v_customer is null then
        insert into public.customers(user_id, organization_id, name, credit_limit, balance, status)
        values (v_user, v_org, btrim(v_customer_name), 0, 0, 'active')
        on conflict do nothing;
        select c.id into v_customer from public.customers c
         where c.organization_id = v_org and lower(btrim(c.name)) = lower(v_customer_name) and c.status = 'active'
         order by c.created_at asc limit 1 for update;
      end if;
    else
      perform 1 from public.customers c where c.id = v_customer and c.organization_id = v_org and c.status = 'active' for update;
      if not found then raise exception 'Customer not found in this shop'; end if;
    end if;
    select c.credit_limit into v_limit from public.customers c where c.id = v_customer for update;
    if v_limit > 0 and (coalesce((select c.balance from public.customers c where c.id = v_customer), 0) + v_balance) > v_limit then raise exception 'Credit limit exceeded for this customer'; end if;
  end if;

  insert into public.sales(organization_id, receipt_number, customer_id, subtotal, discount, tax, total, profit, payment_method, status, due_at, idempotency_key, created_by)
  values (v_org, v_receipt, v_customer, round(v_subtotal,2), v_discount, v_tax, v_total, round(v_subtotal - v_discount - v_cost,2), case when v_balance > 0 then 'credit' else v_payment end, 'completed', case when v_balance > 0 then v_due end, v_key, v_user)
  returning id into v_sale;

  for v_item in select * from jsonb_array_elements(v_items) loop
    v_qty := (v_item->>'quantity')::integer; v_price := (v_item->>'unit_price')::numeric;
    select p.id, p.name, p.cost_price into v_product from public.products p where p.id = (v_item->>'product_id')::uuid and p.organization_id = v_org;
    insert into public.sale_items(organization_id, sale_id, product_id, product_name, quantity, unit_price, cost_price)
    values (v_org, v_sale, v_product.id, v_product.name, v_qty, v_price, v_product.cost_price);
    update public.products set quantity = quantity - v_qty where id = v_product.id;
    insert into public.inventory_movements(organization_id, product_id, movement_type, quantity, created_by)
    values (v_org, v_product.id, 'sale', -v_qty, v_user);
  end loop;

  if v_paid > 0 then
    insert into public.payments(organization_id, customer_id, sale_id, payment_type, amount, method, received_by, idempotency_key)
    values (v_org, case when v_balance > 0 then v_customer else null end, v_sale, 'sale', v_paid, case when v_payment = 'credit' then 'cash' else v_payment end, v_user, v_key || ':payment');
  end if;
  if v_customer is not null and v_balance > 0 then update public.customers set balance = greatest(0, balance + v_balance) where id = v_customer; end if;

  id := v_sale; receipt_number := v_receipt; total := v_total; subtotal := v_subtotal; amount_paid := v_paid; outstanding := v_balance; duplicate := false; return next;
end;
$$;

grant execute on function public.create_sale_atomic(jsonb) to authenticated;
commit;
