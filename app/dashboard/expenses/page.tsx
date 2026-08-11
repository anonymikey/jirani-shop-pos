import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatKES } from "@/lib/format"

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: expenses } = await supabase.from("expenses").select("id, category, description, amount, expense_date").order("expense_date", { ascending: false }).limit(100)
  const total = (expenses ?? []).reduce((sum, expense) => sum + Number(expense.amount), 0)
  return <div className="flex flex-col gap-6"><div><h1 className="text-2xl font-bold tracking-tight">Expenses</h1><p className="text-sm text-muted-foreground">Track operating costs against shop performance.</p></div><Card><CardHeader><CardTitle className="flex items-center justify-between"><span>Recent expenses</span><span className="text-base font-semibold">{formatKES(total)}</span></CardTitle></CardHeader><CardContent className="p-0"><div className="divide-y divide-border">{(expenses ?? []).length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No expenses recorded yet.</p>}{(expenses ?? []).map((expense) => <div key={expense.id} className="flex items-center justify-between gap-4 px-4 py-3"><div><p className="text-sm font-medium">{expense.category}</p><p className="text-xs text-muted-foreground">{expense.description || "No description"} · {expense.expense_date}</p></div><span className="text-sm font-semibold">{formatKES(Number(expense.amount))}</span></div>)}</div></CardContent></Card></div>
}
