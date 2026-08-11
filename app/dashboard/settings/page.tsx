import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { updateMemberRole, updateMemberStatus, updateRegistrationAccess } from "@/app/actions/access"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default async function SettingsPage() {
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
      <Card>
        <CardHeader><CardTitle>Account registration</CardTitle><CardDescription>Keep this off unless your team should be able to create accounts.</CardDescription></CardHeader>
        <CardContent>
          <form action={updateRegistrationAccess} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid gap-1"><Label htmlFor="registration">Allow new registrations</Label><select id="registration" name="allow_new_user_registration" defaultValue={settings?.allow_new_user_registration ? "true" : "false"} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="false">Closed</option><option value="true">Open</option></select></div>
            <Button type="submit">Save access setting</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Team members</CardTitle><CardDescription>Roles are enforced by the database, not just hidden in the interface.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(members ?? []).map((member) => (
            <div key={member.user_id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-medium">{profileMap.get(member.user_id) || (member.user_id === user?.id ? user.email : "Team member")}</p><p className="text-xs text-muted-foreground">{member.user_id === user?.id ? "You" : member.is_active ? "Active staff account" : "Deactivated account"}</p></div>
              <div className="flex flex-wrap gap-2"><form action={updateMemberRole} className="flex gap-2"><input type="hidden" name="user_id" value={member.user_id} /><select name="role" defaultValue={member.role} className="h-9 rounded-md border border-input bg-background px-2 text-sm"><option value="admin">Admin</option><option value="manager">Manager</option><option value="cashier">Cashier</option><option value="accountant">Accountant</option></select><Button type="submit" variant="outline">Update</Button></form><form action={updateMemberStatus}><input type="hidden" name="user_id" value={member.user_id} /><input type="hidden" name="is_active" value={member.is_active ? "false" : "true"} /><Button type="submit" variant="ghost" disabled={member.user_id === user?.id}>{member.is_active ? "Deactivate" : "Activate"}</Button></form></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
