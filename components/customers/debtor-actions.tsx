"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { adjustDebtor, archiveDebtor, clearDebtor, deleteDebtor, extendDebtorDueDate } from "@/app/actions/debtors"

export function DebtorActions({ customerId, archived = false }: { customerId: string; archived?: boolean }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [amount, setAmount] = useState(""); const [reason, setReason] = useState(""); const [dueAt, setDueAt] = useState("")
  function run(action: () => Promise<{ error?: string; success?: boolean }>) { startTransition(async () => { const result = await action(); if (result.error) toast.error(result.error); else { toast.success("Debtor updated"); router.refresh() } }) }
  return <div className="flex flex-col gap-4 border-t border-border pt-4">
    <div className="grid gap-2 sm:grid-cols-3"><div className="grid gap-1.5"><Label htmlFor={`adjust-${customerId}`}>Balance adjustment</Label><Input id={`adjust-${customerId}`} type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="+ or - amount" /></div><div className="grid gap-1.5"><Label htmlFor={`reason-${customerId}`}>Reason</Label><Input id={`reason-${customerId}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required reason" /></div><div className="flex items-end"><Button size="sm" disabled={pending} onClick={() => run(() => adjustDebtor({ customerId, amount: Number(amount), reason }))}>Adjust balance</Button></div></div>
    <div className="flex flex-wrap items-end gap-2"><div className="grid gap-1.5"><Label htmlFor={`extend-${customerId}`}>Extend due date</Label><Input id={`extend-${customerId}`} type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></div><Button size="sm" variant="outline" disabled={pending || !dueAt} onClick={() => run(() => extendDebtorDueDate(customerId, dueAt))}>Save date</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => { if (confirm("Clear this debtor balance?")) run(() => clearDebtor(customerId)) }}>Clear balance</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => archiveDebtor(customerId, !archived))}>{archived ? "Unarchive" : "Archive"}</Button><Button size="sm" variant="destructive" disabled={pending} onClick={() => { if (confirm("Delete this debtor? Only accounts without financial history can be deleted.")) run(() => deleteDebtor(customerId)) }}>Delete</Button></div>
  </div>
}
