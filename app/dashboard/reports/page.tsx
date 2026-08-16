import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatEATDate, formatKES } from "@/lib/format"
import { getPeriodRange, isValidPeriod, PERIOD_LABELS, type PeriodKey } from "@/lib/periods"
import { PeriodPicker } from "@/components/reports/period-picker"
import { Banknote, HandCoins, Scale, Smartphone, CreditCard, NotebookPen, Receipt } from "lucide-react"

function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0)
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>
}) {
  const { period: rawPeriod, from, to } = await searchParams
  const period: PeriodKey = isValidPeriod(rawPeriod) ? rawPeriod : "today"
  const { start, end } = getPeriodRange(period, from, to)
  const startISO = start.toISOString()
  const endISO = end.toISOString()

  const supabase = await createClient()
  const [
    { data: sales },
    { data: payments },
    { data: expenses },
    { data: saleItems },
    { data: creditSales },
    { data: allPayments },
  ] = await Promise.all([
    supabase
      .from("sales")
      .select("id, total, profit, payment_method")
      .eq("status", "completed")
      .gte("created_at", startISO)
      .lt("created_at", endISO),
    supabase.from("payments").select("amount, sale_id, payment_type").gte("created_at", startISO).lt("created_at", endISO),
    supabase.from("expenses").select("amount").gte("created_at", startISO).lt("created_at", endISO),
    supabase.from("sale_items").select("cost_price, quantity").gte("created_at", startISO).lt("created_at", endISO),
    supabase.from("sales").select("id, total").eq("status", "completed"),
    supabase.from("payments").select("amount, sale_id, payment_type"),
  ])

  // --- SALES ---
  const saleList = sales ?? []
  const totalSales = sum(saleList.map((s) => Number(s.total)))
  const byMethod = new Map<string, number>()
  for (const sale of saleList) byMethod.set(sale.payment_method, (byMethod.get(sale.payment_method) ?? 0) + Number(sale.total))
  const cashSales = byMethod.get("cash") ?? 0
  const mpesaSales = byMethod.get("mobile_money") ?? 0
  const cardSales = byMethod.get("card") ?? 0
  const creditSalesInPeriod = byMethod.get("credit") ?? 0

  // --- COLLECTIONS ---
  const collectedFromSales = sum((payments ?? []).filter((p) => p.sale_id && p.payment_type !== "debt").map((p) => Number(p.amount)))
  const priorDebtPayments = sum((payments ?? []).filter((p) => p.payment_type === "debt" || !p.sale_id).map((p) => Number(p.amount)))
  const totalCollected = collectedFromSales + priorDebtPayments

  // --- ACCOUNTING ---
  const cogs = sum((saleItems ?? []).map((item) => Number(item.cost_price) * Number(item.quantity)))
  const grossProfit = sum(saleList.map((s) => Number(s.profit)))
  const expensesTotal = sum((expenses ?? []).map((e) => Number(e.amount)))
  const netProfit = grossProfit - expensesTotal

  const salePaidAll = new Map<string, number>()
  for (const payment of allPayments ?? []) {
    if (payment.sale_id && payment.payment_type !== "debt") salePaidAll.set(payment.sale_id, (salePaidAll.get(payment.sale_id) ?? 0) + Number(payment.amount))
  }
  const outstandingDebt = Math.max(0, sum((creditSales ?? []).map((sale) => Math.max(0, Number(sale.total) - (salePaidAll.get(sale.id) ?? 0)))) - sum((allPayments ?? []).filter((p) => p.payment_type === "debt" || !p.sale_id).map((p) => Number(p.amount))))

  const dateLabel =
    period === "custom"
      ? `${formatEATDate(start, { dateStyle: "medium" })} – ${formatEATDate(end, { dateStyle: "medium" })}`
      : formatEATDate(start, { weekday: "long", dateStyle: "long" })

  const salesRows = [
    { label: "Total sales", value: totalSales, icon: Receipt, bold: true },
    { label: "Cash sales", value: cashSales, icon: Banknote },
    { label: "M-Pesa sales", value: mpesaSales, icon: Smartphone },
    { label: "Card sales", value: cardSales, icon: CreditCard },
    { label: "Credit sales", value: creditSalesInPeriod, icon: NotebookPen },
  ]

  const collectionRows = [
    { label: "Collected from sales", value: collectedFromSales, icon: HandCoins, hint: "Cash + M-Pesa + Card" },
    { label: "Prior-debt payments", value: priorDebtPayments, icon: HandCoins, hint: "Repayments of earlier credit sales" },
    { label: "Total collected", value: totalCollected, icon: HandCoins, bold: true },
  ]

  const accountingRows = [
    { label: "Cost of goods sold (COGS)", value: cogs, icon: Scale },
    { label: "Gross profit", value: grossProfit, icon: Scale },
    { label: "Expenses", value: expensesTotal, icon: Scale },
    { label: "Net profit", value: netProfit, icon: Scale, bold: true },
    { label: "Outstanding credit/debt", value: outstandingDebt, icon: NotebookPen, hint: "All-time unpaid balance" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            {PERIOD_LABELS[period]} · {dateLabel}
          </p>
        </div>
        <PeriodPicker period={period} from={from} to={to} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Sales</CardTitle>
            <CardDescription>Goods sold in this period — credit sales count as sales here.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {salesRows.map((row) => (
              <div key={row.label} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${row.bold ? "bg-muted/40 font-semibold" : ""}`}>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <row.icon className="size-4" /> {row.label}
                </span>
                <span className={row.bold ? "text-base" : "font-medium"}>{formatKES(row.value)}</span>
              </div>
            ))}
            {saleList.length === 0 && <p className="pt-2 text-sm text-muted-foreground">No sales in this period.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collections</CardTitle>
            <CardDescription>Money actually received — a credit sale is not money collected.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {collectionRows.map((row) => (
              <div key={row.label} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${row.bold ? "bg-muted/40 font-semibold" : ""}`}>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <row.icon className="size-4" /> {row.label}
                </span>
                <span className="flex flex-col items-end">
                  <span className={row.bold ? "text-base" : "font-medium"}>{formatKES(row.value)}</span>
                  {row.hint && <span className="text-xs text-muted-foreground">{row.hint}</span>}
                </span>
              </div>
            ))}
            {(payments ?? []).length === 0 && collectedFromSales === 0 && (
              <p className="pt-2 text-sm text-muted-foreground">Nothing collected in this period.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accounting</CardTitle>
            <CardDescription>Profitability and debt position for the period.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {accountingRows.map((row) => (
              <div key={row.label} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${row.bold ? "bg-muted/40 font-semibold" : ""}`}>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <row.icon className="size-4" /> {row.label}
                </span>
                <span className="flex flex-col items-end">
                  <span className={row.bold ? "text-base" : "font-medium"}>{formatKES(row.value)}</span>
                  {row.hint && <span className="text-xs text-muted-foreground">{row.hint}</span>}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
