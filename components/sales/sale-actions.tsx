"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { voidSale } from "@/app/actions/sales"

export function SaleActions({ saleId, receiptNumber, onPrint }: {
  saleId: string
  receiptNumber: string | null
  onPrint: (e: React.MouseEvent) => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function handleVoid() {
    setPending(true)
    const result = await voidSale({ saleId })
    setPending(false)
    if (result.error) toast.error(result.error)
    else { toast.success("Sale voided and stock restored"); setConfirming(false); router.refresh() }
  }

  return (
    <>
      <div className="flex justify-end gap-2 print:hidden">
        <Button type="button" size="sm" variant="outline" onClick={onPrint}>PDF / Print</Button>
        <Button type="button" size="sm" variant="destructive" onClick={() => setConfirming(true)} disabled={pending}>Void sale</Button>
      </div>
      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setConfirming(false) }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby={`void-title-${saleId}`} className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 id={`void-title-${saleId}`} className="text-lg font-semibold">Void this sale?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sale {receiptNumber || saleId} will be marked void and its stock restored. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={pending}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={handleVoid} disabled={pending}>
                {pending ? "Voiding..." : "Confirm void"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
