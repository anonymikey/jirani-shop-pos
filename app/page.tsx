import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { BarChart3, ScanLine, Boxes, Users, ArrowRight, CircleCheck, Activity, ReceiptText, TriangleAlert, Smartphone, ChevronRight } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"

export default async function HomePage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) redirect("/dashboard")
  }

  const features = [
    { icon: ScanLine, title: "Checkout that moves", desc: "Ring up cash, M-Pesa, card or credit without slowing the counter." },
    { icon: Boxes, title: "Stock you can trust", desc: "Know what is moving, what is low and what to reorder next." },
    { icon: Users, title: "Customers remembered", desc: "Keep customer accounts, credit balances and payment history together." },
    { icon: BarChart3, title: "A clearer day", desc: "See revenue, profit and best sellers before you close the shop." },
  ]

  return (
    <main className="landing-shell min-h-svh overflow-hidden bg-background text-foreground">
      <header className="landing-header mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-10">
        <BrandMark compact />
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="size-2 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]" /> Shop operations, simplified</span>
          <Button asChild variant="outline" size="sm"><Link href="/auth/login">Open the POS <ArrowRight className="size-3.5" /></Link></Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-20 pt-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:pb-28 lg:pt-16">
        <div className="landing-reveal max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"><Activity className="size-3.5" /> Live shop control for one busy counter</div>
          <h1 className="text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.05em] sm:text-6xl lg:text-8xl">Your shop. <span className="text-primary">In rhythm.</span></h1>
          <p className="mt-7 max-w-xl text-pretty text-lg leading-8 text-muted-foreground">JIRANI is the modern POS workspace for running a real shop: sell quickly, protect your stock, remember every customer and finish the day with confidence.</p>
          <div className="mt-9 flex flex-wrap items-center gap-3"><Button asChild size="lg" className="landing-button"><Link href="/auth/login">Enter your workspace <ChevronRight className="size-4" /></Link></Button><Button asChild size="lg" variant="ghost"><Link href="/auth/sign-up">Create shop access</Link></Button></div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground"><span className="flex items-center gap-2"><CircleCheck className="size-4 text-primary" /> Built for daily trade</span><span className="flex items-center gap-2"><CircleCheck className="size-4 text-primary" /> Cash, M-Pesa & credit</span><span className="flex items-center gap-2"><CircleCheck className="size-4 text-primary" /> Less paperwork</span></div>
        </div>

        <div className="landing-reveal landing-reveal-delay relative" aria-label="JIRANI shop operations preview">
          <div className="landing-grid absolute -inset-10 opacity-40" />
          <div className="landing-pulse absolute -right-4 top-10 size-24 rounded-full bg-primary/20 blur-2xl" />
          <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-card p-3 shadow-2xl shadow-primary/10 sm:p-5">
            <div className="flex items-center justify-between border-b border-border px-2 pb-4"><div className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-primary" /><span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Shop pulse / today</span></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">Live</span></div>
            <div className="grid gap-3 pt-4 sm:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-2xl bg-background p-5"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">Today&apos;s sales</p><p className="mt-2 text-4xl font-semibold tracking-tight">KSh 48,260</p></div><div className="rounded-xl bg-primary/15 p-2.5 text-primary"><BarChart3 className="size-5" /></div></div><div className="mt-8 flex h-28 items-end gap-1.5">{[35,48,42,65,56,78,62,92,75,86,68,100].map((height, index) => <span key={index} className="landing-bar flex-1 rounded-t-sm bg-primary/70" style={{ height: `${height}%`, animationDelay: `${index * 70}ms` }} />)}</div><div className="mt-3 flex justify-between text-[11px] text-muted-foreground"><span>8:00 AM</span><span>Now</span></div></div>
              <div className="flex flex-col gap-3"><div className="rounded-2xl border border-border bg-background p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><ReceiptText className="size-4 text-primary" /> Latest receipt</div><p className="mt-3 font-mono text-sm">#JR-94303332</p><div className="mt-3 flex justify-between text-sm"><span>4 items</span><span className="font-semibold">KSh 1,660</span></div><div className="mt-3 h-1 overflow-hidden rounded-full bg-primary/15"><span className="block h-full w-4/5 rounded-full bg-primary" /></div></div><div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4"><div className="flex items-center gap-2 text-xs font-medium text-amber-200"><TriangleAlert className="size-4" /> Stock attention</div><p className="mt-2 text-sm text-muted-foreground">Cooking oil is below reorder level.</p><span className="mt-3 inline-block text-xs font-medium text-amber-200">Review inventory <ArrowRight className="ml-1 inline size-3" /></span></div></div>
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-xs text-muted-foreground"><span className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary"><Smartphone className="size-3.5" /></span><span><strong className="font-medium text-foreground">M-Pesa payment received</strong><br />Till synced just now</span><span className="ml-auto font-mono text-primary">+ KSh 850</span></div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card/40"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 text-xs uppercase tracking-[0.16em] text-muted-foreground lg:px-10"><span>One workspace for</span><span className="flex items-center gap-2"><ScanLine className="size-4 text-primary" /> Sales</span><span className="flex items-center gap-2"><Boxes className="size-4 text-primary" /> Stock</span><span className="flex items-center gap-2"><Users className="size-4 text-primary" /> Customers</span><span className="flex items-center gap-2"><BarChart3 className="size-4 text-primary" /> Insight</span></div></section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-10 lg:py-28"><div className="max-w-2xl"><p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">The counter, clarified</p><h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">The important things stay close.</h2><p className="mt-5 text-lg leading-8 text-muted-foreground">No scattered notebooks. No guessing what sold. Just a calm operating view for the moments that keep your shop moving.</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{features.map((f, index) => <div key={f.title} className="landing-feature group border-t border-border pt-5" style={{ animationDelay: `${index * 100}ms` }}><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:-translate-y-1"><f.icon className="size-5" /></span><h3 className="mt-5 font-semibold">{f.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{f.desc}</p></div>)}</div></section>

      <footer className="border-t border-border px-5 py-10 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><BrandMark compact /><p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">A smarter daily rhythm for independent shops and the people who keep them running.</p></div><div className="text-left text-sm text-muted-foreground sm:text-right"><p>{"\u00A9"} {new Date().getFullYear()} JIRANI SYSTEM</p><p className="mt-1 text-xs">Designed for the next sale.</p></div></div></footer>
    </main>
  )
}
