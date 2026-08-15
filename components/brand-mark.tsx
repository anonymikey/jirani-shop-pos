import Image from "next/image"
import Link from "next/link"

const logoUrl = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/apple-icon-precomposed-qrgd3AxrKIiVpa2oKuWcLeTI3FrYzx.png"

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Go to JIRANI SHOP SYSTEM home"
      className="flex min-w-0 shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Image
        src={logoUrl}
        alt="JIRANI SHOP SYSTEM"
        width={compact ? 220 : 520}
        height={compact ? 110 : 260}
        sizes={compact ? "(max-width: 640px) 150px, 220px" : "(max-width: 640px) 240px, 520px"}
        className={compact ? "h-auto max-h-14 w-[min(52vw,220px)] object-contain" : "h-auto w-full max-w-[520px] object-contain"}
        priority
      />
    </Link>
  )
}

export { logoUrl }
