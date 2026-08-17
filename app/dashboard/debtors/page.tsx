import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatEATDate, formatKES } from "@/lib/format"
import { PaymentForm } from "@/components/customers/payment-form"
import { ChevronDown, CircleDollarSign } from "lucide-react"

export default async function DebtorsPage() {
  const supabase = await createClient()
  const [{ data: customers }, { data: sales }, { data: payments }] = await Promise.all([
    supabase.from("customers").select("id, name, phone, email, credit_limit, balance").order("name"),
    supabase.from("sales").select("id, customer_id, receipt_number, total, due_at, created_at").eq("status", "completed").not("customer_id", "is", null).order("created_at", { ascending: false }),
    supabase.from("payments").select("id, customer_id, sale_id, amount, method, reference, created_at").not("customer_id", "is", null),
  ])

  const salePaid = new Map<string, number>()
  const repayments = new Map<string, number>()
  for (const payment of payments ?? []) {
    if (payment.sale_id) salePaid.set(payment.sale_id, (salePaid.get(payment.sale_id) ?? 0) + Number(payment.amount))
    else if (payment.customer_id) repayments.set(payment.customer_id, (repayments.get(payment.customer_id) ?? 0) + Number(payment.amount))
  }
  const debtByCustomer = new Map<string, { balance: number; dueAt: string | null }>()
  for (const sale of sales ?? []) {
    if (!sale.customer_id) continue
    const current = debtByCustomer.get(sale.customer_id) ?? { balance: 0, dueAt: null }
    current.balance += Math.max(0, Number(sale.total) - (salePaid.get(sale.id) ?? 0))
    if (sale.due_at && (!current.dueAt || sale.due_at < current.dueAt)) current.dueAt = sale.due_at
    debtByCustomer.set(sale.customer_id, current)
  }
  const records = (customers ?? []).map((customer) => {
    const debt = debtByCustomer.get(customer.id)
    const balance = Math.max(0, (debt?.balance ?? Number(customer.balance) ?? 0) - (repayments.get(customer.id) ?? 0))
    const overdue = Boolean(debt?.dueAt && new Date(debt.dueAt) < new Date() && balance > 0)
    return { ...customer, balance, dueAt: debt?.dueAt ?? null, overdue }
  })
  const active = records.filter((customer) => customer.balance > 0)
  const cleared = records.filter((customer) => customer.balance === 0 && debtByCustomer.has(customer.id))
  const totalDue = active.reduce((sum, customer) => sum + customer.balance, 0)
  const overdue = active.filter((customer) => customer.overdue).length
  const saleByCustomer = new Map<string, typeof sales>()
  for (const sale of sales ?? []) {
    if (!sale.customer_id) continue
    saleByCustomer.set(sale.customer_id, [...(saleByCustomer.get(sale.customer_id) ?? []), sale])
  }
  const paymentByCustomer = new Map<string, typeof payments>()
  for (const payment of payments ?? []) {
    if (!payment.customer_id) continue
    paymentByCustomer.set(payment.customer_id, [...(paymentByCustomer.get(payment.customer_id) ?? []), payment])
  }

  return (
    <div className="flex flex-col gap-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Debtors</h1><p className="text-sm text-muted-foreground">Track customers who currently owe JIRANI money.</p></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatKES(totalDue)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Active debtors</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{active.length}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Overdue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{overdue}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Active debtors</CardTitle><CardDescription>Customers with an outstanding balance appear here automatically after a credit sale.</CardDescription></CardHeader>
        <CardContent className="p-0">
          {active.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No active debtors. Customers who owe JIRANI will appear here automatically after a credit sale.</p> : (
            <div className="divide-y divide-border">
              {active.map((customer) => (
                <details key={customer.id} className="group px-4 py-4">
                  <summary className="flex cursor-pointer list-none flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center sm:gap-6">
                    <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"><CircleDollarSign className="size-4" /></span><div><p className="font-medium">{customer.name}</p><p className="text-xs text-muted-foreground">{customer.phone || "No phone number"}</p></div></div>
                    <div><p className="text-xs text-muted-foreground">Current debt</p><p className="font-semibold">{formatKES(customer.balance)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Due date</p><p className="text-sm">{customer.dueAt ? formatEATDate(customer.dueAt, { dateStyle: "medium" }) : "Not set"}</p></div>
                    <div className="flex items-center justify-between gap-3"><Badge variant={customer.overdue ? "destructive" : "secondary"}>{customer.overdue ? "Overdue" : "Due soon"}</Badge><ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" /></div>
                  </summary>
                  <div className="mt-4 flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4">
                    <div><p className="text-sm font-medium">Debt repayment</p><p className="text-xs text-muted-foreground">Record money received against this customer&apos;s outstanding account.</p></div>
                    <PaymentForm customerId={customer.id} balance={customer.balance} />
                    <div className="grid gap-4 lg:grid-cols-2"><div><p className="mb-2 text-xs font-medium text-muted-foreground">Credit history</p>{(saleByCustomer.get(customer.id) ?? []).slice(0, 10).map((sale) => <div key={sale.id} className="flex items-center justify-between border-b border-border py-2 text-xs"><span>{sale.receipt_number || "Credit sale"}<br /><span className="text-muted-foreground">{formatEATDate(sale.created_at, { dateStyle: "medium" })}</span></span><span className="font-medium">{formatKES(Number(sale.total) - (salePaid.get(sale.id) ?? 0))} due</span></div>)}</div><div><p className="mb-2 text-xs font-medium text-muted-foreground">Payments</p>{(paymentByCustomer.get(customer.id) ?? []).slice(0, 10).map((payment) => <div key={payment.id} className="flex items-center justify-between border-b border-border py-2 text-xs"><span className="capitalize">{payment.method.replace("_", " ")}<br /><span className="text-muted-foreground">{formatEATDate(payment.created_at, { dateStyle: "medium" })}</span></span><span className="font-medium">{formatKES(Number(payment.amount))}</span></div>)}</div></div>
                  </div>
                </details>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <details className="rounded-xl border border-border bg-card">
        <summary className="cursor-pointer list-none px-4 py-4 text-sm font-medium">Cleared debtor history <span className="ml-2 text-xs font-normal text-muted-foreground">{cleared.length} accounts</span></summary>
        <div className="border-t border-border px-4 py-3">{cleared.length === 0 ? <p className="text-sm text-muted-foreground">No cleared debtor history yet.</p> : <div className="flex flex-col gap-2">{cleared.map((customer) => <div key={customer.id} className="flex items-center justify-between rounded-md bg-muted/20 px-3 py-2 text-sm"><span>{customer.name}</span><Badge variant="outline">Cleared</Badge></div>)}</div>}</div>
      </details>
    </div>
  )
}
