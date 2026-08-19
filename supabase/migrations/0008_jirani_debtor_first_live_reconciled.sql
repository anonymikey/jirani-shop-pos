-- 0008_jirani_debtor_first_live_reconciled.sql
-- Final reconciled migration for the inspected live Jirani schema.
-- Review only: intentionally not applied by v0.

begin;

create table if not exists public.product_price_options (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  unit_price numeric(14,2) not null check (unit_price >= 0),
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, product_id, unit_price)
);

alter table public.product_price_options enable row level security;
create index if not exists product_price_options_org_product_idx
  on public.product_price_options (organization_id, product_id) where is_active;

drop policy if exists product_price_options_select_member on public.product_price_options;
drop policy if exists product_price_options_insert_member on public.product_price_options;
drop policy if exists product_price_options_update_member on public.product_price_options;
create policy product_price_options_select_member on public.product_price_options
  for select to authenticated using (public.is_org_member(organization_id));
create policy product_price_options_insert_member on public.product_price_options
  for insert to authenticated with check (public.is_org_member(organization_id) and created_by = auth.uid());
create policy product_price_options_update_member on public.product_price_options
  for update to authenticated
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

insert into public.product_price_options (organization_id, product_id, unit_price, created_by)
select p.organization_id, p.id, p.selling_price, p.user_id
from public.products p
where p.organization_id is not null and p.status = 'active' and p.selling_price >= 0
on conflict (organization_id, product_id, unit_price) do nothing;

create unique index if not exists customers_org_normalized_name_uidx
  on public.customers (organization_id, lower(btrim(name)));

create unique index if not exists sales_org_idempotency_uidx
  on public.sales (organization_id, idempotency_key) where idempotency_key is not null;
create unique index if not exists payments_org_idempotency_uidx
  on public.payments (organization_id, idempotency_key) where idempotency_key is not null;

