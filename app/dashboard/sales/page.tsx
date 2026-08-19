import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatEATDateTime, formatKES } from "@/lib/format"
import { SaleActions } from "@/components/sales/sale-actions"
import { Receipt } from "lucide-react"

function dateKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value))
}

function sectionLabel(key: string, today: string, yesterday: string) {
  if (key === today) return "Today"
  if (key === yesterday) return "Yesterday"
  return "Older sales"
}

export default async function SalesPage() {
  const supabase = await createClient()
  const { data: sales } = await supabase.from("sales").select("id, receipt_number, total, profit, payment_method, status, created_at").order("created_at", { ascending: false }).limit(200)
  const list = sales ?? []
  const today = dateKey(new Date().toISOString())
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = dateKey(yesterdayDate.toISOString())
  const sections = new Map<string, typeof list>()
  for (const sale of list) { const key = dateKey(sale.created_at); sections.set(key, [...(sections.get(key) ?? []), sale]) }
  const totalRevenue = list.filter((sale) => sale.status === "completed").reduce((a, s) => a + Number(s.total), 0)

  return <div className="flex flex-col gap-6"><div><h1 className="text-2xl font-bold tracking-tight">Sales</h1><p className="text-sm text-muted-foreground">Transactions grouped by Nairobi time. Voiding preserves the financial record and restores stock.</p></div><Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Sales history</CardTitle><CardDescription>{list.length} records · {formatKES(totalRevenue)} completed revenue</CardDescription></div><span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Receipt className="size-4" /></span></CardHeader><CardContent className="flex flex-col gap-8">{list.length === 0 ? <p className="py-12 text-center text-sm text-muted-foreground">No sales recorded yet.</p> : Array.from(sections.entries()).map(([key, section]) => <section key={key} className="flex flex-col gap-3"><div className="flex items-center justify-between border-b border-border pb-2"><h2 className="font-semibold">{sectionLabel(key, today, yesterday)}</h2><span className="text-xs text-muted-foreground">{section.length} sale{section.length === 1 ? "" : "s"}</span></div><Table><TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Date</TableHead><TableHead>Payment</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right print:hidden">Actions</TableHead></TableRow></TableHeader><TableBody>{section.map((sale) => <TableRow key={sale.id}><TableCell className="font-medium">{sale.receipt_number || "—"}</TableCell><TableCell className="text-muted-foreground">{formatEATDateTime(sale.created_at)}</TableCell><TableCell><Badge variant="secondary" className="capitalize">{sale.payment_method}</Badge></TableCell><TableCell><Badge variant={sale.status === "completed" ? "default" : "destructive"} className="capitalize">{sale.status}</Badge></TableCell><TableCell className="text-right font-semibold">{formatKES(Number(sale.total))}</TableCell><TableCell><SaleActions saleId={sale.id} receiptNumber={sale.receipt_number} total={Number(sale.total)} paymentMethod={sale.payment_method} createdAt={sale.created_at} /></TableCell></TableRow>)}</TableBody></Table></section>)}</CardContent></Card></div>
}
