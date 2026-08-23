"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

async function adminContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" as const }
  const { data: organizationId, error } = await supabase.rpc("get_or_create_current_organization")
  if (error || !organizationId) return { error: "Shop could not be initialized" as const }
  const { data: member } = await supabase.from("organization_members").select("role").eq("organization_id", organizationId).eq("user_id", user.id).single()
  if (!member || !["owner", "admin", "manager"].includes(member.role)) return { error: "Only an admin or manager can change access" as const }
  return { supabase, user, organizationId }
}

/** True when the target member is the last active owner/admin of the shop. */
async function isLastActiveAdmin(supabase: Awaited<ReturnType<typeof createClient>>, organizationId: string, userId: string) {
  const { data: rows } = await supabase
    .from("organization_members")
    .select("user_id, role, is_active")
    .eq("organization_id", organizationId)
    .in("role", ["owner", "admin"])
  const active = (rows ?? []).filter((m) => m.is_active)
  const target = active.find((m) => m.user_id === userId)
  if (!target) return false
  return active.length <= 1
}

export async function requireManager() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" as const }
  const { data: organizationId, error } = await supabase.rpc("get_or_create_current_organization")
  if (error || !organizationId) return { error: "Shop could not be initialized" as const }
  const { data: member } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()
  if (!member || !["owner", "admin", "manager", "accountant"].includes(member.role)) {
    return { error: "Only a manager can perform this action" as const }
  }
  return { supabase, user, organizationId }
}

export async function updateRegistrationAccess(formData: FormData) {
  const result = await adminContext()
  if ("error" in result) return

  const enabled = formData.get("allow_new_user_registration") === "true"
  const { error } = await result.supabase.from("organization_settings").upsert({ organization_id: result.organizationId, allow_new_user_registration: enabled, updated_at: new Date().toISOString() })
  if (error) return
  revalidatePath("/dashboard/settings")
}

export async function updateMemberStatus(formData: FormData) {
  const result = await adminContext()
  if ("error" in result) return
  const userId = String(formData.get("user_id") || "")
  const isActive = formData.get("is_active") === "true"
  if (!userId || userId === result.user.id) return

  const { data: target } = await result.supabase
    .from("organization_members")
    .select("role, is_active")
    .eq("organization_id", result.organizationId)
    .eq("user_id", userId)
    .single()
  if (!target) return

  // Owners can never be deactivated by another account.
  if (target.role === "owner") {
    redirect("/dashboard/settings?error=owner-protected")
  }
  // Never deactivate the last active owner/admin — that would lock the shop out.
  if (target.is_active && !isActive && await isLastActiveAdmin(result.supabase, result.organizationId, userId)) {
    redirect("/dashboard/settings?error=last-admin")
  }

  const { error } = await result.supabase.from("organization_members").update({ is_active: isActive }).eq("organization_id", result.organizationId).eq("user_id", userId)
  if (error) return
  revalidatePath("/dashboard/settings")
}

export async function updateMemberRole(formData: FormData) {
  const result = await adminContext()
  if ("error" in result) return

  const userId = String(formData.get("user_id") || "")
  const role = String(formData.get("role") || "cashier")
  if (!userId || !["admin", "manager", "cashier", "accountant"].includes(role)) return

  const { data: target } = await result.supabase
    .from("organization_members")
    .select("role, is_active")
    .eq("organization_id", result.organizationId)
    .eq("user_id", userId)
    .single()
  if (!target) return

  // Owners cannot be demoted.
  if (target.role === "owner" && role !== "owner") {
    redirect("/dashboard/settings?error=owner-protected")
  }
  // Demoting the last active owner/admin away from admin would lock the shop out.
  if (target.role !== "owner" && role !== "admin" && await isLastActiveAdmin(result.supabase, result.organizationId, userId)) {
    redirect("/dashboard/settings?error=last-admin")
  }

  const { error } = await result.supabase.from("organization_members").update({ role }).eq("organization_id", result.organizationId).eq("user_id", userId)
  if (error) return
  revalidatePath("/dashboard/settings")
}
