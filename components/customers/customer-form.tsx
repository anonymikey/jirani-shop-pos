"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createCustomer } from "@/app/actions/business"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CustomerFormProps = {
  mode?: "customer" | "debtor"
}

export function CustomerForm({ mode = "customer" }: CustomerFormProps) {
  const router = useRouter()
  const isDebtor = mode === "debtor"
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await createCustomer({
        name: String(formData.get("name") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        email: String(formData.get("email") ?? ""),
        creditLimit: Number(formData.get("creditLimit") ?? 0),
      })
      if ("error" in result) {
        toast.error(result.error)
        return
      }
      toast.success(isDebtor ? "Debtor account added" : "Customer added")
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      {!open ? (
        <Button type="button" onClick={() => setOpen(true)}>{isDebtor ? "Add debtor" : "Add customer"}</Button>
      ) : (
        <form action={submit} className="grid gap-3 sm:grid-cols-4">
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="customer-name">Name</Label>
            <Input id="customer-name" name="name" required placeholder="Full name" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="customer-phone">Phone</Label>
            <Input id="customer-phone" name="phone" placeholder="07xx xxx xxx" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="customer-limit">Credit limit</Label>
            <Input id="customer-limit" name="creditLimit" type="number" min="0" placeholder="Optional" />
          </div>
          <div className="flex gap-2 sm:col-span-4">
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : isDebtor ? "Save debtor" : "Save customer"}</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      )}
    </div>
  )
}
