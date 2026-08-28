import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { formatKES } from "@/lib/format"
import { SalesHistory } from "@/components/sales/sales-history"
import { Receipt } from "lucide-react"

type SaleItem = { product_name: string; quantity: number; unit_price: number; line_total: number }
type SaleWithDetails = {
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
  sale_items: SaleItem[]
}

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

  // 1. Fetch sales with the original working query
  const { data: sales } = await supabase
    .from("sales")
    .select("id, receipt_number, total, profit, payment_method, status, created_at, subtotal, discount, tax, amount_paid, due_at, customer_id")
    .order("created_at", { ascending: false })
    .limit(200)

  const salesList = sales ?? []

  if (salesList.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales</h1>
          <p className="text-sm text-muted-foreground">Transactions grouped by Nairobi time. Voiding preserves the financial record and restores stock.</p>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle>Sales history</CardTitle><CardDescription>0 records · {formatKES(0)} completed revenue</CardDescription></div>
            <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Receipt className="size-4" /></span>
          </CardHeader>
          <CardContent><p className="py-12 text-center text-sm text-muted-foreground">No sales recorded yet.</p></CardContent>
        </Card>
      </div>
    )
  }

  // 2. Fetch sale_items for all returned sales in one query
  const saleIds = salesList.map((s) => s.id)
  const { data: allItems } = await supabase
    .from("sale_items")
    .select("sale_id, product_name, quantity, unit_price, line_total")
    .in("sale_id", saleIds)

  // 3. Fetch customers for non-null customer_ids in one query
  const customerIds = [...new Set(salesList.map((s) => s.customer_id).filter(Boolean))] as string[]
  const { data: customerRows } = customerIds.length > 0
    ? await supabase.from("customers").select("id, name").in("id", customerIds)
    : { data: [] as Array<{ id: string; name: string }> }
  const customerMap = new Map((customerRows ?? []).map((c) => [c.id, c.name]))

  // 4. Group items by sale_id
  const itemsBySale = new Map<string, SaleItem[]>()
  for (const item of allItems ?? []) {
    const existing = itemsBySale.get(item.sale_id) ?? []
    existing.push({
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      line_total: Number(item.line_total),
    })
    itemsBySale.set(item.sale_id, existing)
  }

  // 5. Assemble the full list
  const list: SaleWithDetails[] = salesList.map((sale) => ({
    ...sale,
    customers: sale.customer_id ? { name: customerMap.get(sale.customer_id) ?? null } : null,
    sale_items: itemsBySale.get(sale.id) ?? [],
  }))

  const today = dateKey(new Date().toISOString())
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = dateKey(yesterdayDate.toISOString())

  const sections = new Map<string, SaleWithDetails[]>()
  for (const sale of list) {
    const key = dateKey(sale.created_at)
    sections.set(key, [...(sections.get(key) ?? []), sale])
  }

  const totalRevenue = list
    .filter((sale) => sale.status === "completed")
    .reduce((a, s) => a + Number(s.total), 0)

  const labeledSections: [string, SaleWithDetails[]][] = Array.from(sections.entries()).map(
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
          <SalesHistory sections={labeledSections} />
        </CardContent>
      </Card>
    </div>
  )
}
