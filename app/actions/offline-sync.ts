'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { syncQueue, SyncQueueItem } from '@/lib/offline/sync-queue'

/**
 * Offline Sync Server Actions
 * Handles synchronization of queued offline transactions
 */

export async function syncOfflineChanges() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    // Get user's shop_id
    const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', user.id).single()
    if (!profile?.shop_id) return { error: 'No shop found' }

    // Get pending items from sync queue
    const pendingItems = await syncQueue.getPending(profile.shop_id)
    console.log(`[v0] Syncing ${pendingItems.length} offline changes`)

    let successCount = 0
    let failedCount = 0
    const failedItems: SyncQueueItem[] = []

    for (const item of pendingItems) {
      try {
        await syncQueue.markSyncing(item.id)

        // Process based on table type
        switch (item.table) {
          case 'products':
            if (item.action === 'create') {
              await supabase.from('products').insert(item.payload)
            } else if (item.action === 'update') {
              await supabase.from('products').update(item.payload).eq('id', item.record_id)
            } else if (item.action === 'delete') {
              await supabase.from('products').delete().eq('id', item.record_id)
            }
            break

          case 'customers':
            if (item.action === 'create') {
              await supabase.from('customers').insert(item.payload)
            } else if (item.action === 'update') {
              await supabase.from('customers').update(item.payload).eq('id', item.record_id)
            } else if (item.action === 'delete') {
              await supabase.from('customers').delete().eq('id', item.record_id)
            }
            break

          case 'sales':
            if (item.action === 'create') {
              const { items: saleItems, ...saleData } = item.payload
              const { data: sale } = await supabase
                .from('sales')
                .insert(saleData)
                .select('id')
                .single()

              if (sale && saleItems) {
                const itemsWithSaleId = saleItems.map((si: any) => ({
                  ...si,
                  sale_id: sale.id,
                }))
                await supabase.from('sale_items').insert(itemsWithSaleId)
              }
            }
            break

          case 'payments':
            if (item.action === 'create') {
              await supabase.from('payments').insert(item.payload)
            }
            break

          case 'expenses':
            if (item.action === 'create') {
              await supabase.from('expenses').insert(item.payload)
            }
            break

          case 'stock_movements':
            if (item.action === 'create') {
              await supabase.from('stock_movements').insert(item.payload)
            }
            break
        }

        await syncQueue.markSynced(item.id)
        successCount++
      } catch (error) {
        console.error(`[v0] Sync failed for item ${item.id}:`, error)
        await syncQueue.markFailed(item.id, error instanceof Error ? error.message : 'Unknown error')
        failedCount++
        failedItems.push(item)
      }
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/pos')
    revalidatePath('/dashboard/inventory')
    revalidatePath('/dashboard/customers')

    return {
      success: true,
      synced: successCount,
      failed: failedCount,
      failedItems: failedItems.map((item) => ({
        id: item.id,
        table: item.table,
        error: item.error,
      })),
    }
  } catch (error) {
    console.error('[v0] Offline sync error:', error)
    return {
      error: error instanceof Error ? error.message : 'Sync failed',
    }
  }
}

/**
 * Get pending sync items for display in UI
 */
export async function getPendingSyncItems(shopId: string) {
  try {
    const items = await syncQueue.getPending(shopId)
    const stats = await syncQueue.getStats(shopId)

    return {
      items: items.map((item) => ({
        id: item.id,
        table: item.table,
        action: item.action,
        status: item.status,
        error: item.error,
        created_at: item.created_at,
      })),
      stats,
    }
  } catch (error) {
    console.error('[v0] Failed to get pending items:', error)
    return { error: 'Failed to get pending items' }
  }
}

/**
 * Clear synced items from queue
 */
export async function clearSyncedItems(shopId: string) {
  try {
    await syncQueue.clearSynced(shopId)
    return { success: true }
  } catch (error) {
    console.error('[v0] Failed to clear synced items:', error)
    return { error: 'Failed to clear synced items' }
  }
}
