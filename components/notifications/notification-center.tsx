'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'
import { getNotifications, markNotificationAsRead, deleteNotification } from '@/app/actions/notifications'
import { cn } from '@/lib/utils'

export interface Notification {
  id: string
  shop_id: string
  type: 'low_stock' | 'out_of_stock' | 'debt_due' | 'debt_overdue' | 'payment_received' | 'target_achieved' | 'sync_failed' | 'sync_completed'
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  created_at: string
}

const notificationConfig = {
  low_stock: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950' },
  out_of_stock: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950' },
  debt_due: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950' },
  debt_overdue: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950' },
  payment_received: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' },
  target_achieved: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' },
  sync_failed: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950' },
  sync_completed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' },
}

export function NotificationCenter({ shopId }: { shopId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [shopId])

  async function loadNotifications() {
    try {
      const result = await getNotifications(shopId)
      if (result.notifications) {
        setNotifications(result.notifications)
      }
    } catch (error) {
      console.error('[v0] Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkAsRead(id: string) {
    await markNotificationAsRead(id)
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function handleDelete(id: string) {
    await deleteNotification(id)
    setNotifications(notifications.filter(n => n.id !== id))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="space-y-4">
      {/* Notification Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{unreadCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Read</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{notifications.length - unreadCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Recent Notifications
          </CardTitle>
          <CardDescription>Stay updated with important alerts and events</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No notifications yet</div>
          ) : (
            <div className="space-y-2">
              {notifications.map(notification => {
                const config = notificationConfig[notification.type]
                const Icon = config.icon

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-3 p-4 rounded-lg border transition-colors',
                      notification.read ? 'bg-muted/50' : config.bg
                    )}
                  >
                    <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm">{notification.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(notification.created_at).toLocaleString('en-KE')}
                          </p>
                        </div>
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="ml-2"
                          >
                            Mark Read
                          </Button>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(notification.id)}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
