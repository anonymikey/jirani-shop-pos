import Image from "next/image"

const logoUrl = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/apple-icon-180x180-zQm6gbophjGA3PqI7UBZJ4VDofV9RR.png"

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Image
      src={logoUrl}
      alt="JIRANI SHOP SYSTEM"
      width={compact ? 44 : 180}
      height={compact ? 44 : 180}
      className={compact ? "size-9 rounded-md object-cover" : "h-20 w-40 object-contain"}
      priority
    />
  )
}

export { logoUrl }
