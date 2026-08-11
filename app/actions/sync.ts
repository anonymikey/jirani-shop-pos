"use server"

import { createClient } from "@/lib/supabase/server"

export async function replaySyncOperation(input: { operation: string; payload: Record<string, unknown>; idempotencyKey: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }
  const { data: organizationId, error: orgError } = await supabase.rpc("get_or_create_current_organization")
  if (orgError || !organizationId) return { error: "Shop could not be initialized" }
  const { data, error } = await supabase.from("sync_queue").upsert({ organization_id: organizationId, user_id: user.id, operation: input.operation, payload: input.payload, idempotency_key: input.idempotencyKey, status: "completed", attempts: 1, processed_at: new Date().toISOString() }, { onConflict: "organization_id,idempotency_key" }).select("id").single()
  if (error || !data) return { error: "Could not acknowledge queued operation" }
  return { success: true, id: data.id }
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id)
  if (error) return { error: "Could not update notification" }
  return { success: true }
}
