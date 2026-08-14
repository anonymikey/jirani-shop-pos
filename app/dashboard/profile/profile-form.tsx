"use client"

import { useActionState } from "react"
import { updateProfile, type ProfileActionState } from "@/app/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState: ProfileActionState = {}

export function ProfileForm({ fullName }: { fullName: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState)

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" defaultValue={fullName} required minLength={2} maxLength={80} />
        <p className="text-sm text-muted-foreground">This name appears in your account menu and activity.</p>
      </div>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
        {state.error ? <p className="text-sm text-destructive" role="alert">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-primary" role="status">{state.success}</p> : null}
      </div>
    </form>
  )
}
