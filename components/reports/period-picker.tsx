"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom range" },
]

export function PeriodPicker({
  period,
  from,
  to,
}: {
  period: string
  from?: string
  to?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [localFrom, setLocalFrom] = useState(from ?? "")
  const [localTo, setLocalTo] = useState(to ?? "")

  function navigate(nextPeriod: string, nextFrom?: string, nextTo?: string) {
    const params = new URLSearchParams()
    params.set("period", nextPeriod)
    if (nextPeriod === "custom") {
      if (nextFrom) params.set("from", nextFrom)
      if (nextTo) params.set("to", nextTo)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="grid gap-1.5">
        <Label className="text-xs">Period</Label>
        <Select value={period} onValueChange={(v) => navigate(v ?? "today", localFrom || undefined, localTo || undefined)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {period === "custom" && (
        <>
          <div className="grid gap-1.5">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={localFrom}
              onChange={(e) => {
                setLocalFrom(e.target.value)
                navigate("custom", e.target.value || undefined, localTo || undefined)
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={localTo}
              onChange={(e) => {
                setLocalTo(e.target.value)
                navigate("custom", localFrom || undefined, e.target.value || undefined)
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}
