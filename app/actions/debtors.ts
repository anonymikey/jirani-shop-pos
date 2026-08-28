"use server"

import { revalidatePath } from "next/cache"
import { getOrganizationContext, hasMinimumRole, invalidRole, isUuid, validMoney } from "@/lib/server/authorization"

type Method = "cash" | "card" | "mobile_money" | "bank_transfer"

export async function createDebtor(input: { name: string; phone?: string; openingAmount: number; dueAt?: string }) {
  const result = await getOrganizationContext()
  if ("error" in result) return result
  if (!hasMinimumRole(result.role, "cashier")) return invalidRole("cashier")
  if (!input.name.trim() || input.name.trim().length > 160 || !validMoney(input.openingAmount) || input.openingAmount <= 0) return { error: "Enter a valid debtor and positive opening amount" }
  if (input.dueAt && Number.isNaN(Date.parse(input.dueAt))) return { error: "Enter a valid due date" }
  const { error } = await result.supabase.rpc("create_debtor", { payload: { organization_id: result.organizationId, name: input.name.trim(), phone: input.phone?.trim() || null, opening_amount: input.openingAmount, due_at: input.dueAt ? new Date(`${input.dueAt}T23:59:59`).toISOString() : null } })
  if (error) return { error: "Could not create debtor" }
  revalidatePath("/dashboard/debtors")
  return { success: true }
}

export async function adjustDebtor(input: { customerId: string; amount: number; reason: string }) {
  const result = await getOrganizationContext()
  if ("error" in result) return result
  if (!hasMinimumRole(result.role, "manager")) return invalidRole("manager")
  if (!isUuid(input.customerId) || !Number.isFinite(input.amount) || input.amount === 0 || Math.abs(input.amount) > 100000000 || !input.reason.trim()) return { error: "Enter a valid adjustment and reason" }
  const { error } = await result.supabase.rpc("adjust_debtor_balance", { payload: { organization_id: result.organizationId, customer_id: input.customerId, amount: input.amount, reason: input.reason.trim() } })
  if (error) return { error: error.message?.includes("exceeds") ? "Adjustment cannot exceed the outstanding balance" : "Could not adjust debt" }
  revalidatePath("/dashboard/debtors")
  return { success: true }
}

export async function clearDebtor(customerId: string) {
  const result = await getOrganizationContext()
  if ("error" in result) return result
  if (!hasMinimumRole(result.role, "manager") || !isUuid(customerId)) return { error: "You are not authorized" }
  const { data: customer } = await result.supabase.from("customers").select("balance").eq("id", customerId).eq("organization_id", result.organizationId).maybeSingle()
  const balance = Number(customer?.balance ?? 0)
  if (balance <= 0) return { error: "Debtor is already clear" }
  const { error } = await result.supabase.rpc("adjust_debtor_balance", { payload: { organization_id: result.organizationId, customer_id: customerId, amount: -balance, reason: "Debtor cleared" } })
  if (error) return { error: "Could not clear debtor" }
  revalidatePath("/dashboard/debtors")
  return { success: true }
}

export async function archiveDebtor(customerId: string, archived: boolean) {
  const result = await getOrganizationContext()
  if ("error" in result) return result
  if (!hasMinimumRole(result.role, "manager") || !isUuid(customerId)) return { error: "You are not authorized" }
  const { error } = await result.supabase.from("customers").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", customerId).eq("organization_id", result.organizationId)
  if (error) return { error: "Could not update debtor" }
  revalidatePath("/dashboard/debtors")
  return { success: true }
}

export async function deleteDebtor(customerId: string) {
  const result = await getOrganizationContext()
  if ("error" in result) return result
  if (!hasMinimumRole(result.role, "owner") || !isUuid(customerId)) return { error: "Only owners can delete debtors" }
  const { count: salesCount } = await result.supabase.from("sales").select("id", { count: "exact", head: true }).eq("customer_id", customerId).eq("organization_id", result.organizationId)
  const { count: paymentsCount } = await result.supabase.from("payments").select("id", { count: "exact", head: true }).eq("customer_id", customerId).eq("organization_id", result.organizationId)
  if ((salesCount ?? 0) > 0 || (paymentsCount ?? 0) > 0) return { error: "This debtor has financial history. Archive it instead." }
  const { error } = await result.supabase.from("customers").delete().eq("id", customerId).eq("organization_id", result.organizationId)
  if (error) return { error: "Could not delete debtor" }
  revalidatePath("/dashboard/debtors")
  return { success: true }
}

export async function recordCustomerPayment(input: { customerId: string; amount: number; method: Method; reference?: string; idempotencyKey?: string }) {
  const result = await getOrganizationContext()
  if ("error" in result) return result
  if (!isUuid(input.customerId) || !validMoney(input.amount) || input.amount <= 0) return { error: "Enter a positive payment amount" }
  const { data, error } = await result.supabase.rpc("record_customer_payment", { payload: { organization_id: result.organizationId, customer_id: input.customerId, amount: input.amount, method: input.method, reference: input.reference?.trim() || null, idempotency_key: input.idempotencyKey ?? crypto.randomUUID() } })
  if (error || !data) return { error: error?.message?.includes("exceeds") ? "Payment exceeds the outstanding balance" : "Could not record payment" }
  revalidatePath("/dashboard/debtors")
  return { success: true }
}

export async function updateDebtDueDate(input: { saleId: string; dueAt: string | null }) {
  const result = await getOrganizationContext()
  if ("error" in result) return result
  if (!isUuid(input.saleId) || (input.dueAt && Number.isNaN(Date.parse(input.dueAt)))) return { error: "Enter a valid due date" }
  const { error } = await result.supabase.rpc("update_sale_due_date", { payload: { organization_id: result.organizationId, sale_id: input.saleId, due_at: input.dueAt } })
  if (error) return { error: "Could not update due date" }
  revalidatePath("/dashboard/debtors")
  return { success: true }
}

export async function extendDebtorDueDate(customerId: string, dueAt: string) {
  const result = await getOrganizationContext()
  if ("error" in result) return result
  if (!isUuid(customerId) || Number.isNaN(Date.parse(dueAt))) return { error: "Enter a valid due date" }
  const isoDueAt = new Date(`${dueAt}T23:59:59`).toISOString()
  const opening = await result.supabase.rpc("update_debtor_due_date", { payload: { organization_id: result.organizationId, customer_id: customerId, due_at: isoDueAt } })
  if (!opening.error) { revalidatePath("/dashboard/debtors"); return { success: true } }
  const { data: sale } = await result.supabase.from("sales").select("id").eq("customer_id", customerId).eq("organization_id", result.organizationId).eq("status", "completed").order("due_at", { ascending: false }).limit(1).maybeSingle()
  return sale ? updateDebtDueDate({ saleId: sale.id, dueAt: isoDueAt }) : { error: "No debt record found" }
}

export async function restoreDebtor(customerId: string) { return archiveDebtor(customerId, false) }
export async function getDebtorAudit(customerId: string) { return customerId }
