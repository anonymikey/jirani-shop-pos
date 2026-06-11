import Link from "next/link"
import { Store } from "lucide-react"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center justify-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">JIRANI SYSTEM</span>
        </Link>
        {children}
      </div>
    </main>
  )
}
