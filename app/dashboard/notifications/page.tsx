import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { markNotificationRead } from "@/app/actions/sync"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: notifications } = user ? await supabase.from("notifications").select("id, type, title, body, read_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50) : { data: [] }
  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-6"><div><h1 className="text-2xl font-bold tracking-tight">Notifications</h1><p className="text-sm text-muted-foreground">Payment follow-ups, stock alerts, and account activity.</p></div><Card><CardHeader><CardTitle>Inbox</CardTitle><CardDescription>{(notifications ?? []).filter((notification) => !notification.read_at).length} unread notifications</CardDescription></CardHeader><CardContent className="flex flex-col gap-2">{(notifications ?? []).length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">You are all caught up.</p>}{(notifications ?? []).map((notification) => <div key={notification.id} className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between ${notification.read_at ? "opacity-70" : "bg-muted/30"}`}><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{notification.title}</p>{!notification.read_at && <Badge>New</Badge>}</div><p className="mt-1 text-sm text-muted-foreground">{notification.body}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(notification.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</p></div>{!notification.read_at && <form action={markNotificationRead.bind(null, notification.id)}><Button type="submit" variant="outline" size="sm">Mark read</Button></form>}</div>)}</CardContent></Card><Button asChild variant="outline" className="w-fit"><Link href="/dashboard/customers">Review customer balances</Link></Button></div>
}
