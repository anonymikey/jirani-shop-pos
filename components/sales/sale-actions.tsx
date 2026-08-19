"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { voidSale } from "@/app/actions/sales"

export function SaleActions({ saleId, receiptNumber, total, paymentMethod, createdAt }: { saleId: string; receiptNumber: string | null; total: number; paymentMethod: string; createdAt: string }) {
  const [pending, setPending] = useState(false)
  function downloadReceipt() {
    const receipt = window.open("", "_blank", "noopener,noreferrer")
    if (!receipt) return
    receipt.document.write(`<html><head><title>Receipt ${receiptNumber || saleId}</title><style>body{font-family:Arial,sans-serif;max-width:420px;margin:40px auto;padding:24px}h1{text-align:center}hr{border:0;border-top:1px solid #ddd;margin:20px 0}.row{display:flex;justify-content:space-between;margin:12px 0}.total{font-size:20px;font-weight:700}</style></head><body><h1>JIRANI SHOP SYSTEM</h1><hr/><div class="row"><span>Receipt</span><strong>${receiptNumber || saleId}</strong></div><div class="row"><span>Date</span><span>${new Date(createdAt).toLocaleString("en-KE")}</span></div><div class="row"><span>Payment</span><span>${paymentMethod}</span></div><hr/><div class="row total"><span>Total</span><span>KES ${total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span></div><p style="text-align:center;margin-top:40px">Thank you for shopping with us.</p></body></html>`)
    receipt.document.close()
    receipt.focus()
    receipt.print()
  }
  async function handleVoid() {
    if (!window.confirm(`Void sale ${receiptNumber || saleId}? This restores stock and cannot be undone.`)) return
    setPending(true)
    const result = await voidSale({ saleId })
    setPending(false)
    if (result.error) toast.error(result.error)
    else toast.success("Sale voided and stock restored")
  }
  return <div className="flex justify-end gap-2 print:hidden"><Button type="button" size="sm" variant="outline" onClick={downloadReceipt}>PDF / Print</Button>{<Button type="button" size="sm" variant="destructive" onClick={handleVoid} disabled={pending}>Void sale</Button>}</div>
}
