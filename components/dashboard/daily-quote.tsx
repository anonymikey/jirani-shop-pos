"use client"

import { useEffect, useState, useMemo } from "react"
import { Sparkles } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const quotes = [
  { text: "Every sale is a step forward. Keep going, your hard work is building something great.", author: "Jirani Wisdom" },
  { text: "A good shopkeeper knows every customer by name. That's your superpower.", author: "Jirani Wisdom" },
  { text: "Today is full of possibilities. Open those doors and make it count.", author: "Jirani Wisdom" },
  { text: "Your shop is more than a business — it's the heartbeat of your community.", author: "Jirani Wisdom" },
  { text: "Small sales add up to big dreams. Trust the process.", author: "Jirani Wisdom" },
  { text: "The best time to grow your business was yesterday. The second best time is today.", author: "Jirani Wisdom" },
  { text: "Your dedication today builds the success of tomorrow. Keep pushing.", author: "Jirani Wisdom" },
  { text: "Great businesses aren't built overnight — they're built one顾客 at a time.", author: "Jirani Wisdom" },
  { text: "Every problem is a sign that you're growing. Embrace the challenge.", author: "Jirani Wisdom" },
  { text: "The shelves are stocked, the doors are open — now go make magic happen.", author: "Jirani Wisdom" },
  { text: "Your customers trust you with their hard-earned money. That's an honor. Deliver value.", author: "Jirani Wisdom" },
  { text: "Revenue is vanity, profit is sanity, but cash flow is reality. Keep your eye on all three.", author: "Jirani Wisdom" },
  { text: "A well-managed shop runs itself. You're already ahead by being here.", author: "Jirani Wisdom" },
  { text: "Today's effort is tomorrow's profit. Give it your best.", author: "Jirani Wisdom" },
  { text: "You didn't come this far to only come this far. Keep going!", author: "Jirani Wisdom" },
  { text: "The road to success is always under construction. Enjoy the journey.", author: "Jirani Wisdom" },
  { text: "Your shop, your rules, your success. Own every decision.", author: "Jirani Wisdom" },
  { text: "Consistency beats intensity. Show up every day and do the work.", author: "Jirani Wisdom" },
  { text: "Behind every great shop is a great shopkeeper. That's you.", author: "Jirani Wisdom" },
  { text: "Sales today, savings tomorrow, freedom someday. It all starts now.", author: "Jirani Wisdom" },
  { text: "Difficult roads often lead to beautiful destinations. Keep your head up.", author: "Jirani Wisdom" },
  { text: "Your business is your legacy. Make it something you're proud of.", author: "Jirani Wisdom" },
  { text: "A positive attitude brings positive results. Start this day with a smile.", author: "Jirani Wisdom" },
  { text: "Stock management is self-care for your business. Stay sharp.", author: "Jirani Wisdom" },
  { text: "The secret to getting ahead is getting started. You're already here.", author: "Jirani Wisdom" },
  { text: "Every receipt you print is proof that you're making it happen.", author: "Jirani Wisdom" },
  { text: "Your energy sets the tone for your shop. Make it contagious.", author: "Jirani Wisdom" },
  { text: "Challenges are what make life interesting. Overcoming them is what makes life meaningful.", author: "Jirani Wisdom" },
  { text: "Don't count the days. Make the days count. Sell well today!", author: "Jirani Wisdom" },
  { text: "Invest in yourself. Your shop will thank you for it.", author: "Jirani Wisdom" },
  { text: "Winners are not people who never fail, but people who never quit. Keep selling.", author: "Jirani Wisdom" },
]

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}

export function DailyQuote() {
  const [visible, setVisible] = useState(false)

  const quote = useMemo(() => {
    const dayIndex = getDayOfYear(new Date()) % quotes.length
    return quotes[dayIndex]
  }, [])

  useEffect(() => {
    const timer = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(timer)
  }, [])

  return (
    <Card
      className={`relative overflow-hidden border-primary/20 bg-primary/[0.04] transition-all duration-700 ease-out ${
        visible ? "daily-quote-splash" : "daily-quote-hidden"
      }`}
    >
      {/* Decorative left accent */}
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary/60 via-primary to-primary/60" />

      {/* Subtle background shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] via-transparent to-primary/[0.03] animate-[shimmer_3s_ease-in-out_infinite]" />

      <CardContent className="relative flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary daily-quote-icon-pulse">
            <Sparkles className="size-5" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-primary/90 uppercase tracking-wide">
              Daily Inspiration
            </p>
            <blockquote className="max-w-2xl text-sm leading-6 text-muted-foreground italic">
              &ldquo;{quote.text}&rdquo;
            </blockquote>
            <p className="mt-0.5 text-xs text-muted-foreground/70">
              &mdash; {quote.author}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
