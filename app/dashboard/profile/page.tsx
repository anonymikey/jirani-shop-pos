import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileForm } from "./profile-form"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle()

  return (
    <main className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 border-b border-border pb-6">
        <p className="text-sm font-medium text-primary">Account</p>
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="max-w-2xl text-muted-foreground">Manage the name associated with your JIRANI SYSTEM account.</p>
      </div>
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Personal information</h2>
          <p className="text-sm text-muted-foreground">Your email address is managed by authentication and cannot be changed here.</p>
        </div>
        <div className="mb-6 flex flex-col gap-1 text-sm">
          <span className="font-medium">Email</span>
          <span className="text-muted-foreground">{user.email ?? "—"}</span>
        </div>
        <ProfileForm fullName={profile?.full_name ?? ""} />
      </section>
    </main>
  )
}
