"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"

const EAST_AFRICA_TIME_ZONE = "Africa/Nairobi"

type DashboardWelcomeProps = {
  userName?: string | null
  shopName?: string | null
  initialNow: string
}

function getGreeting(hour: number) {
  if (hour < 5) return { label: "Good night", icon: "🌙" }
  if (hour < 12) return { label: "Good morning", icon: "👋" }
  if (hour < 18) return { label: "Good afternoon", icon: "👋" }
  if (hour < 21) return { label: "Good evening", icon: "👋" }
  return { label: "Good night", icon: "🌙" }
}

function getEastAfricaHour(date: Date): number {
  // Use formatToParts with explicit hourCycle to guarantee 24-hour extraction
  const formatter = new Intl.DateTimeFormat("en-KE", {
    timeZone: EAST_AFRICA_TIME_ZONE,
    hourCycle: "h23",
    hour: "numeric",
    minute: "2-digit",
  })
  const parts = formatter.formatToParts(date)
  const hourPart = parts.find((p) => p.type === "hour")
  return hourPart ? Number(hourPart.value) : 0
}

function getEastAfricaParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-KE", {
    timeZone: EAST_AFRICA_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(date)

  return Object.fromEntries(parts.map(({ type, value }) => [type, value]))
}

export function DashboardWelcome({ userName, shopName, initialNow }: DashboardWelcomeProps) {
  const [now, setNow] = useState(() => new Date(initialNow))

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const parts = getEastAfricaParts(now ?? new Date())
  const hour = getEastAfricaHour(now ?? new Date())
  const greeting = getGreeting(hour)
  const displayName = userName?.trim() || "there"
  const displayShop = shopName?.trim() || "JIRANI SHOP"
  const dateLabel = `${parts.weekday}, ${parts.day} ${parts.month} ${parts.year}`
  const timeLabel = `${parts.hour}:${parts.minute} ${parts.dayPeriod} EAT`

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-accent/40 shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-reduce:animate-none">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/10 blur-3xl" />
      <CardContent className="relative flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-primary motion-safe:animate-in motion-safe:fade-in motion-reduce:animate-none">
            {greeting.label}, {displayName} {greeting.icon}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Welcome back to {displayShop}
          </h2>
          <p className="text-sm text-muted-foreground">Your shop at a glance, presented in East Africa Time.</p>
        </div>
        <div className="flex shrink-0 flex-col gap-1 text-left text-sm sm:items-end sm:text-right">
          <time dateTime={now?.toISOString()} className="font-medium">{dateLabel}</time>
          <span className="text-muted-foreground">{timeLabel}</span>
        </div>
      </CardContent>
    </Card>
  )
}
