'use client'

import { useEffect, useState, useCallback } from 'react'
import { syncQueue, SyncQueueItem } from '@/lib/offline/sync-queue'

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'sync-failed'

interface SyncStats {
  pending: number
  syncing: number
  synced: number
  failed: number
  total: number
}

export interface UseOfflineSyncReturn {
  isOnline: boolean
  syncStatus: SyncStatus
  stats: SyncStats
  queueItems: SyncQueueItem[]
  retrySync: () => Promise<void>
  clearQueue: () => Promise<void>
}

/**
 * Hook to manage offline synchronization state
 * Tracks online/offline status and sync queue statistics
 */
export function useOfflineSync(shopId?: string): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('online')
  const [stats, setStats] = useState<SyncStats>({ pending: 0, syncing: 0, synced: 0, failed: 0, total: 0 })
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([])

  // Detect online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setSyncStatus('online')
    }

    const handleOffline = () => {
      setIsOnline(false)
      setSyncStatus('offline')
    }

    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Update sync statistics
  const updateStats = useCallback(async () => {
    if (!shopId) return

    try {
      const currentStats = await syncQueue.getStats(shopId)
      setStats(currentStats)

      // Update sync status based on queue state
      if (currentStats.syncing > 0) {
        setSyncStatus('syncing')
      } else if (currentStats.failed > 0) {
        setSyncStatus('sync-failed')
      } else if (currentStats.pending > 0) {
        setSyncStatus('offline')
      } else if (isOnline) {
        setSyncStatus('online')
      }
    } catch (error) {
      console.error('[v0] Failed to update sync stats:', error)
    }
  }, [shopId, isOnline])

  // Listen to sync queue events
  useEffect(() => {
    const unsubscribe = syncQueue.onSyncEvent(() => {
      updateStats()
    })

    return unsubscribe
  }, [updateStats])

  // Initial stats load
  useEffect(() => {
    updateStats()
  }, [updateStats])

  // Retry failed sync
  const retrySync = useCallback(async () => {
    if (!shopId) return
    // This will be called by the main sync engine
    setSyncStatus('syncing')
  }, [shopId])

  // Clear queue
  const clearQueue = useCallback(async () => {
    if (!shopId) return
    try {
      const items = await syncQueue.getAllByShop(shopId)
      for (const item of items) {
        await syncQueue.remove(item.id)
      }
      setQueueItems([])
      setStats({ pending: 0, syncing: 0, synced: 0, failed: 0, total: 0 })
    } catch (error) {
      console.error('[v0] Failed to clear queue:', error)
    }
  }, [shopId])

  return {
    isOnline,
    syncStatus,
    stats,
    queueItems,
    retrySync,
    clearQueue,
  }
}
