import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { SyncStatus } from "@/components/sync-status"
import { NotificationBell } from "@/components/notification-bell"
import { OnboardingTour } from "@/components/onboarding/onboarding-tour"
import { WhatsNew } from "@/components/onboarding/whats-new"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/auth/login?error=supabase-not-configured")
  }
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
    redirect("/?error=organization-not-found")
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
    redirect("/?error=organization-access")
  }
  if (membership.is_active === false) redirect("/auth/login?error=account-disabled")
  const [{ data: profile }, { count: unreadNotifications }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
  ])

  return (
    <SidebarProvider>
      <AppSidebar
        name={profile?.full_name ?? ""}
        email={user.email ?? ""}
        role={membership.role ?? "cashier"}
        unreadNotifications={unreadNotifications ?? 0}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-5" />
          <span className="text-sm font-medium text-muted-foreground">
            {new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}
          </span>
          <div className="ml-auto flex items-center gap-2"><SyncStatus /><NotificationBell initialCount={unreadNotifications ?? 0} /></div>
        </header>
        <div className="flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
      <WhatsNew />
      <OnboardingTour />
    </SidebarProvider>
  )
}
