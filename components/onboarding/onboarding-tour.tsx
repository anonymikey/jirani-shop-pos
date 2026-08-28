"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

const TOUR_KEY = "jirani_onboarding_complete"

type TourStep = {
  title: string
  description: string
  target: string // CSS selector for the element to highlight
  placement?: "right" | "bottom"
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to JIRANI POS!",
    description: "Your complete shop management system. Let us show you around — this quick tour covers the key features you'll use every day.",
    target: "[data-tour='welcome']",
    placement: "bottom",
  },
  {
    title: "Point of Sale",
    description: "Ring up sales in seconds. Search products, add to cart, choose payment method (Cash, M-Pesa, Card, or Credit) and complete the sale.",
    target: "[data-tour='pos']",
  },
  {
    title: "Sales History",
    description: "View all transactions, print receipts, and void sales when needed. Every sale is recorded with full details.",
    target: "[data-tour='sales']",
  },
  {
    title: "Inventory",
    description: "Add products, track stock levels, set reorder alerts, and manage suppliers. Your inventory stays accurate in real time.",
    target: "[data-tour='inventory']",
  },
  {
    title: "Customers & Debtors",
    description: "Keep customer records, track credit sales, record repayments, and monitor who owes your shop money.",
    target: "[data-tour='customers']",
  },
  {
    title: "Reports",
    description: "See your business at a glance — revenue, profit, expenses, and debt summaries. Filter by day, week, month, or custom range.",
    target: "[data-tour='reports']",
  },
  {
    title: "Notifications",
    description: "Stay updated with stock alerts, supplier restock requests, and important system notifications.",
    target: "[data-tour='notifications']",
  },
  {
    title: "You're All Set!",
    description: "That's the basics. Start by adding products to your inventory or jump straight into making a sale. Jirani is here to make your shop run smoother.",
    target: "[data-tour='welcome']",
    placement: "bottom",
  },
]

function isTourComplete(): boolean {
  if (typeof window === "undefined") return true
  return localStorage.getItem(TOUR_KEY) === "true"
}

function markTourComplete() {
  localStorage.setItem(TOUR_KEY, "true")
}

function getStepPosition(target: string, placement: "right" | "bottom" = "right") {
  const el = document.querySelector(target)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  if (placement === "bottom") {
    return {
      top: rect.bottom + 12,
      left: Math.max(16, Math.min(rect.left, window.innerWidth - 380)),
      arrowLeft: rect.left + rect.width / 2 - 16,
      arrowTop: -6,
      arrowRotation: "rotate(45deg)",
      placement: "bottom" as const,
    }
  }
  // right placement
  return {
    top: Math.max(16, Math.min(rect.top, window.innerHeight - 300)),
    left: rect.right + 16,
    arrowLeft: -6,
    arrowTop: 24,
    arrowRotation: "rotate(-45deg)",
    placement: "right" as const,
  }
}

export function OnboardingTour() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [position, setPosition] = useState<ReturnType<typeof getStepPosition>>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isTourComplete()) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setVisible(true), 600)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    const current = TOUR_STEPS[step]
    if (!current) return

    function updatePosition() {
      const pos = getStepPosition(current.target, current.placement)
      setPosition(pos)
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [visible, step])

  if (!visible) return null

  const current = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1
  const isFirst = step === 0

  function finish() {
    markTourComplete()
    setVisible(false)
  }

  function next() {
    if (isLast) {
      finish()
    } else {
      setStep((s) => s + 1)
    }
  }

  function back() {
    if (!isFirst) setStep((s) => s - 1)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[998] bg-black/40 transition-opacity"
        onClick={finish}
        aria-hidden="true"
      />

      {/* Tour highlight ring */}
      {position && (
        <div
          className="fixed z-[999] rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent pointer-events-none transition-all duration-300"
          style={{
            top: Math.max(0, (position.placement === "bottom" ? position.top - 8 : position.top - 8)),
            left: Math.max(0, (position.placement === "right" ? position.left - 8 : (position.arrowLeft || 0) - 190)),
            width: position.placement === "right" ? "calc(100vw - 280px)" : "min(360px, calc(100vw - 32px))",
            height: 44,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[1000] w-[340px] rounded-xl border border-border bg-card p-5 shadow-2xl"
        style={{
          top: position?.top ?? 100,
          left: Math.min(position?.left ?? 100, window.innerWidth - 360),
        }}
        role="dialog"
        aria-label={`Tour step ${step + 1} of ${TOUR_STEPS.length}`}
      >
        {/* Arrow */}
        <div
          className="absolute h-3 w-3 border border-border bg-card"
          style={{
            top: position?.placement === "bottom" ? -7 : position?.arrowTop ?? 24,
            left: position?.placement === "bottom" ? (position?.arrowLeft ?? 100) : -7,
            transform: position?.arrowRotation ?? "rotate(45deg)",
            borderTop: "none",
            borderLeft: "none",
          }}
        />

        {/* Close button */}
        <button
          onClick={finish}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label="Skip tour"
        >
          <X className="size-4" />
        </button>

        {/* Content */}
        <div className="mb-4">
          <h3 className="text-base font-semibold">{current.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{current.description}</p>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-5 bg-primary" : i < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="ghost" size="sm" onClick={back}>
                Back
              </Button>
            )}
            <Button size="sm" onClick={next}>
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>

        {/* Skip link */}
        {!isLast && (
          <button
            onClick={finish}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground"
          >
            Skip tour
          </button>
        )}
      </div>
    </>
  )
}
