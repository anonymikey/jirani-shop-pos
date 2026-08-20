"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { notifyOrganization } from "@/app/actions/notification-events"

export async function voidSale(input: { saleId: string; reason?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }
  const { data: organizationId, error: orgError } = await supabase.rpc("get_or_create_current_organization")
  if (orgError || !organizationId) return { error: "Shop could not be initialized" }
  const { data, error } = await supabase.rpc("void_sale", { payload: { organization_id: organizationId, sale_id: input.saleId, reason: input.reason } })
  if (error) return { error: error.message || "Could not void sale" }
  revalidatePath("/dashboard/sales")
  revalidatePath("/dashboard/reports")
  revalidatePath("/dashboard")
  await notifyOrganization({ organizationId, type: "sale_voided", title: "Sale voided", body: "A sale was voided and its stock was restored." })
  return { success: true, data }
}
