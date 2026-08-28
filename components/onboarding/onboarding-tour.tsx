"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { X, RotateCcw } from "lucide-react"

const TOUR_KEY = "jirani_onboarding_complete"

type TourStep = {
  title: string
  description: string
  target: string
  placement?: "right" | "bottom"
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to JIRANI POS!",
    description:
      "Your complete shop management system. Let us show you around — this quick tour covers the key features you'll use every day.",
    target: "[data-tour='welcome']",
    placement: "bottom",
  },
  {
    title: "Point of Sale",
    description:
      "Ring up sales in seconds. Search products, add to cart, choose payment method (Cash, M-Pesa, Card, or Credit) and complete the sale.",
    target: "[data-tour='pos']",
  },
  {
    title: "Sales History",
    description:
      "View all transactions, print receipts, and void sales when needed. Every sale is recorded with full details.",
    target: "[data-tour='sales']",
  },
  {
    title: "Inventory",
    description:
      "Add products, track stock levels, set reorder alerts, and manage suppliers. Your inventory stays accurate in real time.",
    target: "[data-tour='inventory']",
  },
  {
    title: "Customers & Debtors",
    description:
      "Keep customer records, track credit sales, record repayments, and monitor who owes your shop money.",
    target: "[data-tour='customers']",
  },
  {
    title: "Reports",
    description:
      "See your business at a glance — revenue, profit, expenses, and debt summaries. Filter by day, week, month, or custom range.",
    target: "[data-tour='reports']",
  },
  {
    title: "Notifications",
    description:
      "Stay updated with stock alerts, supplier restock requests, and important system notifications.",
    target: "[data-tour='notifications']",
  },
  {
    title: "You're All Set!",
    description:
      "That's the basics. Start by adding products to your inventory or jump straight into making a sale. Jirani is here to make your shop run smoother.",
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

function markTourIncomplete() {
  localStorage.removeItem(TOUR_KEY)
}

function getStepPosition(target: string, placement: "right" | "bottom" = "right") {
  const el = document.querySelector(target)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  const isMobile = window.innerWidth < 768

  // On mobile, always use bottom placement as a bottom sheet
  if (isMobile) {
    return {
      top: null,
      left: 0,
      arrowLeft: 0,
      arrowTop: 0,
      arrowRotation: "rotate(45deg)",
      placement: "bottom" as const,
      highlightTop: Math.max(0, rect.top - 4),
      highlightLeft: 8,
      highlightWidth: window.innerWidth - 16,
      highlightHeight: rect.height + 8,
    }
  }

  if (placement === "bottom") {
    return {
      top: rect.bottom + 12,
      left: Math.max(16, Math.min(rect.left, window.innerWidth - 380)),
      arrowLeft: rect.left + rect.width / 2 - 16,
      arrowTop: -6,
      arrowRotation: "rotate(45deg)",
      placement: "bottom" as const,
      highlightTop: Math.max(0, rect.top - 4),
      highlightLeft: Math.max(0, rect.left - 4),
      highlightWidth: rect.width + 8,
      highlightHeight: rect.height + 8,
    }
  }

  // Right placement
  return {
    top: Math.max(16, Math.min(rect.top, window.innerHeight - 300)),
    left: rect.right + 16,
    arrowLeft: -6,
    arrowTop: 24,
    arrowRotation: "rotate(-45deg)",
    placement: "right" as const,
    highlightTop: Math.max(0, rect.top - 4),
    highlightLeft: Math.max(0, rect.left - 4),
    highlightWidth: rect.width + 8,
    highlightHeight: rect.height + 8,
  }
}

export function OnboardingTour() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [position, setPosition] = useState<ReturnType<typeof getStepPosition>>(null)
  const [animPhase, setAnimPhase] = useState<"entering" | "idle" | "switching">("idle")
  const [showFinished, setShowFinished] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isTourComplete()) {
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

      // Scroll the target element into view on mobile
      const el = document.querySelector(current.target)
      if (el && window.innerWidth < 768) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [visible, step])



  if (!visible && !showFinished) return null

  // Show the "tour complete" prompt with option to restart
  if (showFinished) {
    return (
      <div className="fixed inset-0 z-[998] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowFinished(false)}
        />
        <div className="relative z-10 w-full max-w-sm animate-in fade-in zoom-in-95 duration-300 rounded-2xl border border-border bg-card p-6 shadow-2xl text-center">
          <div className="mb-4 flex justify-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary/10">
              <RotateCcw className="size-6 text-primary" />
            </span>
          </div>
          <h3 className="text-lg font-bold">Tour Complete!</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Need a refresher? You can restart the guided tour anytime from here.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              onClick={() => {
                setShowFinished(false)
                markTourIncomplete()
                setStep(0)
                setVisible(true)
              }}
              className="w-full"
            >
              <RotateCcw className="mr-2 size-4" />
              Start the tour again
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowFinished(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const current = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1
  const isFirst = step === 0
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768

  function animateStep(newStep: number) {
    setAnimPhase("switching")
    // Wait for exit animation, then switch step and animate in
    setTimeout(() => {
      setStep(newStep)
      setAnimPhase("entering")
      setTimeout(() => setAnimPhase("idle"), 300)
    }, 150)
  }

  function finish() {
    markTourComplete()
    setVisible(false)
    setTimeout(() => setShowFinished(true), 400)
  }

  function next() {
    if (isLast) {
      finish()
    } else {
      animateStep(step + 1)
    }
  }

  function back() {
    if (!isFirst) animateStep(step - 1)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[998] bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200"
        onClick={finish}
        aria-hidden="true"
      />

      {/* Tour highlight ring */}
      {position && (
        <div
          className="fixed z-[999] rounded-lg pointer-events-none transition-all duration-500 ease-out animate-in fade-in duration-300"
          style={{
            top: position.highlightTop,
            left: position.highlightLeft,
            width: position.highlightWidth,
            height: position.highlightHeight,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.45), 0 0 16px 4px rgba(var(--primary-rgb, 59 130 246), 0.25)",
            borderRadius: 10,
          }}
        />
      )}

      {/* Tooltip — Desktop */}
      {!isMobile && (
        <div
          ref={tooltipRef}
          className={`fixed z-[1000] w-[340px] rounded-xl border border-border bg-card p-5 shadow-2xl transition-all duration-300 ease-out ${
            animPhase !== "idle"
              ? "opacity-0 translate-y-2 scale-[0.97]"
              : "opacity-100 translate-y-0 scale-100"
          }`}
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

          <TooltipContent
            current={current}
            step={step}
            isFirst={isFirst}
            isLast={isLast}
            onBack={back}
            onNext={next}
            onSkip={finish}
          />
        </div>
      )}

      {/* Tooltip — Mobile bottom sheet */}
      {isMobile && (
        <div
          ref={tooltipRef}
          className={`fixed inset-x-0 bottom-0 z-[1000] rounded-t-2xl border border-border bg-card p-5 pb-8 shadow-2xl transition-all duration-300 ease-out ${
            animPhase !== "idle"
              ? "translate-y-full opacity-0"
              : "translate-y-0 opacity-100"
          }`}
          role="dialog"
          aria-label={`Tour step ${step + 1} of ${TOUR_STEPS.length}`}
        >
          {/* Handle bar */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />

          <TooltipContent
            current={current}
            step={step}
            isFirst={isFirst}
            isLast={isLast}
            onBack={back}
            onNext={next}
            onSkip={finish}
          />
        </div>
      )}
    </>
  )
}

/* ── Shared tooltip content (used by both desktop and mobile) ── */

function TooltipContent({
  current,
  step,
  isFirst,
  isLast,
  onBack,
  onNext,
  onSkip,
}: {
  current: TourStep
  step: number
  isFirst: boolean
  isLast: boolean
  onBack: () => void
  onNext: () => void
  onSkip: () => void
}) {
  return (
    <>
      {/* Close button */}
      <button
        onClick={onSkip}
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Skip tour"
      >
        <X className="size-4" />
      </button>

      {/* Content */}
      <div className="mb-4">
        <h3 className="text-base font-semibold">{current.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {current.description}
        </p>
      </div>

      {/* Step dots + navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-5 bg-primary"
                  : i < step
                    ? "w-1.5 bg-primary/50"
                    : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {!isFirst && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              Back
            </Button>
          )}
          <Button size="sm" onClick={onNext}>
            {isLast ? "Done" : "Next"}
          </Button>
        </div>
      </div>

      {/* Skip link */}
      {!isLast && (
        <button
          onClick={onSkip}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Skip tour
        </button>
      )}
    </>
  )
}
