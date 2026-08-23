"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/brand-mark"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ArrowRight, Menu } from "lucide-react"

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "/auth/login", label: "Sign In" },
]

export function LandingHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="landing-header">
      <BrandMark compact />

      {/* Desktop nav — hidden on small screens */}
      <nav className="landing-nav hidden md:flex">
        {navLinks.map((link) => (
          <a key={link.href} href={link.href} className="landing-nav-item">
            {link.label}
          </a>
        ))}
      </nav>

      {/* Desktop CTA — hidden on small screens */}
      <Button asChild className="landing-cta-btn hidden md:inline-flex">
        <Link href="/auth/login">
          Open My Shop <ArrowRight className="size-4" />
        </Link>
      </Button>

      {/* Mobile hamburger — visible only on small screens */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={<Button variant="ghost" size="icon" className="landing-hamburger md:hidden" aria-label="Open menu" />}
        >
          <Menu className="size-5 text-white" />
        </SheetTrigger>
        <SheetContent side="right" className="landing-mobile-menu w-72 sm:w-80" showCloseButton>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <nav className="flex flex-col gap-1 mt-10">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="landing-mobile-nav-item"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-6 px-1">
            <Button asChild className="landing-cta-btn w-full">
              <Link href="/auth/login" onClick={() => setOpen(false)}>
                Open My Shop <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
