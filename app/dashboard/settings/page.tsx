import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { updateMemberRole, updateMemberStatus, updateRegistrationAccess } from "@/app/actions/access"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ShieldAlert, ShieldCheck } from "lucide-react"
import { AppearanceSettings } from "@/components/appearance-settings"

const ERROR_MESSAGES: Record<string, string> = {
  "last-admin": "That change is blocked: it would leave the shop without an active admin.",
  "owner-protected": "The shop owner account cannot be deactivated or demoted.",
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")
  const { data: organizationId } = await supabase.rpc("get_or_create_current_organization")
  const [{ data: settings }, { data: members }] = await Promise.all([
    organizationId ? supabase.from("organization_settings").select("allow_new_user_registration").eq("organization_id", organizationId).maybeSingle() : Promise.resolve({ data: null }),
    organizationId ? supabase.from("organization_members").select("user_id, role, is_active, created_at").eq("organization_id", organizationId).order("created_at") : Promise.resolve({ data: [] }),
  ])
  const ids = (members ?? []).map((member) => member.user_id)
  const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] }
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]))

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Control staff access and account registration for this shop.</p>
      </div>

      {error && ERROR_MESSAGES[error] && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <ShieldAlert className="size-5 shrink-0" />
          <span>{ERROR_MESSAGES[error]}</span>
        </div>
      )}

      <AppearanceSettings />

      <Card>
        <CardHeader><CardTitle>Account registration</CardTitle><CardDescription>Keep this off unless your team should be able to create accounts. The rule is enforced by the database, not just hidden in the interface.</CardDescription></CardHeader>
        <CardContent>
          <form action={updateRegistrationAccess} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid gap-1"><Label htmlFor="registration">Allow new registrations</Label><select id="registration" name="allow_new_user_registration" defaultValue={settings?.allow_new_user_registration ? "true" : "false"} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="false">Closed</option><option value="true">Open</option></select></div>
            <Button type="submit">Save access setting</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Team members</CardTitle><CardDescription>Deactivated staff can no longer sign in. The shop owner account is always protected.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(members ?? []).length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No team members yet.</p>}
          {(members ?? []).map((member) => {
            const isOwner = member.role === "owner"
            const isSelf = member.user_id === user?.id
            return (
              <div key={member.user_id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  {isOwner && <ShieldCheck className="size-4 shrink-0 text-primary" />}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{profileMap.get(member.user_id) || (isSelf ? user.email : "Team member")}</p>
                    <p className="text-xs text-muted-foreground">{isSelf ? "You" : member.is_active ? "Active staff account" : "Deactivated account"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={updateMemberRole} className="flex gap-2">
                    <input type="hidden" name="user_id" value={member.user_id} />
                    <select name="role" defaultValue={member.role} disabled={isOwner} className="h-9 rounded-md border border-input bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="cashier">Cashier</option>
                      <option value="accountant">Accountant</option>
                    </select>
                    <Button type="submit" variant="outline" disabled={isOwner}>Update</Button>
                  </form>
                  <form action={updateMemberStatus}>
                    <input type="hidden" name="user_id" value={member.user_id} />
                    <input type="hidden" name="is_active" value={member.is_active ? "false" : "true"} />
                    <Button type="submit" variant="ghost" disabled={isOwner || isSelf}>{member.is_active ? "Deactivate" : "Activate"}</Button>
                  </form>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
