"use client"

import { useEffect, useState } from "react"
import { X, Receipt, Boxes, LayoutDashboard, UserRoundPlus, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const WHATS_NEW_KEY = "jirani_whats_new_dismissed"
const WHATS_NEW_VERSION = "1.0"

type WhatsNewCategory = {
  id: string
  label: string
  icon: React.ReactNode
  title: string
  description: string
  highlights: string[]
  accent: string
}

const categories: WhatsNewCategory[] = [
  {
    id: "sales",
    label: "Sales & Receipts",
    icon: <Receipt className="size-4" />,
    title: "Expandable Sales & Printable Receipts",
    description:
      "Every sale in your Sales History is now expandable — tap to see exactly what was sold, who bought it, and how it was paid for. Print or save PDF receipts that work perfectly on mobile and desktop.",
    highlights: [
      "Click any sale row to expand full details",
      "See product names, quantities, and line totals",
      "PDF / Print receipts with JIRANI branding",
      "Credit sales show customer, outstanding balance, and due date",
      "All receipts are mobile-optimized",
    ],
    accent: "bg-emerald-500",
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: <Boxes className="size-4" />,
    title: "Full Product & Stock Management",
    description:
      "Add, edit, and track every product in your shop. Set selling prices, manage suppliers, and adjust stock levels — all in real time.",
    highlights: [
      "Add products with name, brand, cost, and selling price",
      "Edit any product field and save instantly",
      "Stock adjustments with full audit trail",
      "Supplier tracking and restock requests",
      "Low stock alerts on the dashboard",
    ],
    accent: "bg-blue-500",
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="size-4" />,
    title: "Real-Time Business Insights",
    description:
      "Your dashboard shows today's sales, profit, expenses, and debt summaries — all calculated from your actual shop records.",
    highlights: [
      "Today's revenue, profit, and net profit",
      "Payment split: Cash, M-Pesa, Card, Credit",
      "7-day revenue and profit chart",
      "Top-selling products",
      "Outstanding debtor balance at a glance",
    ],
    accent: "bg-amber-500",
  },
  {
    id: "credit",
    label: "Credit & Debt",
    icon: <UserRoundPlus className="size-4" />,
    title: "Customer & Debtor Management",
    description:
      "Track credit sales, record repayments, and monitor who owes your shop money. Create new debtors directly from the POS during checkout.",
    highlights: [
      "Create debtors during POS checkout",
      "Record partial and full repayments",
      "Track outstanding balances per customer",
      "Set and update due dates",
      "Debtor balance updates automatically",
    ],
    accent: "bg-purple-500",
  },
]

function isDismissed(): boolean {
  if (typeof window === "undefined") return true
  return localStorage.getItem(WHATS_NEW_KEY) === WHATS_NEW_VERSION
}

function markDismissed() {
  localStorage.setItem(WHATS_NEW_KEY, WHATS_NEW_VERSION)
}

export function WhatsNew() {
  const [visible, setVisible] = useState(false)
  const [activeCategory, setActiveCategory] = useState(0)

  useEffect(() => {
    if (!isDismissed()) {
      const timer = setTimeout(() => setVisible(true), 400)
      return () => clearTimeout(timer)
    }
  }, [])

  if (!visible) return null

  function dismiss() {
    markDismissed()
    setVisible(false)
  }

  const current = categories[activeCategory]

  return (
    <div className="fixed inset-0 z-[1010] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />

      {/* Modal */}
      <div className="relative z-10 flex w-full max-w-[800px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" style={{ maxHeight: "min(560px, 90vh)" }}>
        {/* Left sidebar — categories */}
        <div className="hidden w-[220px] shrink-0 flex-col border-r border-border bg-muted/30 p-5 md:flex">
          <h2 className="mb-5 text-lg font-bold tracking-tight">What&apos;s new</h2>
          <nav className="flex flex-col gap-1">
            {categories.map((cat, i) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(i)}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                  i === activeCategory
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-6">
            <p className="text-[11px] leading-relaxed text-muted-foreground/60">
              JIRANI POS — Built for modern retail in East Africa
            </p>
          </div>
        </div>

        {/* Right content */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-1.5 text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground md:right-4 md:top-4"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>

          {/* Mobile category tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-border p-3 md:hidden">
            {categories.map((cat, i) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(i)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  i === activeCategory
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="flex flex-1 flex-col p-6 md:p-8">
            {/* Accent dot + title */}
            <div className="mb-4 flex items-center gap-3">
              <span className={`flex size-8 items-center justify-center rounded-lg text-white ${current.accent}`}>
                <Sparkles className="size-4" />
              </span>
              <div>
                <h3 className="text-lg font-bold leading-tight">{current.title}</h3>
                <p className="mt-0.5 text-xs capitalize text-muted-foreground">{current.label}</p>
              </div>
            </div>

            {/* Description */}
            <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{current.description}</p>

            {/* Highlights */}
            <div className="mb-6 rounded-xl border border-border bg-muted/30 p-4">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">What you can do</p>
              <ul className="flex flex-col gap-2">
                {current.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom nav */}
            <div className="mt-auto flex items-center justify-between">
              <div className="flex gap-1.5">
                {categories.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${
                      i === activeCategory ? "w-5 bg-primary" : "w-1.5 bg-muted"
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                {activeCategory > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setActiveCategory((c) => c - 1)}>
                    Back
                  </Button>
                )}
                {activeCategory < categories.length - 1 ? (
                  <Button size="sm" onClick={() => setActiveCategory((c) => c + 1)}>
                    Next
                  </Button>
                ) : (
                  <Button size="sm" onClick={dismiss}>
                    Get started
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
