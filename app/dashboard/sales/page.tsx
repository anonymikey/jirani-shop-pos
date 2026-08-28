import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatKES } from "@/lib/format"
import { SalesHistory } from "@/components/sales/sales-history"
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
  const { data: sales } = await supabase
    .from("sales")
    .select(`
      id, receipt_number, total, profit, payment_method, status, created_at,
      subtotal, discount, tax, amount_paid, due_at, customer_id,
      customers ( name ),
      sale_items ( product_name, quantity, unit_price, line_total )
    `)
    .order("created_at", { ascending: false })
    .limit(200)

  const list = (sales ?? []) as Array<{
    id: string
    receipt_number: string | null
    total: number
    profit: number
    payment_method: string
    status: string
    created_at: string
    subtotal: number | null
    discount: number | null
    tax: number | null
    amount_paid: number | null
    due_at: string | null
    customer_id: string | null
    customers: { name: string } | null
    sale_items: Array<{ product_name: string; quantity: number; unit_price: number; line_total: number }>
  }>

  const today = dateKey(new Date().toISOString())
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = dateKey(yesterdayDate.toISOString())

  const sections = new Map<string, typeof list>()
  for (const sale of list) {
    const key = dateKey(sale.created_at)
    sections.set(key, [...(sections.get(key) ?? []), sale])
  }

  const totalRevenue = list
    .filter((sale) => sale.status === "completed")
    .reduce((a, s) => a + Number(s.total), 0)

  const labeledSections: [string, typeof list][] = Array.from(sections.entries()).map(
    ([key, section]) => [sectionLabel(key, today, yesterday), section]
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales</h1>
        <p className="text-sm text-muted-foreground">
          Transactions grouped by Nairobi time. Voiding preserves the financial record and restores stock.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sales history</CardTitle>
            <CardDescription>
              {list.length} records · {formatKES(totalRevenue)} completed revenue
            </CardDescription>
          </div>
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Receipt className="size-4" />
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-8">
          {list.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No sales recorded yet.</p>
          ) : (
            <SalesHistory sections={labeledSections} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
