"use client"

import type React from "react"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { InstallApp } from "@/components/install-app"

function friendlyLoginError(message: string | null): string {
  if (!message) return "We could not sign you in. Please try again."
  const m = message.toLowerCase()
  if (m.includes("invalid login") || m.includes("invalid credentials") || m.includes("invalid email")) {
    return "Invalid email or password."
  }
  if (m.includes("email not confirmed") || m.includes("confirm your email")) {
    return "Please confirm your email address before signing in."
  }
  if (m.includes("network") || m.includes("fetch") || m.includes("failed to fetch")) {
    return "We could not reach the server. Check your connection and try again."
  }
  if (m.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again."
  }
  return "We could not sign you in. Please try again."
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const accountDisabled = searchParams.get("error") === "account-disabled"

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    if (!supabase) {
      setError("Sign-in is unavailable until Supabase is configured for this project.")
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(friendlyLoginError(error.message))
      setLoading(false)
      return
    }
    router.push("/dashboard")
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your JIRANI account to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        {accountDisabled && (
          <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            This account has been deactivated. Ask your shop administrator to reactivate it.
          </p>
        )}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@shop.co.ke"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Sign in
          </Button>
        </form>
        <div className="mt-5 border-t pt-5">
          <InstallApp />
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {"Don't have an account? "}
          <Link href="/auth/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
