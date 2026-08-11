"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function createDebtReminder(customerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !customerId) return { error: "Not authenticated" }
  const { data: organizationId } = await supabase.rpc("get_or_create_current_organization")
  if (!organizationId) return { error: "Shop could not be initialized" }
  const [{ data: customer }, { data: members }] = await Promise.all([
    supabase.from("customers").select("name").eq("id", customerId).eq("organization_id", organizationId).single(),
    supabase.from("organization_members").select("user_id").eq("organization_id", organizationId).eq("is_active", true),
  ])
  if (!customer) return { error: "Customer not found" }
  const rows = (members ?? []).map((member) => ({ organization_id: organizationId, user_id: member.user_id, type: "debt_reminder", title: "Debt reminder requested", body: `Follow up with ${customer.name} about their outstanding balance.` }))
  if (rows.length) {
    const { error } = await supabase.from("notifications").insert(rows)
    if (error) return { error: "Could not create reminder" }
  }
  revalidatePath("/dashboard/notifications")
  return { success: true }
}
