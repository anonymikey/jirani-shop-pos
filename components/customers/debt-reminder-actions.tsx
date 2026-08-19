"use client"

import { Button } from "@/components/ui/button"
import { MessageCircle, Smartphone } from "lucide-react"

export function DebtReminderActions({ name, phone, balance }: { name: string; phone?: string | null; balance: number }) {
  const message = `Hello ${name}, your outstanding balance at JIRANI is KES ${balance.toFixed(2)}. Please contact the shop to arrange payment.`
  const encodedMessage = encodeURIComponent(message)
  const normalizedPhone = (phone ?? "").replace(/[^\d+]/g, "")
  const whatsappHref = normalizedPhone ? `https://wa.me/${normalizedPhone.replace(/^\+/, "")}?text=${encodedMessage}` : undefined
  const smsHref = normalizedPhone ? `sms:${normalizedPhone}?body=${encodedMessage}` : undefined

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild type="button" size="sm" variant="outline" disabled={!whatsappHref}>
        <a href={whatsappHref ?? "#"} target="_blank" rel="noreferrer"><MessageCircle data-icon="inline-start" /> WhatsApp</a>
      </Button>
      <Button asChild type="button" size="sm" variant="outline" disabled={!smsHref}>
        <a href={smsHref ?? "#"}><Smartphone data-icon="inline-start" /> SMS</a>
      </Button>
      {!normalizedPhone && <span className="self-center text-xs text-muted-foreground">Add a phone number to enable reminders.</span>}
    </div>
  )
}
