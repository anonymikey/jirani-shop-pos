"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createDebtReminder } from "@/app/actions/notifications"
import { recordCustomerPayment } from "@/app/actions/debtors"

export function PaymentForm({ customerId }: { customerId: string }) {
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<"cash" | "card" | "mobile_money" | "bank_transfer">("cash")
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  function submitPayment() {
    startTransition(async () => {
      const result = await recordCustomerPayment({ customerId, amount: Number(amount), method })
      setMessage("error" in result ? result.error ?? "Payment failed" : "Payment recorded")
      if (!("error" in result)) setAmount("")
    })
  }
  function remind() {
    startTransition(async () => {
      const result = await createDebtReminder(customerId)
      setMessage("error" in result ? result.error ?? "Reminder failed" : "Reminder added to notifications")
    })
  }
  return <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><div className="flex gap-2"><Input aria-label="Payment amount" inputMode="decimal" placeholder="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} className="w-28" /><select aria-label="Payment method" value={method} onChange={(event) => setMethod(event.target.value as typeof method)} className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option value="cash">Cash</option><option value="mobile_money">M-Pesa</option><option value="card">Card</option><option value="bank_transfer">Bank</option></select><Button type="button" size="sm" onClick={submitPayment} disabled={pending}>Record</Button></div><Button type="button" size="sm" variant="ghost" onClick={remind} disabled={pending}>Remind</Button>{message && <span className="text-xs text-muted-foreground">{message}</span>}</div>
}
