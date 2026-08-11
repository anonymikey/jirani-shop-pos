import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatKES } from "@/lib/format"

export default async function ReportsPage() {
  const supabase = await createClient()
  const [{ data: sales }, { data: expenses }] = await Promise.all([supabase.from("sales").select("total, profit, payment_method, created_at").eq("status", "completed").order("created_at", { ascending: false }).limit(500), supabase.from("expenses").select("amount").limit(500)])
  const revenue = (sales ?? []).reduce((sum, sale) => sum + Number(sale.total), 0)
  const profit = (sales ?? []).reduce((sum, sale) => sum + Number(sale.profit), 0)
  const costs = (expenses ?? []).reduce((sum, expense) => sum + Number(expense.amount), 0)
  const methods = new Map<string, number>()
  for (const sale of sales ?? []) methods.set(sale.payment_method, (methods.get(sale.payment_method) ?? 0) + Number(sale.total))
  return <div className="flex flex-col gap-6"><div><h1 className="text-2xl font-bold tracking-tight">Reports</h1><p className="text-sm text-muted-foreground">A live summary of sales, profit, payment mix, and costs.</p></div><div className="grid gap-4 sm:grid-cols-3"><Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Revenue</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatKES(revenue)}</p></CardContent></Card><Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Gross profit</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatKES(profit)}</p></CardContent></Card><Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Expenses</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{formatKES(costs)}</p></CardContent></Card></div><Card><CardHeader><CardTitle>Payment mix</CardTitle></CardHeader><CardContent className="flex flex-col gap-2">{[...methods.entries()].map(([method, amount]) => <div key={method} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"><span className="capitalize">{method.replace("_", " ")}</span><span className="font-semibold">{formatKES(amount)}</span></div>)}{methods.size === 0 && <p className="text-sm text-muted-foreground">No completed sales yet.</p>}</CardContent></Card></div>
}