create or replace function public.create_sale_atomic(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid := nullif(payload->>'organization_id', '')::uuid;
  v_key text := nullif(btrim(payload->>'idempotency_key'), '');
  v_requested_payment text := coalesce(nullif(payload->>'payment_method', ''), 'cash');
  v_payment_method text;
  v_customer_id uuid := nullif(payload->>'customer_id', '')::uuid;
  v_customer_name text := nullif(btrim(payload->>'customer_name'), '');
  v_due_at timestamptz := nullif(payload->>'due_at', '')::timestamptz;
  v_items jsonb := coalesce(payload->'items', '[]'::jsonb);
  v_subtotal numeric(14,2) := 0;
  v_discount numeric(14,2) := greatest(0, round(coalesce((payload->>'discount')::numeric, 0), 2));
  v_tax numeric(14,2) := greatest(0, round(coalesce((payload->>'tax')::numeric, 0), 2));
  v_total numeric(14,2);
  v_paid numeric(14,2) := round(coalesce((payload->>'amount_paid')::numeric, 0), 2);
  v_outstanding numeric(14,2);
  v_cost numeric(14,2) := 0;
  v_sale_id uuid;
  v_receipt text;
  v_customer_name_result text;
  v_item jsonb;
  v_product record;
  v_quantity integer;
  v_price numeric(14,2);
  v_line_total numeric(14,2);
  v_existing jsonb;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if v_org is null or not public.is_org_member(v_org) then raise exception 'Not authorized for this shop'; end if;
  if v_key is null then raise exception 'Idempotency key is required'; end if;
  if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) = 0 then raise exception 'Cart is empty'; end if;
  if v_requested_payment not in ('cash', 'mpesa', 'card', 'debt') then raise exception 'Unsupported payment method'; end if;
  if v_paid < 0 then raise exception 'Amount paid cannot be negative'; end if;
  if v_discount < 0 or v_tax < 0 then raise exception 'Invalid discount or tax'; end if;

  select jsonb_build_object('id', s.id, 'receipt_number', s.receipt_number,
    'subtotal', s.subtotal, 'discount', s.discount, 'tax', s.tax, 'total', s.total,
    'amount_paid', coalesce((select sum(p.amount) from public.payments p where p.sale_id=s.id and p.reversed_at is null), 0),
    'outstanding', greatest(0, s.total - coalesce((select sum(p.amount) from public.payments p where p.sale_id=s.id and p.reversed_at is null), 0)),
    'customer_id', s.customer_id, 'duplicate', true)
  into v_existing from public.sales s where s.organization_id=v_org and s.idempotency_key=v_key;
  if v_existing is not null then return v_existing; end if;

  for v_item in select value from jsonb_array_elements(v_items) loop
    begin v_quantity := (v_item->>'quantity')::integer; exception when others then raise exception 'Invalid item quantity'; end;
    if v_quantity is null or v_quantity <= 0 then raise exception 'Invalid item quantity'; end if;
    begin v_price := round((v_item->>'unit_price')::numeric, 2); exception when others then raise exception 'Invalid unit price'; end;
    if v_price is null or v_price < 0 then raise exception 'Invalid unit price'; end if;

    select p.id,p.name,p.cost_price,p.quantity,p.user_id into v_product
    from public.products p where p.id=(v_item->>'product_id')::uuid and p.organization_id=v_org and p.status='active' for update;
    if not found then raise exception 'Product not found in this shop'; end if;
    if v_product.quantity < v_quantity then raise exception 'Insufficient stock for %', v_product.name; end if;
    if not exists (select 1 from public.product_price_options o where o.organization_id=v_org and o.product_id=v_product.id and o.unit_price=v_price and o.is_active) then raise exception 'Price is not approved for %', v_product.name; end if;
    v_line_total := round(v_price * v_quantity, 2);
    v_subtotal := v_subtotal + v_line_total;
    v_cost := v_cost + round(coalesce(v_product.cost_price,0) * v_quantity, 2);
  end loop;

  if v_discount > v_subtotal then v_discount := v_subtotal; end if;
  v_total := round(v_subtotal - v_discount + v_tax, 2);
  if v_paid > v_total then raise exception 'Amount paid exceeds sale total'; end if;
  v_outstanding := round(v_total - v_paid, 2);

  if v_outstanding > 0 then
    if v_customer_id is not null then
      select c.name into v_customer_name_result from public.customers c where c.id=v_customer_id and c.organization_id=v_org for update;
      if not found then raise exception 'Customer is not authorized for this shop'; end if;
    elsif v_customer_name is not null then
      select c.id,c.name into v_customer_id,v_customer_name_result from public.customers c where c.organization_id=v_org and lower(btrim(c.name))=lower(v_customer_name) order by c.created_at asc limit 1 for update;
      if v_customer_id is null then
        insert into public.customers (organization_id,user_id,name,credit_limit,balance) values (v_org,v_user,v_customer_name,0,0) returning id,name into v_customer_id,v_customer_name_result;
      end if;
    else raise exception 'A debtor is required for an outstanding sale'; end if;
  end if;

  v_payment_method := case when v_outstanding > 0 then 'debt' when v_requested_payment = 'debt' then 'cash' else v_requested_payment end;
  v_receipt := coalesce(nullif(btrim(payload->>'receipt_number'), ''), 'JR-' || to_char(clock_timestamp(),'YYYYMMDDHH24MISSMS') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.sales (organization_id,user_id,receipt_number,customer_id,subtotal,discount,tax,total,profit,payment_method,status,due_at,idempotency_key)
  values (v_org,v_user,v_receipt,v_customer_id,v_subtotal,v_discount,v_tax,v_total,round(v_subtotal-v_discount-v_cost,2),v_payment_method,'completed',case when v_outstanding>0 then v_due_at end,v_key)
  returning id into v_sale_id;

  for v_item in select value from jsonb_array_elements(v_items) loop
    v_quantity := (v_item->>'quantity')::integer; v_price := round((v_item->>'unit_price')::numeric,2); v_line_total := round(v_quantity*v_price,2);
    select p.id,p.name,p.cost_price into v_product from public.products p where p.id=(v_item->>'product_id')::uuid for update;
    insert into public.sale_items (organization_id,user_id,sale_id,product_id,product_name,quantity,unit_price,cost_price,line_total)
    values (v_org,v_user,v_sale_id,v_product.id,v_product.name,v_quantity,v_price,v_product.cost_price,v_line_total);
    update public.products set quantity=quantity-v_quantity where id=v_product.id;
    insert into public.inventory_movements (organization_id,product_id,movement_type,quantity,reference_id,created_by)
    values (v_org,v_product.id,'sale',-v_quantity,v_sale_id,v_user);
  end loop;

  if v_paid > 0 then
    insert into public.payments (organization_id,sale_id,customer_id,amount,method,received_by,idempotency_key)
    values (v_org,v_sale_id,case when v_outstanding>0 then v_customer_id else null end,v_paid,case v_requested_payment when 'mpesa' then 'mobile_money' else v_requested_payment end,v_user,v_key || ':sale');
  end if;
  if v_outstanding > 0 then update public.customers set balance=balance+v_outstanding where id=v_customer_id; end if;

  return jsonb_build_object('id',v_sale_id,'receipt_number',v_receipt,'subtotal',v_subtotal,'discount',v_discount,'tax',v_tax,'total',v_total,'amount_paid',v_paid,'outstanding',v_outstanding,'customer_id',v_customer_id,'customer_name',v_customer_name_result,'created_at',clock_timestamp(),'duplicate',false);
end;
$$;

create or replace function public.record_customer_payment(payload jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid(); v_org uuid:=nullif(payload->>'organization_id','')::uuid; v_customer uuid:=nullif(payload->>'customer_id','')::uuid; v_amount numeric(14,2):=round((payload->>'amount')::numeric,2); v_method text:=coalesce(payload->>'method','cash'); v_key text:=nullif(btrim(payload->>'idempotency_key'),''); v_balance numeric(14,2); v_payment uuid; v_outstanding numeric(14,2);
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if v_org is null or not public.is_org_member(v_org) then raise exception 'Not authorized for this shop'; end if;
  if v_customer is null or v_amount is null or v_amount<=0 or v_key is null then raise exception 'Invalid repayment'; end if;
  if v_method not in ('cash','card','mobile_money','credit','bank_transfer') then raise exception 'Unsupported repayment method'; end if;
  select p.id into v_payment from public.payments p where p.organization_id=v_org and p.idempotency_key=v_key limit 1;
  if v_payment is not null then return jsonb_build_object('id',v_payment,'duplicate',true); end if;
  select c.balance into v_balance from public.customers c where c.id=v_customer and c.organization_id=v_org for update;
  if not found then raise exception 'Debtor not found'; end if;
  select greatest(0,coalesce((select sum(s.total) from public.sales s where s.customer_id=v_customer and s.organization_id=v_org and s.status<>'voided' and s.payment_method='debt'),0)-coalesce((select sum(p.amount) from public.payments p where p.customer_id=v_customer and p.organization_id=v_org and p.sale_id is null and p.reversed_at is null),0)) into v_outstanding;
  if v_amount>greatest(v_balance,coalesce(v_outstanding,0)) then raise exception 'Payment exceeds outstanding balance'; end if;
  insert into public.payments (organization_id,customer_id,sale_id,amount,method,received_by,idempotency_key) values (v_org,v_customer,null,v_amount,v_method,v_user,v_key) returning id into v_payment;
  update public.customers set balance=greatest(0,balance-v_amount) where id=v_customer;
  return jsonb_build_object('id',v_payment,'amount',v_amount,'balance',greatest(0,v_balance-v_amount),'duplicate',false);
end;
$$;

revoke all on function public.create_sale_atomic(jsonb) from anon;
revoke all on function public.record_customer_payment(jsonb) from anon;
grant execute on function public.create_sale_atomic(jsonb) to authenticated;
grant execute on function public.record_customer_payment(jsonb) to authenticated;

commit;
