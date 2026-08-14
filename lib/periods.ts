export type PeriodKey = "today" | "yesterday" | "week" | "month" | "year" | "custom"

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "This week",
  month: "This month",
  year: "This year",
  custom: "Custom range",
}

export function isValidPeriod(value: string | undefined): value is PeriodKey {
  return value === "today" || value === "yesterday" || value === "week" || value === "month" || value === "year" || value === "custom"
}

/** Returns an exclusive [start, end) range in the server's local time. */
export function getPeriodRange(period: PeriodKey, from?: string, to?: string): { start: Date; end: Date } {
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

  switch (period) {
    case "today": {
      return { start: startOfDay(now), end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) }
    }
    case "yesterday": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      return { start, end: startOfDay(now) }
    }
    case "week": {
      // Week starts on Monday.
      const mondayOffset = (now.getDay() + 6) % 7
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset)
      return { start, end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) }
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start, end: new Date(now.getFullYear(), now.getMonth() + 1, 1) }
    }
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1)
      return { start, end: new Date(now.getFullYear() + 1, 0, 1) }
    }
    case "custom": {
      const start = from ? new Date(`${from}T00:00:00`) : startOfDay(now)
      const end = to ? new Date(`${to}T23:59:59.999`) : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      if (end <= start) end.setDate(start.getDate() + 1)
      return { start, end }
    }
  }
}
