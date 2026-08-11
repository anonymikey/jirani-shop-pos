import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatKES } from "@/lib/format"
import { PaymentForm } from "@/components/customers/payment-form"

export default async function CustomersPage() {
  const supabase = await createClient()
  const [{ data: customers }, { data: creditSales }, { data: payments }] = await Promise.all([
    supabase.from("customers").select("id, name, phone, email, credit_limit, status").order("name"),
    supabase.from("sales").select("customer_id, total, due_at, created_at").eq("payment_method", "credit").eq("status", "completed"),
    supabase.from("payments").select("customer_id, amount, created_at").not("customer_id", "is", null),
  ])
  const paidByCustomer = new Map<string, number>()
  for (const payment of payments ?? []) paidByCustomer.set(payment.customer_id, (paidByCustomer.get(payment.customer_id) ?? 0) + Number(payment.amount))
  const debtByCustomer = new Map<string, { balance: number; dueAt: string | null }>()
  for (const sale of creditSales ?? []) {
    if (!sale.customer_id) continue
    const current = debtByCustomer.get(sale.customer_id) ?? { balance: 0, dueAt: null }
    current.balance += Number(sale.total)
    if (sale.due_at && (!current.dueAt || sale.due_at < current.dueAt)) current.dueAt = sale.due_at
    debtByCustomer.set(sale.customer_id, current)
  }
  const debtors = (customers ?? []).map((customer) => {
    const debt = debtByCustomer.get(customer.id)
    const balance = Math.max(0, (debt?.balance ?? 0) - (paidByCustomer.get(customer.id) ?? 0))
    const overdue = Boolean(debt?.dueAt && new Date(debt.dueAt) < new Date() && balance > 0)
    return { ...customer, balance, dueAt: debt?.dueAt ?? null, overdue }
  })
  const totalDue = debtors.reduce((sum, customer) => sum + customer.balance, 0)
  const overdue = debtors.filter((customer) => customer.overdue)
  return <div className="flex flex-col gap-6"><div><h1 className="text-2xl font-bold tracking-tight">Customers & debtors</h1><p className="text-sm text-muted-foreground">Balances are calculated from credit sales minus recorded payments.</p></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatKES(totalDue)}</p></CardContent></Card><Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Debtors</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{debtors.filter((customer) => customer.balance > 0).length}</p></CardContent></Card><Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Overdue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-destructive">{overdue.length}</p></CardContent></Card></div><Card><CardHeader><CardTitle>Customer accounts</CardTitle></CardHeader><CardContent className="p-0"><div className="divide-y divide-border">{debtors.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No customers have been added yet.</p>}{debtors.map((customer) => <div key={customer.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{customer.name}</p><p className="text-xs text-muted-foreground">{customer.phone || customer.email || "No contact details"}</p></div><div className="flex flex-wrap items-center gap-3"><Badge variant={customer.overdue ? "destructive" : customer.balance > 0 ? "secondary" : "outline"}>{customer.overdue ? "Overdue" : customer.balance > 0 ? "Due" : "Clear"}</Badge><span className="text-sm font-semibold">{formatKES(customer.balance)}</span><span className="hidden text-xs text-muted-foreground sm:inline">Limit {formatKES(Number(customer.credit_limit))}</span>{customer.balance > 0 && <PaymentForm customerId={customer.id} />}</div></div>)}</div></CardContent></Card></div>
}
