'use server'

import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/offline/db'
import { syncQueue } from '@/lib/offline/sync-queue'

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

export async function createNotification(shopId: string, notification: Omit<Notification, 'id' | 'shop_id' | 'created_at'>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    // Create notification in Supabase
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        shop_id: shopId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        read: notification.read,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Also store in IndexedDB for offline access
    if (typeof window !== 'undefined') {
      await db.notifications.add({
        id: data.id,
        shop_id: shopId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        read: notification.read,
        created_at: data.created_at,
      })
    }

    // Add to sync queue
    await syncQueue.add({
      id: data.id,
      table: 'notifications',
      action: 'insert',
      data,
      status: 'pending',
      createdAt: new Date().toISOString(),
      shop_id: shopId,
    })

    return { notification: data }
  } catch (error) {
    console.error('[v0] Error creating notification:', error)
    return { error: 'Failed to create notification' }
  }
}

export async function getNotifications(shopId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return { notifications: data }
  } catch (error) {
    console.error('[v0] Error fetching notifications:', error)
    return { error: 'Failed to fetch notifications' }
  }
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .select()
      .single()

    if (error) throw error

    // Update in IndexedDB
    if (typeof window !== 'undefined') {
      const notification = await db.notifications.get(notificationId)
      if (notification) {
        await db.notifications.update(notificationId, { read: true })
      }
    }

    // Add to sync queue
    await syncQueue.add({
      id: notificationId,
      table: 'notifications',
      action: 'update',
      data: { id: notificationId, read: true },
      status: 'pending',
      createdAt: new Date().toISOString(),
    })

    return { notification: data }
  } catch (error) {
    console.error('[v0] Error marking notification as read:', error)
    return { error: 'Failed to update notification' }
  }
}

export async function deleteNotification(notificationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { error } = await supabase.from('notifications').delete().eq('id', notificationId)

    if (error) throw error

    // Delete from IndexedDB
    if (typeof window !== 'undefined') {
      await db.notifications.delete(notificationId)
    }

    // Add to sync queue
    await syncQueue.add({
      id: notificationId,
      table: 'notifications',
      action: 'delete',
      data: { id: notificationId },
      status: 'pending',
      createdAt: new Date().toISOString(),
    })

    return { success: true }
  } catch (error) {
    console.error('[v0] Error deleting notification:', error)
    return { error: 'Failed to delete notification' }
  }
}

export async function clearReadNotifications(shopId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('shop_id', shopId)
      .eq('read', true)

    if (error) throw error

    // Clear from IndexedDB
    if (typeof window !== 'undefined') {
      const readNotifications = await db.notifications.where('read').equals(true).toArray()
      await Promise.all(readNotifications.map(n => db.notifications.delete(n.id)))
    }

    return { success: true }
  } catch (error) {
    console.error('[v0] Error clearing notifications:', error)
    return { error: 'Failed to clear notifications' }
  }
}

export async function getUnreadCount(shopId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('read', false)

    if (error) throw error

    return { count: count || 0 }
  } catch (error) {
    console.error('[v0] Error getting unread count:', error)
    return { error: 'Failed to get unread count' }
  }
}

export async function createLowStockNotification(shopId: string, productId: string, productName: string, currentStock: number, reorderLevel: number) {
  return createNotification(shopId, {
    type: 'low_stock',
    title: 'Low Stock Alert',
    message: `${productName} stock level (${currentStock}) is below reorder level (${reorderLevel})`,
    data: { productId, currentStock, reorderLevel },
    read: false,
  })
}

export async function createOutOfStockNotification(shopId: string, productId: string, productName: string) {
  return createNotification(shopId, {
    type: 'out_of_stock',
    title: 'Out of Stock',
    message: `${productName} is now out of stock`,
    data: { productId },
    read: false,
  })
}

export async function createDebtDueNotification(shopId: string, customerId: string, customerName: string, amount: number, dueDate: string) {
  return createNotification(shopId, {
    type: 'debt_due',
    title: 'Debt Due Today',
    message: `${customerName} owes KES ${amount} - Due: ${new Date(dueDate).toLocaleDateString('en-KE')}`,
    data: { customerId, amount, dueDate },
    read: false,
  })
}

export async function createDebtOverdueNotification(shopId: string, customerId: string, customerName: string, amount: number, daysOverdue: number) {
  return createNotification(shopId, {
    type: 'debt_overdue',
    title: 'Overdue Debt',
    message: `${customerName} debt of KES ${amount} is ${daysOverdue} days overdue`,
    data: { customerId, amount, daysOverdue },
    read: false,
  })
}

export async function createPaymentReceivedNotification(shopId: string, customerId: string, customerName: string, amount: number) {
  return createNotification(shopId, {
    type: 'payment_received',
    title: 'Payment Received',
    message: `${customerName} paid KES ${amount}`,
    data: { customerId, amount },
    read: false,
  })
}

export async function createSyncFailedNotification(shopId: string, reason: string) {
  return createNotification(shopId, {
    type: 'sync_failed',
    title: 'Sync Failed',
    message: `Failed to sync data: ${reason}. Will retry when online.`,
    data: { reason },
    read: false,
  })
}

export async function createSyncCompletedNotification(shopId: string, itemsCount: number) {
  return createNotification(shopId, {
    type: 'sync_completed',
    title: 'Sync Completed',
    message: `Successfully synced ${itemsCount} changes`,
    data: { itemsCount },
    read: false,
  })
}
