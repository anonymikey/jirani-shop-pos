"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateDebtDueDate } from "@/app/actions/debtors"

export function DueDateForm({ saleId, dueAt }: { saleId: string; dueAt: string | null }) {
  const [value, setValue] = useState(dueAt ? dueAt.slice(0, 10) : "")
  const [pending, startTransition] = useTransition()
  function save() {
    startTransition(async () => {
      const result = await updateDebtDueDate({ saleId, dueAt: value ? new Date(`${value}T23:59:59`).toISOString() : null })
      if ("error" in result) toast.error(result.error)
      else toast.success("Due date updated")
    })
  }
  return <div className="flex items-center gap-2"><Input aria-label="Due date" type="date" value={value} onChange={(event) => setValue(event.target.value)} className="h-8 w-36 text-xs" /><Button type="button" size="sm" variant="outline" onClick={save} disabled={pending}>{pending ? "Saving..." : "Save date"}</Button></div>
}
