"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

import {
  Bell,

  CircleDollarSign,
  Package,
  Users,
  AlertTriangle,
  ShoppingCart,
  Warehouse,
  Truck,
  HandCoins,
  X,
} from "lucide-react"
import { markAllNotificationsRead } from "@/app/actions/notification-events"

type Notification = {
  id: string
  type: string
  title: string
  body: string
  read_at: string | null
  created_at: string
}

const ICON_MAP: Record<string, { icon: typeof Bell; className: string }> = {
  sale: { icon: CircleDollarSign, className: "text-emerald-500" },
  sale_voided: { icon: AlertTriangle, className: "text-destructive" },
  stock_alert: { icon: Package, className: "text-amber-500" },
  customer_created: { icon: Users, className: "text-blue-500" },
  expense_recorded: { icon: HandCoins, className: "text-orange-500" },
  product_created: { icon: ShoppingCart, className: "text-primary" },
  product_updated: { icon: Warehouse, className: "text-primary" },
  stock_adjusted: { icon: Package, className: "text-amber-500" },
  product_restocked: { icon: Package, className: "text-emerald-500" },
  supplier_added: { icon: Truck, className: "text-blue-500" },
  supplier_restock: { icon: Truck, className: "text-amber-500" },
  debt_reminder: { icon: HandCoins, className: "text-purple-500" },
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return "Just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString("en-KE", { month: "short", day: "numeric" })
}

export function NotificationBell({ initialCount }: { initialCount: number }) {
  const [open, setOpen] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)



  // Fetch on open (triggered by button click, not side-effect)
  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next && notifications.length === 0) {
      setLoading(true)
      fetch("/api/notifications/recent")
        .then((r) => r.json())
        .then((data) => {
          setNotifications(data.notifications ?? [])
          setCount(data.unreadCount ?? 0)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }



  // Poll every 30s for badge count
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/notifications/count")
        .then((r) => r.json())
        .then((data) => {
          if (typeof data.count === "number") setCount(data.count)
        })
        .catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  async function handleMarkAllRead() {
    await markAllNotificationsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })))
    setCount(0)
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={handleToggle}
        className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
      >
        <Bell className="size-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-in fade-in zoom-in-50 duration-200">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full z-50 mt-2 w-[360px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-border bg-card shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              {count > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <Bell className="size-6 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => {
                const style = ICON_MAP[n.type] ?? { icon: Bell, className: "text-muted-foreground" }
                const Icon = style.icon
                return (
                  <div
                    key={n.id}
                    className={`flex gap-3 border-b border-border/50 px-4 py-3 transition-colors hover:bg-muted/50 ${
                      !n.read_at ? "bg-primary/5" : ""
                    }`}
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className={`size-3.5 ${style.className}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{n.title}</p>
                        {!n.read_at && (
                          <span className="flex size-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {n.body}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/60">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2.5">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center text-xs font-medium text-primary hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
