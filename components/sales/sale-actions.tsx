"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { voidSale } from "@/app/actions/sales"

export function SaleActions({ saleId, receiptNumber, total, paymentMethod, createdAt }: { saleId: string; receiptNumber: string | null; total: number; paymentMethod: string; createdAt: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  function downloadReceipt() {
    const receipt = window.open("", "_blank", "noopener,noreferrer")
    if (!receipt) return
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character)
    const receiptLabel = escapeHtml(receiptNumber || saleId)
    const paymentLabel = escapeHtml(paymentMethod)
    const dateLabel = escapeHtml(new Date(createdAt).toLocaleString("en-KE"))
    receipt.document.write(`<html><head><title>Receipt ${receiptLabel}</title><style>body{font-family:Arial,sans-serif;max-width:420px;margin:40px auto;padding:24px}h1{text-align:center}hr{border:0;border-top:1px solid #ddd;margin:20px 0}.row{display:flex;justify-content:space-between;margin:12px 0}.total{font-size:20px;font-weight:700}</style></head><body><h1>JIRANI SHOP SYSTEM</h1><hr/><div class="row"><span>Receipt</span><strong>${receiptLabel}</strong></div><div class="row"><span>Date</span><span>${dateLabel}</span></div><div class="row"><span>Payment</span><span>${paymentLabel}</span></div><hr/><div class="row total"><span>Total</span><span>KES ${total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span></div><p style="text-align:center;margin-top:40px">Thank you for shopping with us.</p></body></html>`)
    receipt.document.close()
    receipt.focus()
    receipt.print()
  }
  async function handleVoid() {
    setPending(true)
    const result = await voidSale({ saleId })
    setPending(false)
    if (result.error) toast.error(result.error)
    else { toast.success("Sale voided and stock restored"); setConfirming(false); router.refresh() }
  }
  return <>
    <div className="flex justify-end gap-2 print:hidden"><Button type="button" size="sm" variant="outline" onClick={downloadReceipt}>PDF / Print</Button><Button type="button" size="sm" variant="destructive" onClick={() => setConfirming(true)} disabled={pending}>Void sale</Button></div>
    {confirming && <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setConfirming(false) }}><div role="dialog" aria-modal="true" aria-labelledby={`void-title-${saleId}`} className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"><h2 id={`void-title-${saleId}`} className="text-lg font-semibold">Void this sale?</h2><p className="mt-2 text-sm text-muted-foreground">Sale {receiptNumber || saleId} will be marked void and its stock restored. This action cannot be undone.</p><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={pending}>Cancel</Button><Button type="button" variant="destructive" onClick={handleVoid} disabled={pending}>{pending ? "Voiding..." : "Confirm void"}</Button></div></div></div>}
  </>
}
