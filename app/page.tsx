import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { BarChart3, ScanLine, Boxes, Users, ArrowRight, Zap, Shield, Smartphone, TrendingUp, CreditCard, Clock, ChevronRight } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { AnimatedBubbles } from "@/components/landing/animated-bubbles"
import { ScrollReveal, ParallaxFloat } from "@/components/landing/gsap-scroll-reveal"

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
    { icon: ScanLine, title: "Lightning POS", desc: "Ring up sales in seconds. Cash, M-Pesa, card or credit — every payment your customers prefer." },
    { icon: Boxes, title: "Stock Control", desc: "Track inventory, costs and reorder alerts in real time. Never run out of best sellers." },
    { icon: BarChart3, title: "Live Reports", desc: "Revenue, profit and best sellers at a glance. Data-driven decisions for your shop." },
    { icon: Users, title: "Customer Accounts", desc: "Manage balances, credit limits and loyalty — all from one place." },
    { icon: CreditCard, title: "Credit Management", desc: "Track debts, set due dates, record repayments. Full credit lifecycle in your shop." },
    { icon: Smartphone, title: "Works Offline", desc: "Keep selling even without internet. Transactions sync automatically when you're back online." },
  ]

  return (
    <main className="landing-page">
      <AnimatedBubbles />

      {/* Header */}
      <header className="landing-header">
        <BrandMark compact />
        <nav className="landing-nav">
          <a href="#features" className="landing-nav-item">Features</a>
          <a href="#how-it-works" className="landing-nav-item">How It Works</a>
          <Link href="/auth/login" className="landing-nav-item">Sign In</Link>
        </nav>
        <Button asChild className="landing-cta-btn">
          <Link href="/auth/login">
            Open My Shop <ArrowRight className="size-4" />
          </Link>
        </Button>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-badge" data-reveal>
          <Zap className="size-3" />
          <span>Built for Jirani Enterprises</span>
        </div>

        <h1 className="landing-hero-title" data-reveal>
          One Shop.
          <br />
          <span className="landing-hero-title-accent">One System.</span>
        </h1>

        <p className="landing-hero-desc" data-reveal>
          The complete point of sale and shop management system designed
          for Jirani Enterprises. Sales, inventory, customers, credit tracking
          and analytics — all in one fast, reliable dashboard.
        </p>

        <div className="landing-hero-actions" data-reveal>
          <Button asChild size="lg" className="landing-primary-btn">
            <Link href="/auth/login">
              Open My Shop
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="landing-secondary-btn">
            <a href="#features">See Features</a>
          </Button>
        </div>
      </section>

      {/* Stats */}
      <ScrollReveal>
        <section className="landing-stats-section">
          <div className="landing-stats" data-reveal>
            <div className="landing-stat">
              <span className="landing-stat-value"><TrendingUp className="size-5" /> POS</span>
              <span className="landing-stat-label">Fast checkout</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat-value"><Boxes className="size-5" /> Stock</span>
              <span className="landing-stat-label">Real-time inventory</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat-value"><Users className="size-5" /> Credit</span>
              <span className="landing-stat-label">Debt tracking</span>
            </div>
            <div className="landing-stat">
              <span className="landing-stat-value"><BarChart3 className="size-5" /> Reports</span>
              <span className="landing-stat-label">Daily analytics</span>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Features */}
      <ScrollReveal>
        <section id="features" className="landing-features">
          <div className="landing-section-badge" data-reveal>
            <span>Features</span>
          </div>
          <h2 className="landing-section-title" data-reveal>
            Everything Your Shop
            <br />
            <span className="landing-section-title-accent">Needs in One Place</span>
          </h2>
          <p className="landing-section-desc" data-reveal>
            From ringing up sales to tracking debts — Jirani System handles it all so you can focus on growing your business.
          </p>

          <div className="landing-features-grid">
            {features.map((f, i) => (
              <div key={f.title} className="landing-feature-card" data-reveal style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="landing-feature-icon">
                  <f.icon className="size-6" />
                </div>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* How it works */}
      <ScrollReveal>
        <section id="how-it-works" className="landing-how">
          <div className="landing-section-badge" data-reveal>
            <span>How It Works</span>
          </div>
          <h2 className="landing-section-title" data-reveal>
            Up and Running
            <br />
            <span className="landing-section-title-accent">In Three Steps</span>
          </h2>

          <div className="landing-steps">
            <div className="landing-step" data-reveal>
              <div className="landing-step-number">01</div>
              <h3 className="landing-step-title">Sign In</h3>
              <p className="landing-step-desc">Log into your Jirani Enterprises account. Your shop is already set up.</p>
            </div>
            <div className="landing-step-connector" />
            <div className="landing-step" data-reveal>
              <div className="landing-step-number">02</div>
              <h3 className="landing-step-title">Add Products</h3>
              <p className="landing-step-desc">Load your inventory or add products on the fly from the dashboard.</p>
            </div>
            <div className="landing-step-connector" />
            <div className="landing-step" data-reveal>
              <div className="landing-step-number">03</div>
              <h3 className="landing-step-title">Start Selling</h3>
              <p className="landing-step-desc">Ring up sales, manage credit, track revenue — grow your business daily.</p>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* CTA */}
      <ScrollReveal>
        <section className="landing-cta-section">
          <ParallaxFloat speed={0.1}>
            <h2 className="landing-cta-title" data-reveal>
              Ready to Run Your
              <br />
              <span className="landing-cta-title-accent">Shop Smarter?</span>
            </h2>
          </ParallaxFloat>
          <p className="landing-cta-desc" data-reveal>
            Sign in to Jirani Enterprises and start managing your shop with a system built for modern retail.
          </p>
          <Button asChild size="lg" className="landing-primary-btn" data-reveal>
            <Link href="/auth/login">
              Open My Shop
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </section>
      </ScrollReveal>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <BrandMark compact />
            <p className="landing-footer-tagline">
              Shop management system for Jirani Enterprises. Built for modern retail in East Africa.
            </p>
          </div>
          <div className="landing-footer-links">
            <div className="landing-footer-col">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <Link href="/auth/login">Sign In</Link>
            </div>
            <div className="landing-footer-col">
              <h4>Support</h4>
              <Link href="/auth/login">Help Center</Link>
              <a href="#features">Getting Started</a>
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <p>{"\u00A9"} {new Date().getFullYear()} JIRANI Enterprises. All rights reserved.</p>
          <p className="text-xs opacity-60">Built with care by ANONYMIKETECH SYSTEMS</p>
        </div>
      </footer>
    </main>
  )
}
