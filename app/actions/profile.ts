"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type ProfileActionState = {
  error?: string
  success?: string
}

export async function updateProfile(
  _previousState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const fullName = String(formData.get("full_name") ?? "").trim()

  if (fullName.length < 2 || fullName.length > 80) {
    return { error: "Enter a name between 2 and 80 characters." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Your session has expired. Please sign in again." }

  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id)

  if (error) {
    console.error("[v0] Failed to update profile", { userId: user.id, error: error.message })
    return { error: "We couldn’t update your profile. Please try again." }
  }

  revalidatePath("/dashboard", "layout")
  revalidatePath("/dashboard/profile")
  return { success: "Profile updated." }
}

