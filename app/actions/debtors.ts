"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function recordCustomerPayment(input: { customerId: string; amount: number; method: "cash" | "card" | "mobile_money" | "bank_transfer"; reference?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }
  if (!input.customerId || !Number.isFinite(input.amount) || input.amount <= 0) return { error: "Enter a positive payment amount" }
  const { data: organizationId, error: orgError } = await supabase.rpc("get_or_create_current_organization")
  if (orgError || !organizationId) return { error: "Shop could not be initialized" }
  const { error } = await supabase.from("payments").insert({ organization_id: organizationId, customer_id: input.customerId, amount: input.amount, method: input.method, reference: input.reference?.trim() || null, received_by: user.id })
  if (error) return { error: "Could not record payment" }
  revalidatePath("/dashboard/customers")
  revalidatePath("/dashboard")
  return { success: true }
}
