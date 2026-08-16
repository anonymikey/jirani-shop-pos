"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function recordCustomerPayment(input: { customerId: string; amount: number; method: "cash" | "card" | "mobile_money" | "bank_transfer"; reference?: string; idempotencyKey?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }
  if (!input.customerId || !Number.isFinite(input.amount) || input.amount <= 0) return { error: "Enter a positive payment amount" }
  const { data: organizationId, error: orgError } = await supabase.rpc("get_or_create_current_organization")
  if (orgError || !organizationId) return { error: "Shop could not be initialized" }
  const { data, error } = await supabase.rpc("record_customer_payment", {
    payload: {
      organization_id: organizationId,
      customer_id: input.customerId,
      amount: input.amount,
      method: input.method,
      reference: input.reference?.trim() || null,
      idempotency_key: input.idempotencyKey ?? crypto.randomUUID(),
    },
  })
  if (error || !data) return { error: error?.message?.toLowerCase().includes("exceeds") ? "Payment exceeds the outstanding balance" : "Could not record payment" }
  revalidatePath("/dashboard/customers")
  revalidatePath("/dashboard")
  return { success: true }
}
