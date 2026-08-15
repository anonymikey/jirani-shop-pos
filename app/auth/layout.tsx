import { BrandMark } from "@/components/brand-mark"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <BrandMark compact />
        {children}
      </div>
    </main>
  )
}
