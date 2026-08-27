import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export type OrganizationRole = "owner" | "admin" | "manager" | "cashier" | "accountant"

const ROLE_RANK: Record<OrganizationRole, number> = {
  cashier: 10,
  accountant: 20,
  manager: 30,
  admin: 40,
  owner: 50,
}

type OrganizationContextSuccess = {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: User
  organizationId: string
  role: OrganizationRole
}

type OrganizationContextResult = OrganizationContextSuccess | { error: string }

export async function getOrganizationContext(): Promise<OrganizationContextResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: organizationId, error: organizationError } = await supabase.rpc("get_or_create_current_organization")
  if (organizationError || !organizationId) return { error: "Shop could not be initialized" }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle()

  if (membershipError || !membership || !(membership.role in ROLE_RANK)) return { error: "You are not an active member of this shop" }
  return { supabase, user, organizationId: String(organizationId), role: membership.role as OrganizationRole }
}

export function hasMinimumRole(role: OrganizationRole, minimum: OrganizationRole) {
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function validMoney(value: unknown, maximum = 100_000_000) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum
}

export function validIdempotencyKey(value: unknown) {
  return typeof value === "string" && /^[A-Za-z0-9:_-]{8,128}$/.test(value)
}

export function invalidRole(minimum: OrganizationRole) {
  return { error: `Only ${minimum}s and owners can perform this action` }
}

export type OrganizationContext = Awaited<ReturnType<typeof getOrganizationContext>>
