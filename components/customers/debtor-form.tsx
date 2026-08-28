"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createDebtor } from "@/app/actions/debtors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function DebtorForm() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createDebtor({ name: String(formData.get("name") ?? ""), phone: String(formData.get("phone") ?? ""), openingAmount: Number(formData.get("openingAmount") ?? 0), dueAt: String(formData.get("dueAt") ?? "") })
      if ("error" in result) toast.error(result.error)
      else { toast.success("Debtor account added"); setOpen(false); router.refresh() }
    })
  }
  if (!open) return <Button type="button" onClick={() => setOpen(true)}>Add debtor</Button>
  return <form action={submit} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
    <div className="grid gap-1.5 lg:col-span-2"><Label htmlFor="debtor-name">Name</Label><Input id="debtor-name" name="name" required placeholder="Full name" /></div>
    <div className="grid gap-1.5"><Label htmlFor="debtor-phone">Phone (optional)</Label><Input id="debtor-phone" name="phone" placeholder="07xx xxx xxx" /></div>
    <div className="grid gap-1.5"><Label htmlFor="debtor-amount">Opening debt</Label><Input id="debtor-amount" name="openingAmount" required type="number" min="0.01" step="0.01" placeholder="Amount" /></div>
    <div className="grid gap-1.5"><Label htmlFor="debtor-due">Due date (optional)</Label><Input id="debtor-due" name="dueAt" type="date" /></div>
    <div className="flex gap-2 sm:col-span-2 lg:col-span-4"><Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save debtor"}</Button><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button></div>
  </form>
}
