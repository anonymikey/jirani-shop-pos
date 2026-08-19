import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatEATDate, formatKES } from "@/lib/format"
import { PaymentForm } from "@/components/customers/payment-form"
import { CustomerForm } from "@/components/customers/customer-form"
import { ChevronDown, Phone } from "lucide-react"

export default async function CustomersPage() {
  const supabase = await createClient()
  const [{ data: customers }, { data: sales }, { data: payments }] = await Promise.all([
    supabase.from("customers").select("id, name, phone, email, credit_limit, balance").order("name"),
    supabase.from("sales").select("id, customer_id, total, due_at, created_at").eq("status", "completed"),
    supabase.from("payments").select("customer_id, sale_id, amount, created_at").not("customer_id", "is", null),
  ])

  const salePaid = new Map<string, number>()
  const repayments = new Map<string, number>()
  for (const payment of payments ?? []) {
    if (!payment.sale_id) {
      repayments.set(payment.customer_id, (repayments.get(payment.customer_id) ?? 0) + Number(payment.amount))
    } else {
      salePaid.set(payment.sale_id, (salePaid.get(payment.sale_id) ?? 0) + Number(payment.amount))
    }
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">Manage customer information and customer accounts.</p>
      </div>
      <CustomerForm />
      <Card>
        <CardHeader>
          <CardTitle>Customer accounts</CardTitle>
          <CardDescription>Customer records stay here. Open an account to review its history or record a debt repayment.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {records.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No customers yet. Add your first customer when you need to keep customer information.</p>
          ) : (
            <div className="divide-y divide-border">
              {records.map((customer) => (
                <details key={customer.id} className="group px-4 py-3">
                  <summary className="flex cursor-pointer list-none flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Phone className="size-4" /></span>
                      <div><p className="text-sm font-medium">{customer.name}</p><p className="text-xs text-muted-foreground">{customer.phone || customer.email || "No contact details"}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      {customer.balance > 0 && <Badge variant={customer.overdue ? "destructive" : "secondary"}>{customer.overdue ? "Overdue" : `Owes ${formatKES(customer.balance)}`}</Badge>}
                      {customer.balance === 0 && <Badge variant="outline">Clear</Badge>}
                      <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                    </div>
                  </summary>
                  <div className="mt-3 flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-3">
                    <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
                      <span>Phone: <strong className="text-foreground">{customer.phone || "Not provided"}</strong></span>
                      <span>Credit limit: <strong className="text-foreground">{formatKES(Number(customer.credit_limit))}</strong></span>
                      <span>Account balance: <strong className="text-foreground">{formatKES(customer.balance)}</strong></span>
                    </div>
                    {customer.dueAt && customer.balance > 0 && <p className="text-xs text-muted-foreground">{customer.overdue ? "Overdue since" : "Due by"} {formatEATDate(customer.dueAt, { dateStyle: "medium" })}</p>}
                    {customer.balance > 0 && <PaymentForm customerId={customer.id} balance={customer.balance} customerName={customer.name} phone={customer.phone} />}
                    <p className="text-xs text-muted-foreground">Customer history remains available from this account, while active balances are managed on the Debtors page.</p>
                  </div>
                </details>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
