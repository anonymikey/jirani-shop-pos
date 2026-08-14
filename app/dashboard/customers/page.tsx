import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatKES } from "@/lib/format"
import { PaymentForm } from "@/components/customers/payment-form"
import { ChevronDown, Phone } from "lucide-react"

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
  const activeDebtors = debtors.filter((customer) => customer.balance > 0)
  const overdue = debtors.filter((customer) => customer.overdue)

  // Per-customer history (credit sales + payments), newest first.
  const withHistory = await Promise.all(
    debtors.map(async (debtor) => {
      const [{ data: salesHistory }, { data: paymentHistory }] = await Promise.all([
        supabase
          .from("sales")
          .select("id, receipt_number, total, due_at, created_at")
          .eq("customer_id", debtor.id)
          .eq("payment_method", "credit")
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("payments")
          .select("id, amount, method, reference, created_at")
          .eq("customer_id", debtor.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ])
      return { ...debtor, salesHistory: salesHistory ?? [], paymentHistory: paymentHistory ?? [] }
    }),
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers &amp; debtors</h1>
        <p className="text-sm text-muted-foreground">Balances are calculated from credit sales minus recorded payments.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatKES(totalDue)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Debtors</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{activeDebtors.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Overdue</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">{overdue.length}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer accounts</CardTitle>
          <CardDescription>Open a customer to see their credit sales and payment history.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {withHistory.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">No customers have been added yet.</p>
            )}
            {withHistory.map((customer) => (
              <details key={customer.id} className="group px-4 py-3">
                <summary className="flex cursor-pointer list-none flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <Phone className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.phone || customer.email || "No contact details"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={customer.overdue ? "destructive" : customer.balance > 0 ? "secondary" : "outline"}>
                      {customer.overdue ? "Overdue" : customer.balance > 0 ? "Due" : "Clear"}
                    </Badge>
                    <span className="text-sm font-semibold">{formatKES(customer.balance)}</span>
                    <span className="hidden text-xs text-muted-foreground sm:inline">Limit {formatKES(Number(customer.credit_limit))}</span>
                    <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </div>
                </summary>

                <div className="mt-3 flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-3">
                  {customer.dueAt && customer.balance > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {customer.overdue ? "Overdue since" : "Due by"}{" "}
                      {new Date(customer.dueAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      {" · "}Remaining balance{" "}
                      <span className="font-semibold text-foreground">{formatKES(customer.balance)}</span>
                      {Number(customer.credit_limit) > 0 && (
                        <>
                          {" · "}
                          {Number(customer.credit_limit) - customer.balance >= 0 ? "Room left" : "Over limit"}{" "}
                          <span className="font-semibold text-foreground">{formatKES(Math.abs(Number(customer.credit_limit) - customer.balance))}</span>
                        </>
                      )}
                    </p>
                  )}

                  {customer.balance > 0 && <PaymentForm customerId={customer.id} balance={customer.balance} />}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Credit sales history</p>
                      {customer.salesHistory.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No credit sales.</p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {customer.salesHistory.map((sale) => (
                            <div key={sale.id} className="flex items-center justify-between rounded-md bg-card px-2 py-1.5 text-xs">
                              <span className="truncate text-muted-foreground">{sale.receipt_number}</span>
                              <span className="font-medium">{formatKES(Number(sale.total))}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">Payment history</p>
                      {customer.paymentHistory.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No payments yet.</p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {customer.paymentHistory.map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between rounded-md bg-card px-2 py-1.5 text-xs">
                              <span className="capitalize text-muted-foreground">{payment.method.replace("_", " ")}{payment.reference ? ` · ${payment.reference}` : ""}</span>
                              <span className="font-medium">{formatKES(Number(payment.amount))}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
