import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { markNotificationRead } from "@/app/actions/sync"
import { markAllNotificationsRead } from "@/app/actions/notification-events"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, CheckCheck, CircleDollarSign, Package, Users, AlertTriangle, Activity } from "lucide-react"

const styles: Record<string, { icon: typeof Bell; className: string }> = {
  sale: { icon: CircleDollarSign, className: "text-primary" },
  sale_voided: { icon: AlertTriangle, className: "text-destructive" },
  stock_alert: { icon: Package, className: "text-amber-500" },
  customer_created: { icon: Users, className: "text-primary" },
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: notifications } = user ? await supabase.from("notifications").select("id, type, title, body, read_at, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(80) : { data: [] }
  const items = notifications ?? []
  const unread = items.filter((item) => !item.read_at).length
  return <div className="mx-auto flex w-full max-w-3xl flex-col gap-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><Activity className="size-3.5" /> Live activity inbox</div><h1 className="text-2xl font-bold tracking-tight">Notifications</h1><p className="text-sm text-muted-foreground">Sales, stock, customers, payments, and important shop activity.</p></div>{unread > 0 && <form action={async () => { "use server"; await markAllNotificationsRead() }}><Button type="submit" variant="outline" size="sm"><CheckCheck className="size-4" /> Mark all read</Button></form>}</div><Card><CardHeader><CardTitle>Inbox</CardTitle><CardDescription>{unread ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "You are all caught up"}</CardDescription></CardHeader><CardContent className="flex flex-col gap-2">{items.length === 0 && <div className="flex flex-col items-center gap-2 py-12 text-center"><Bell className="size-8 text-muted-foreground/50" /><p className="text-sm text-muted-foreground">Your platform activity will appear here.</p></div>}{items.map((notification) => { const style = styles[notification.type] ?? { icon: Bell, className: "text-muted-foreground" }; const Icon = style.icon; return <div key={notification.id} className={`flex gap-3 rounded-xl border p-4 ${notification.read_at ? "opacity-65" : "bg-muted/30"}`}><span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted"><Icon className={`size-4 ${style.className}`} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{notification.title}</p>{!notification.read_at && <Badge>New</Badge>}</div><p className="mt-1 text-sm leading-6 text-muted-foreground">{notification.body}</p><p className="mt-2 text-xs text-muted-foreground">{new Date(notification.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</p></div>{!notification.read_at && <form action={markNotificationRead}><input type="hidden" name="id" value={notification.id} /><Button type="submit" variant="ghost" size="sm">Mark read</Button></form>}</div>})}</CardContent></Card><Button asChild variant="outline" className="w-fit"><Link href="/dashboard/customers">Review customer balances</Link></Button></div>
}
