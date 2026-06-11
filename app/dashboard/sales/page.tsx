import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatKES } from "@/lib/format"
import { Receipt } from "lucide-react"

export default async function SalesPage() {
  const supabase = await createClient()
  const { data: sales } = await supabase
    .from("sales")
    .select("id, receipt_number, total, profit, payment_method, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100)

  const list = sales ?? []
  const totalRevenue = list.reduce((a, s) => a + Number(s.total), 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales</h1>
        <p className="text-sm text-muted-foreground">Transaction history</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent transactions</CardTitle>
            <CardDescription>{list.length} sales · {formatKES(totalRevenue)} total</CardDescription>
          </div>
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Receipt className="size-4" />
          </span>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No sales recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.receipt_number}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(s.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{s.payment_method}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.status === "completed" ? "default" : "destructive"} className="capitalize">
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatKES(Number(s.total))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
