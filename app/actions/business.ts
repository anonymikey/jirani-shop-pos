"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { notifyOrganization } from "@/app/actions/notification-events"

async function context() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" as const }
  const { data: organizationId, error } = await supabase.rpc("get_or_create_current_organization")
  if (error || !organizationId) return { error: "Shop could not be initialized" as const }
  return { supabase, user, organizationId }
}

export async function createCustomer(input: { name: string; phone?: string; email?: string; creditLimit?: number }) {
  const result = await context()
  if ("error" in result) return result
  if (!input.name.trim()) return { error: "Customer name is required" }
  const { error } = await result.supabase.from("customers").insert({ user_id: result.user.id, organization_id: result.organizationId, name: input.name.trim(), phone: input.phone?.trim() || null, email: input.email?.trim() || null, credit_limit: Math.max(0, Number(input.creditLimit) || 0), balance: 0 })
  if (error) return { error: "Could not create customer" }
  revalidatePath("/dashboard/customers")
  revalidatePath("/dashboard/debtors")
  await notifyOrganization({ organizationId: result.organizationId, type: "customer_created", title: "Customer added", body: `${input.name.trim()} was added to customer accounts.` })
  return { success: true }
}

export async function createExpense(input: { category: string; description?: string; amount: number; expenseDate?: string }) {
  const result = await context()
  if ("error" in result) return result
  if (!input.category.trim() || !Number.isFinite(input.amount) || input.amount <= 0) return { error: "Enter a category and positive amount" }
  const { error } = await result.supabase.from("expenses").insert({ organization_id: result.organizationId, category: input.category.trim(), description: input.description?.trim() || null, amount: input.amount, expense_date: input.expenseDate || undefined, created_by: result.user.id })
  if (error) return { error: "Could not record expense" }
  revalidatePath("/dashboard/expenses")
  revalidatePath("/dashboard/reports")
  await notifyOrganization({ organizationId: result.organizationId, type: "expense_recorded", title: "Expense recorded", body: `${input.category.trim()} expense of KSh ${input.amount.toLocaleString("en-KE")} was recorded.` })
  return { success: true }
}
