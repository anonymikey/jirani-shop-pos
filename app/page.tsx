import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { BarChart3, ScanLine, Boxes, Users, ArrowRight, Zap, Shield, Smartphone, TrendingUp } from "lucide-react"
import { BrandMark } from "@/components/brand-mark"
import { AnimatedBubbles } from "@/components/landing/animated-bubbles"

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
    { icon: ScanLine, title: "Lightning Fast POS", desc: "Ring up sales in seconds. Cash, M-Pesa, card or credit — every payment method your customers prefer." },
    { icon: Boxes, title: "Smart Inventory", desc: "Track stock levels, costs and reorder alerts in real time. Never run out of best sellers." },
    { icon: BarChart3, title: "Live Analytics", desc: "See revenue, profit and best sellers at a glance. Data-driven decisions for your business." },
    { icon: Users, title: "Customer Accounts", desc: "Manage customer accounts, balances, credit limits and loyalty — all in one place." },
  ]

  const stats = [
    { value: "10K+", label: "Sales Processed" },
    { value: "99.9%", label: "Uptime" },
    { value: "< 1s", label: "Checkout Speed" },
    { value: "24/7", label: "Offline Ready" },
  ]

  return (
    <main className="landing-page">
      <AnimatedBubbles />

      {/* Header */}
      <header className="landing-header">
        <BrandMark compact />
        <nav className="landing-nav">
          <Link href="#features" className="landing-nav-item">Features</Link>
          <Link href="#how-it-works" className="landing-nav-item">How It Works</Link>
          <Link href="/auth/login" className="landing-nav-item">Sign In</Link>
        </nav>
        <Button asChild className="landing-cta-btn">
          <Link href="/auth/sign-up">
            Get Started Free <ArrowRight className="size-4" />
          </Link>
        </Button>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-badge">
          <Zap className="size-3" />
          <span>Smart Retail for Kenya</span>
        </div>

        <h1 className="landing-hero-title">
          Run Your Shop
          <br />
          <span className="landing-hero-title-accent">With Confidence</span>
        </h1>

        <p className="landing-hero-desc">
          JIRANI SYSTEM brings point of sale, inventory, customers and analytics
          together in one fast, reliable dashboard built for modern retailers.
        </p>

        <div className="landing-hero-actions">
          <Button asChild size="lg" className="landing-primary-btn">
            <Link href="/auth/sign-up">
              Start Free Today
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="landing-secondary-btn">
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="landing-stats">
          {stats.map((stat) => (
            <div key={stat.label} className="landing-stat">
              <span className="landing-stat-value">{stat.value}</span>
              <span className="landing-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="landing-features">
        <div className="landing-section-badge">
          <span>Features</span>
        </div>
        <h2 className="landing-section-title">
          Everything You Need
          <br />
          <span className="landing-section-title-accent">To Run Your Shop</span>
        </h2>
        <p className="landing-section-desc">
          From ringing up sales to tracking inventory — JIRANI SYSTEM handles it all.
        </p>

        <div className="landing-features-grid">
          {features.map((f, i) => (
            <div key={f.title} className="landing-feature-card" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="landing-feature-icon">
                <f.icon className="size-6" />
              </div>
              <h3 className="landing-feature-title">{f.title}</h3>
              <p className="landing-feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="landing-how">
        <div className="landing-section-badge">
          <span>How It Works</span>
        </div>
        <h2 className="landing-section-title">
          Up and Running
          <br />
          <span className="landing-section-title-accent">In Three Steps</span>
        </h2>

        <div className="landing-steps">
          <div className="landing-step">
            <div className="landing-step-number">01</div>
            <h3 className="landing-step-title">Create Account</h3>
            <p className="landing-step-desc">Sign up in seconds. No credit card required.</p>
          </div>
          <div className="landing-step-connector" />
          <div className="landing-step">
            <div className="landing-step-number">02</div>
            <h3 className="landing-step-title">Add Products</h3>
            <p className="landing-step-desc">Import your inventory or add products on the fly.</p>
          </div>
          <div className="landing-step-connector" />
          <div className="landing-step">
            <div className="landing-step-number">03</div>
            <h3 className="landing-step-title">Start Selling</h3>
            <p className="landing-step-desc">Ring up sales, track revenue, grow your business.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta-section">
        <h2 className="landing-cta-title">
          Ready to Transform
          <br />
          <span className="landing-cta-title-accent">Your Business?</span>
        </h2>
        <p className="landing-cta-desc">
          Join thousands of Kenyan retailers using JIRANI SYSTEM to run smarter, faster shops.
        </p>
        <Button asChild size="lg" className="landing-primary-btn">
          <Link href="/auth/sign-up">
            Get Started Free
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <BrandMark compact />
            <p className="landing-footer-tagline">Smart retail management for Kenyan businesses.</p>
          </div>
          <div className="landing-footer-links">
            <div className="landing-footer-col">
              <h4>Product</h4>
              <Link href="#features">Features</Link>
              <Link href="#how-it-works">How It Works</Link>
              <Link href="/auth/sign-up">Pricing</Link>
            </div>
            <div className="landing-footer-col">
              <h4>Company</h4>
              <Link href="#">About</Link>
              <Link href="#">Blog</Link>
              <Link href="#">Contact</Link>
            </div>
            <div className="landing-footer-col">
              <h4>Support</h4>
              <Link href="#">Help Center</Link>
              <Link href="#">Terms</Link>
              <Link href="#">Privacy</Link>
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <p>{"\u00A9"} {new Date().getFullYear()} JIRANI SYSTEM. All rights reserved.</p>
          <p className="text-xs opacity-60">Curated with <span aria-label="love">❤️</span> by ANONYMIKETECH SYSTEMS</p>
        </div>
      </footer>
    </main>
  )
}
