import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { TopProductsChart } from "@/components/dashboard/top-products-chart"
import { formatKES, formatNumber } from "@/lib/format"
import {
  TrendingUp,
  Receipt,
  Boxes,
  AlertTriangle,
  ScanLine,
  ArrowUpRight,
  Banknote,
  Smartphone,
  CreditCard,
  NotebookPen,
  HandCoins,
  Wallet,
  FileText,
  BarChart3,
  Users,
} from "lucide-react"
import Link from "next/link"

function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0)
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const start7 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).toISOString()

  const [
    { data: sales7 },
    { data: paymentsToday },
    { data: expensesToday },
    { data: products },
    { data: creditSales },
    { data: payments },
    { data: recent },
    { data: saleItems },
  ] = await Promise.all([
    supabase
      .from("sales")
      .select("total, profit, payment_method, created_at")
      .eq("status", "completed")
      .gte("created_at", start7)
      .order("created_at", { ascending: true }),
    supabase.from("payments").select("amount").gte("created_at", startToday),
    supabase.from("expenses").select("amount").gte("created_at", startToday),
    supabase.from("products").select("id, name, quantity, reorder_level, status"),
    supabase.from("sales").select("total").eq("payment_method", "credit").eq("status", "completed"),
    supabase.from("payments").select("amount"),
    supabase
      .from("sales")
      .select("id, receipt_number, total, payment_method, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("sale_items").select("product_name, quantity").gte("created_at", start7),
  ])

  const allSales = sales7 ?? []
  const todaySales = allSales.filter((s) => s.created_at >= startToday)

  // --- Today's business ---
  const salesCountToday = todaySales.length
  const salesToday = sum(todaySales.map((s) => Number(s.total)))
  const cashToday = sum(todaySales.filter((s) => s.payment_method === "cash").map((s) => Number(s.total)))
  const mpesaToday = sum(todaySales.filter((s) => s.payment_method === "mobile_money").map((s) => Number(s.total)))
  const cardToday = sum(todaySales.filter((s) => s.payment_method === "card").map((s) => Number(s.total)))
  const creditToday = sum(todaySales.filter((s) => s.payment_method === "credit").map((s) => Number(s.total)))
  const collectedToday = cashToday + mpesaToday + cardToday
  const debtPaymentsToday = sum((paymentsToday ?? []).map((p) => Number(p.amount)))
  const expensesTodayTotal = sum((expensesToday ?? []).map((e) => Number(e.amount)))
  const grossProfitToday = sum(todaySales.map((s) => Number(s.profit)))
  const netProfitToday = grossProfitToday - expensesTodayTotal

  // --- Stock ---
  const productList = products ?? []
  const lowStock = productList.filter((p) => p.quantity <= p.reorder_level)

  // --- Outstanding debtor balance (all-time) ---
  const creditSold = sum((creditSales ?? []).map((s) => Number(s.total)))
  const debtPaid = sum((payments ?? []).map((p) => Number(p.amount)))
  const outstandingDebt = Math.max(0, creditSold - debtPaid)

  // --- 7-day series ---
  const days: { day: string; revenue: number; profit: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const label = d.toLocaleDateString("en-KE", { weekday: "short" })
    const dayStart = d.toISOString()
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString()
    const within = allSales.filter((s) => s.created_at >= dayStart && s.created_at < dayEnd)
    days.push({
      day: label,
      revenue: sum(within.map((s) => Number(s.total))),
      profit: sum(within.map((s) => Number(s.profit))),
    })
  }

  // --- Top products ---
  const counts = new Map<string, number>()
  for (const item of saleItems ?? []) {
    counts.set(item.product_name, (counts.get(item.product_name) ?? 0) + Number(item.quantity))
  }
  const topProducts = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const kpis = [
    { label: "Today's sales", value: formatKES(salesToday), icon: TrendingUp, hint: `${salesCountToday} sale${salesCountToday === 1 ? "" : "s"} today` },
    { label: "Collected today", value: formatKES(collectedToday), icon: HandCoins, hint: "Cash + M-Pesa + Card" },
    { label: "Gross profit today", value: formatKES(grossProfitToday), icon: ArrowUpRight, hint: "After cost of goods" },
    { label: "Net profit today", value: formatKES(netProfitToday), icon: Wallet, hint: `After ${formatKES(expensesTodayTotal)} expenses` },
  ]

  const paymentSplit = [
    { label: "Cash", value: cashToday, icon: Banknote },
    { label: "M-Pesa", value: mpesaToday, icon: Smartphone },
    { label: "Card", value: cardToday, icon: CreditCard },
    { label: "Credit", value: creditToday, icon: NotebookPen },
  ]

  const stockRow = [
    { label: "Prior-debt payments today", value: formatKES(debtPaymentsToday), icon: HandCoins, hint: "Money owed from earlier collected now" },
    { label: "Expenses today", value: formatKES(expensesTodayTotal), icon: Wallet, hint: "Operating costs" },
    { label: "Products", value: formatNumber(productList.length), icon: Boxes, hint: `${productList.filter((p) => p.status === "active").length} active` },
    { label: "Low stock", value: formatNumber(lowStock.length), icon: AlertTriangle, hint: "Need restocking" },
  ]

  const quickLinks = [
    { label: "Daily Report", href: "/dashboard/reports?period=today", icon: FileText },
    { label: "All Reports", href: "/dashboard/reports", icon: BarChart3 },
    { label: "Debtors", href: "/dashboard/customers", icon: Users },
    { label: "POS", href: "/dashboard/pos", icon: ScanLine },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Today&apos;s business from real shop records.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/pos">
            <ScanLine className="size-4" /> New sale
          </Link>
        </Button>
      </div>

      {/* Today's Business quick links */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Today&apos;s Business</CardTitle>
          <CardDescription>Jump straight into the daily numbers.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {quickLinks.map((link) => (
            <Button key={link.label} asChild variant="outline" className="justify-start">
              <Link href={link.href}>
                <link.icon className="size-4" /> {link.label}
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <k.icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{k.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{k.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {paymentSplit.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label} sales today</CardTitle>
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <k.icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatKES(k.value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stockRow.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
              <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <k.icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{k.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{k.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base">Outstanding debtor balance</CardTitle>
            <CardDescription>Credit given out minus payments received, across all customers</CardDescription>
          </div>
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <NotebookPen className="size-4" />
          </span>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-3xl font-bold">{formatKES(outstandingDebt)}</div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/customers">View debtors</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <RevenueChart data={days} />
        </div>
        <div className="lg:col-span-3">
          <TopProductsChart data={topProducts} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent sales</CardTitle>
            <CardDescription>Latest transactions</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {(recent ?? []).length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No sales yet. Make your first sale.</p>
            )}
            {(recent ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Receipt className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{s.receipt_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="capitalize">
                    {s.payment_method.replace("_", " ")}
                  </Badge>
                  <span className="text-sm font-semibold">{formatKES(Number(s.total))}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Low stock alerts</CardTitle>
            <CardDescription>Items at or below reorder level</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {lowStock.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Everything is well stocked.</p>
            )}
            {lowStock.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/50">
                <p className="text-sm font-medium">{p.name}</p>
                <Badge variant={p.quantity === 0 ? "destructive" : "secondary"}>
                  {p.quantity === 0 ? "Out of stock" : `${p.quantity} left`}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
