"use client"

import { ArrowUpRight, Code2, MessageCircle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const message = "JIRANI POS is fully functional — sales, inventory, credit management, supplier tracking, reports, and printable receipts. Built for modern retail in East Africa."

export function DeveloperNote() {
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
  return <Card className="relative overflow-hidden border-primary/25 bg-primary/[0.06]"><div className="absolute inset-y-0 left-0 w-1 bg-primary" /><CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex gap-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary motion-safe:animate-pulse"><Code2 className="size-5" /></div><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">A note from the developer</p><span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary"><Sparkles className="size-3" /> Live now</span></div><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">JIRANI POS is fully functional — point of sale, inventory, credit management, supplier tracking, detailed reports, and printable receipts. Built for modern retail in East Africa.</p></div></div><Button asChild variant="outline" className="shrink-0 border-primary/25"><a href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle className="size-4 text-primary" /> Share on WhatsApp <ArrowUpRight className="size-4" /></a></Button></CardContent></Card>
}
