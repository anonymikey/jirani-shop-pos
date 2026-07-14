import { createClient } from "@/lib/supabase/server"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { redirect } from "next/navigation"

export const metadata = {
  title: 'Notifications | Jirani Shop',
  description: 'View and manage your alerts and notifications',
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_id')
    .eq('id', user.id)
    .single()

  if (!profile?.shop_id) {
    redirect('/auth/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Stay updated with important alerts about stock, debts, payments and synchronization
        </p>
      </div>

      <NotificationCenter shopId={profile.shop_id} />
    </div>
  )
}
