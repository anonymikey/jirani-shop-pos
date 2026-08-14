import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { SyncStatus } from "@/components/sync-status"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: organizationId, error: organizationError } = await supabase.rpc("get_or_create_current_organization")
  if (organizationError) {
    console.error("[v0] Failed to resolve the current organization", {
      userId: user.id,
      error: organizationError.message,
    })
    throw new Error("Unable to resolve the current organization")
  }
  if (!organizationId) {
    console.error("[v0] Current organization lookup returned no organization", { userId: user.id })
    throw new Error("Unable to resolve the current organization")
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("role, is_active")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .single()
  if (membershipError) {
    console.error("[v0] Failed to load organization membership", {
      userId: user.id,
      organizationId,
      error: membershipError.message,
    })
    throw new Error("Unable to verify organization membership")
  }
  if (!membership) {
    console.error("[v0] Organization membership was not found", { userId: user.id, organizationId })
    throw new Error("Unable to verify organization membership")
  }
  if (membership.is_active === false) redirect("/auth/login?error=account-disabled")
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()

  return (
    <SidebarProvider>
      <AppSidebar
        name={profile?.full_name ?? ""}
        email={user.email ?? ""}
        role={membership.role ?? "cashier"}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-sm font-medium text-muted-foreground">
            {new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </span>
          <div className="ml-auto"><SyncStatus /></div>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
