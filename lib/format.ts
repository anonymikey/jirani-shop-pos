export function formatKES(amount: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-KE").format(n || 0)
}

export function formatEATDate(value: string | Date, options: Intl.DateTimeFormatOptions = {}) {
  const granularDateOption = ["weekday", "year", "month", "day", "era"].some((key) => key in options)
  const { dateStyle: requestedDateStyle, ...rest } = options
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    ...(granularDateOption ? rest : { dateStyle: requestedDateStyle ?? "medium", ...rest }),
  }).format(new Date(value))
}

export function formatEATDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
