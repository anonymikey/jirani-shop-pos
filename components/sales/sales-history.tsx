"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatEATDateTime, formatKES } from "@/lib/format"
import { SaleActions } from "@/components/sales/sale-actions"
import { ChevronRight, ChevronDown } from "lucide-react"

type SaleItem = {
  product_name: string
  quantity: number
  unit_price: number
  line_total: number
}

type Customer = { name: string } | null

type Sale = {
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
  customers: Customer
  sale_items: SaleItem[]
}

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function buildReceipt(sale: Sale) {
  const date = new Date(sale.created_at)
  const dateStr = date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })
  const timeStr = date.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" })

  const items = sale.sale_items.map((item) => ({
    name: esc(item.product_name),
    qty: item.quantity,
    price: Number(item.unit_price),
    total: Number(item.line_total),
  }))

  const subtotal = sale.subtotal != null ? Number(sale.subtotal) : items.reduce((s, i) => s + i.total, 0)
  const discount = sale.discount != null ? Number(sale.discount) : 0
  const tax = sale.tax != null ? Number(sale.tax) : 0
  const total = Number(sale.total)
  const paid = sale.amount_paid != null ? Number(sale.amount_paid) : total
  const outstanding = Math.max(0, total - paid)
  const isDebt = sale.payment_method === "debt"
  const customerName = sale.customers?.name ?? ""
  const dueAt = sale.due_at ? new Date(sale.due_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" }) : ""

  const itemRows = items.map((i) =>
    `<tr><td style="padding:4px 0">${i.name}</td><td style="text-align:center;padding:4px 0">${i.qty}</td><td style="text-align:right;padding:4px 0">${i.price.toLocaleString("en-KE")}</td><td style="text-align:right;padding:4px 0">${i.total.toLocaleString("en-KE")}</td></tr>`
  ).join("")

  const paymentLine = isDebt ? "Debt" : sale.payment_method.charAt(0).toUpperCase() + sale.payment_method.slice(1).replace("_", " ")
  const balanceLine = outstanding > 0
    ? `<p style="margin:2px 0">Outstanding: KES ${outstanding.toLocaleString("en-KE")}</p>` +
      (customerName ? `<p style="margin:2px 0">Customer: ${esc(customerName)}</p>` : "") +
      (dueAt ? `<p style="margin:2px 0">Due date: ${dueAt}</p>` : "")
    : `<p style="margin:2px 0">Balance: KES 0</p>`

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt ${esc(sale.receipt_number || sale.id)}</title>
<style>
  body{font-family:monospace;max-width:420px;margin:0 auto;padding:20px;color:#000}
  h1{text-align:center;font-size:16px;margin:0 0 4px}
  .sub{text-align:center;font-size:11px;color:#666;margin-bottom:16px}
  hr{border:0;border-top:1px dashed #999;margin:12px 0}
  table{width:100%;border-collapse:collapse}
  td{padding:3px 0;font-size:13px}
  .total-row{font-weight:bold;font-size:15px}
  .footer{text-align:center;margin-top:24px;font-size:11px;color:#666}
  @media print{body{padding:0}}
</style></head><body>
<h1>JIRANI SHOP SYSTEM</h1>
<div class="sub">${esc(sale.receipt_number || "—")} &bull; ${dateStr}, ${timeStr}</div>
<hr>
<table>
<tr><th style="text-align:left;font-size:12px">Item</th><th style="text-align:center;font-size:12px">Qty</th><th style="text-align:right;font-size:12px">Price</th><th style="text-align:right;font-size:12px">Total</th></tr>
<tr><td colspan="4"><hr style="border:0;border-top:1px dashed #ccc;margin:4px 0"></td></tr>
${itemRows}
<tr><td colspan="4"><hr style="border:0;border-top:1px dashed #ccc;margin:4px 0"></td></tr>
</table>
<div style="margin-top:12px">
<p style="margin:2px 0">Subtotal: KES ${subtotal.toLocaleString("en-KE")}</p>
${discount > 0 ? `<p style="margin:2px 0">Discount: KES ${discount.toLocaleString("en-KE")}</p>` : ""}
${tax > 0 ? `<p style="margin:2px 0">Tax: KES ${tax.toLocaleString("en-KE")}</p>` : ""}
<p style="margin:4px 0;font-size:15px;font-weight:bold">TOTAL: KES ${total.toLocaleString("en-KE")}</p>
</div>
<hr>
<p style="margin:2px 0">Payment: ${esc(paymentLine)}</p>
<p style="margin:2px 0">Paid: KES ${paid.toLocaleString("en-KE")}</p>
${balanceLine}
<hr>
<div class="footer">Thank you for shopping with us<br>JIRANI SHOP SYSTEM</div>
</body></html>`
}

export function SalesHistory({ sections }: { sections: [string, Sale[]][] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function toggle(id: string) {
    setExpandedId((current) => (current === id ? null : id))
  }

  return (
    <>
      {sections.map(([key, section]) => (
        <section key={key} className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="font-semibold">{key}</h2>
            <span className="text-xs text-muted-foreground">{section.length} sale{section.length === 1 ? "" : "s"}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8 print:hidden" />
                <TableHead>Receipt</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right print:hidden">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {section.map((sale) => {
                const expanded = expandedId === sale.id
                const total = Number(sale.total)
                const paid = sale.amount_paid != null ? Number(sale.amount_paid) : total
                const outstanding = Math.max(0, total - paid)
                const customerName = sale.customers?.name ?? ""
                const items = sale.sale_items ?? []
                return (
                  <SaleRow
                    key={sale.id}
                    sale={sale}
                    expanded={expanded}
                    onToggle={() => toggle(sale.id)}
                    total={total}
                    paid={paid}
                    outstanding={outstanding}
                    customerName={customerName}
                    items={items}
                  />
                )
              })}
            </TableBody>
          </Table>
        </section>
      ))}
    </>
  )
}

function SaleRow({ sale, expanded, onToggle, total, paid, outstanding, customerName, items }: {
  sale: Sale
  expanded: boolean
  onToggle: () => void
  total: number
  paid: number
  outstanding: number
  customerName: string
  items: SaleItem[]
}) {
  function handlePrint(e: React.MouseEvent) {
    e.stopPropagation()
    const html = buildReceipt(sale)
    const win = window.open("", "_blank", "noopener,noreferrer,width=480,height=640")
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { try { win.print() } catch {} }, 300)
  }

  return (
    <>
      <TableRow
        className="cursor-pointer select-none hover:bg-accent/50"
        onClick={onToggle}
      >
        <TableCell className="w-8 print:hidden">
          {expanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
        </TableCell>
        <TableCell className="font-medium">{sale.receipt_number || "—"}</TableCell>
        <TableCell className="text-muted-foreground hidden sm:table-cell">{formatEATDateTime(sale.created_at)}</TableCell>
        <TableCell><Badge variant="secondary" className="capitalize">{sale.payment_method}</Badge></TableCell>
        <TableCell><Badge variant={sale.status === "completed" ? "default" : "destructive"} className="capitalize">{sale.status}</Badge></TableCell>
        <TableCell className="text-right font-semibold">{formatKES(total)}</TableCell>
        <TableCell className="text-right print:hidden" onClick={(e) => e.stopPropagation()}>
          <SaleActions saleId={sale.id} receiptNumber={sale.receipt_number} onPrint={handlePrint} />
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="p-0">
            <div className="border-t border-border bg-muted/20 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Sale information */}
                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="mb-3 text-sm font-semibold">Sale information</h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Receipt</dt>
                    <dd className="font-medium">{sale.receipt_number || "—"}</dd>
                    <dt className="text-muted-foreground">Date</dt>
                    <dd>{formatEATDateTime(sale.created_at)}</dd>
                    <dt className="text-muted-foreground">Payment</dt>
                    <dd className="capitalize">{sale.payment_method}</dd>
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className="capitalize">{sale.status}</dd>
                    {sale.subtotal != null && (
                      <>
                        <dt className="text-muted-foreground">Subtotal</dt>
                        <dd>{formatKES(Number(sale.subtotal))}</dd>
                      </>
                    )}
                    {sale.discount != null && Number(sale.discount) > 0 && (
                      <>
                        <dt className="text-muted-foreground">Discount</dt>
                        <dd>{formatKES(Number(sale.discount))}</dd>
                      </>
                    )}
                    {sale.tax != null && Number(sale.tax) > 0 && (
                      <>
                        <dt className="text-muted-foreground">Tax</dt>
                        <dd>{formatKES(Number(sale.tax))}</dd>
                      </>
                    )}
                    <dt className="text-muted-foreground">Total</dt>
                    <dd className="font-semibold">{formatKES(total)}</dd>
                    <dt className="text-muted-foreground">Paid</dt>
                    <dd>{formatKES(paid)}</dd>
                    {outstanding > 0 && (
                      <>
                        <dt className="text-muted-foreground">Outstanding</dt>
                        <dd className="font-semibold text-destructive">{formatKES(outstanding)}</dd>
                      </>
                    )}
                    {customerName && (
                      <>
                        <dt className="text-muted-foreground">Customer</dt>
                        <dd>{customerName}</dd>
                      </>
                    )}
                    {sale.due_at && (
                      <>
                        <dt className="text-muted-foreground">Due date</dt>
                        <dd>{new Date(sale.due_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Nairobi" })}</dd>
                      </>
                    )}
                  </dl>
                </div>

                {/* Goods sold */}
                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="mb-3 text-sm font-semibold">Goods sold</h3>
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No item details available.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs text-muted-foreground">
                          <th className="pb-2 pr-2">Product</th>
                          <th className="pb-2 pr-2 text-center">Qty</th>
                          <th className="pb-2 pr-2 text-right">Price</th>
                          <th className="pb-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={index} className="border-b border-border/50">
                            <td className="py-2 pr-2">{item.product_name}</td>
                            <td className="py-2 pr-2 text-center">{item.quantity}</td>
                            <td className="py-2 pr-2 text-right">{formatKES(Number(item.unit_price))}</td>
                            <td className="py-2 text-right font-medium">{formatKES(Number(item.line_total))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
