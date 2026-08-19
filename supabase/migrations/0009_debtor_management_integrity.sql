begin;

create or replace function public.update_sale_due_date(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid := nullif(payload->>'organization_id','')::uuid;
  v_sale uuid := nullif(payload->>'sale_id','')::uuid;
  v_due_at timestamptz := nullif(payload->>'due_at','')::timestamptz;
  v_customer uuid;
  v_balance numeric(14,2);
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if v_org is null or not public.is_org_member(v_org) then raise exception 'Not authorized for this shop'; end if;
  if v_sale is null then raise exception 'Sale is required'; end if;
  select s.customer_id into v_customer from public.sales s where s.id=v_sale and s.organization_id=v_org and s.status='completed' for update;
  if not found or v_customer is null then raise exception 'Credit sale not found'; end if;
  select greatest(0, s.total - coalesce((select sum(p.amount) from public.payments p where p.sale_id=s.id and p.reversed_at is null),0)) into v_balance from public.sales s where s.id=v_sale;
  if v_balance <= 0 then raise exception 'Paid sales cannot have a due date'; end if;
  update public.sales set due_at=v_due_at where id=v_sale and organization_id=v_org;
  return jsonb_build_object('sale_id',v_sale,'due_at',v_due_at);
end;
$$;

revoke all on function public.update_sale_due_date(jsonb) from public, anon;
grant execute on function public.update_sale_due_date(jsonb) to authenticated;

commit;
