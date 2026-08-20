"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

type NotificationInput = { type: string; title: string; body: string }

export async function notifyOrganization(input: NotificationInput & { organizationId: string }) {
  try {
    const supabase = await createClient()
    const { data: members } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", input.organizationId)
      .eq("is_active", true)
    if (members?.length) {
      await supabase.from("notifications").insert(members.map((member) => ({
        organization_id: input.organizationId,
        user_id: member.user_id,
        type: input.type,
        title: input.title,
        body: input.body,
      })))
      revalidatePath("/dashboard/notifications")
    }
  } catch {
    // Activity logging must never block the business action.
  }
}

export async function getUnreadNotificationCount() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0
    const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null)
    return count ?? 0
  } catch {
    return 0
  }
}

export async function markAllNotificationsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null)
  revalidatePath("/dashboard/notifications")
  revalidatePath("/dashboard")
  return { success: true }
}
