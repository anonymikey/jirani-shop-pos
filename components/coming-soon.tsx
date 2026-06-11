import { Construction } from "lucide-react"

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-20 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Construction className="size-6" />
        </span>
        <h2 className="text-lg font-semibold">Coming soon</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          This module is part of the JIRANI roadmap and will be available in an upcoming build.
        </p>
      </div>
    </div>
  )
}
