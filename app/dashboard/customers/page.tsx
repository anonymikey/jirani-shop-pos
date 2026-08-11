import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatKES } from "@/lib/format"

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: customers } = await supabase.from("customers").select("id, name, phone, email, credit_limit, balance, status").order("name")
  return <div className="flex flex-col gap-6"><div><h1 className="text-2xl font-bold tracking-tight">Customers</h1><p className="text-sm text-muted-foreground">Review customer accounts, credit balances, and contact details.</p></div><Card><CardHeader><CardTitle>Customer accounts</CardTitle></CardHeader><CardContent className="p-0"><div className="divide-y divide-border">{(customers ?? []).length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No customers have been added yet.</p>}{(customers ?? []).map((customer) => <div key={customer.id} className="flex items-center justify-between gap-4 px-4 py-3"><div><p className="text-sm font-medium">{customer.name}</p><p className="text-xs text-muted-foreground">{customer.phone || customer.email || "No contact details"}</p></div><div className="flex items-center gap-3"><Badge variant={Number(customer.balance) > 0 ? "secondary" : "outline"}>{formatKES(Number(customer.balance))} due</Badge><span className="hidden text-xs text-muted-foreground sm:inline">Limit {formatKES(Number(customer.credit_limit))}</span></div></div>)}</div></CardContent></Card></div>
}
