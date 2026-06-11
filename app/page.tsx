import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Store, BarChart3, ScanLine, Boxes, Users, ArrowRight } from "lucide-react"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect("/dashboard")

  const features = [
    { icon: ScanLine, title: "Fast POS", desc: "Ring up sales in seconds with cash, M-Pesa, card or credit." },
    { icon: Boxes, title: "Inventory", desc: "Track stock levels, costs and reorder alerts in real time." },
    { icon: BarChart3, title: "Analytics", desc: "See revenue, profit and best sellers at a glance." },
    { icon: Users, title: "Customers", desc: "Manage customer accounts, balances and loyalty." },
  ]

  return (
    <main className="flex min-h-svh flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">JIRANI SYSTEM</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/auth/sign-up">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto flex max-w-5xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-4 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          Smart retail management for Kenyan businesses
        </span>
        <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">Run your shop with confidence</h1>
        <p className="mt-4 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          JIRANI SYSTEM brings point of sale, inventory, customers and analytics together in one fast, reliable
          dashboard built for modern retailers.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/auth/sign-up">
              Start free <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </div>

        <div className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-5 text-left">
              <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-6 text-center text-sm text-muted-foreground">
        {"\u00A9"} {new Date().getFullYear()} JIRANI SYSTEM. All rights reserved.
      </footer>
    </main>
  )
}
