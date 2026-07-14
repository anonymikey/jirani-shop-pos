import { openDB, DBSchema, IDBPDatabase } from 'idb'

export type SyncAction = 'create' | 'update' | 'delete'
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed'
export type SyncTable = 'products' | 'customers' | 'sales' | 'payments' | 'expenses' | 'stock_movements'

export interface SyncQueueItem {
  id: string
  shop_id: string
  user_id: string
  action: SyncAction
  table: SyncTable
  record_id: string
  payload: Record<string, any>
  status: SyncStatus
  error?: string
  retries: number
  created_at: string
  synced_at?: string
}

interface SyncQueueDB extends DBSchema {
  queue: {
    key: string
    value: SyncQueueItem
    indexes: { 'by-status': SyncStatus; 'by-shop': string }
  }
}

const DB_NAME = 'jirani-sync-queue'
const STORE_NAME = 'queue'
const MAX_RETRIES = 3

/**
 * Sync Queue Manager
 * Manages offline actions and tracks synchronization status
 * Uses IndexedDB to persist queue even after page refresh
 */
class SyncQueueManager {
  private db: IDBPDatabase<SyncQueueDB> | null = null
  private syncListeners: Set<(item: SyncQueueItem) => void> = new Set()

  async init() {
    if (this.db) return
    this.db = await openDB<SyncQueueDB>(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('by-status', 'status')
          store.createIndex('by-shop', 'shop_id')
        }
      },
    })
  }

  /**
   * Add an action to the sync queue
   */
  async enqueue(
    shopId: string,
    userId: string,
    action: SyncAction,
    table: SyncTable,
    recordId: string,
    payload: Record<string, any>
  ): Promise<SyncQueueItem> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const item: SyncQueueItem = {
      id: `${table}-${recordId}-${Date.now()}`,
      shop_id: shopId,
      user_id: userId,
      action,
      table,
      record_id: recordId,
      payload,
      status: 'pending',
      retries: 0,
      created_at: new Date().toISOString(),
    }

    await this.db.add(STORE_NAME, item)
    this.notifyListeners(item)
    return item
  }

  /**
   * Get all pending items in the queue
   */
  async getPending(shopId: string): Promise<SyncQueueItem[]> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const allByStatus = await this.db.getAllFromIndex(STORE_NAME, 'by-status', 'pending')
    return allByStatus.filter((item) => item.shop_id === shopId)
  }

  /**
   * Get all items for a shop
   */
  async getAllByShop(shopId: string): Promise<SyncQueueItem[]> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    return this.db.getAllFromIndex(STORE_NAME, 'by-shop', shopId)
  }

  /**
   * Mark an item as synced
   */
  async markSynced(id: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const item = await this.db.get(STORE_NAME, id)
    if (item) {
      item.status = 'synced'
      item.synced_at = new Date().toISOString()
      await this.db.put(STORE_NAME, item)
      this.notifyListeners(item)
    }
  }

  /**
   * Mark an item as syncing
   */
  async markSyncing(id: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const item = await this.db.get(STORE_NAME, id)
    if (item) {
      item.status = 'syncing'
      await this.db.put(STORE_NAME, item)
      this.notifyListeners(item)
    }
  }

  /**
   * Mark an item as failed and increment retries
   */
  async markFailed(id: string, error: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const item = await this.db.get(STORE_NAME, id)
    if (item) {
      item.retries++
      if (item.retries >= MAX_RETRIES) {
        item.status = 'failed'
      } else {
        item.status = 'pending'
      }
      item.error = error
      await this.db.put(STORE_NAME, item)
      this.notifyListeners(item)
    }
  }

  /**
   * Remove an item from the queue
   */
  async remove(id: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    await this.db.delete(STORE_NAME, id)
  }

  /**
   * Clear all synced items for a shop
   */
  async clearSynced(shopId: string): Promise<void> {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const synced = await this.db.getAllFromIndex(STORE_NAME, 'by-status', 'synced')
    const toDelete = synced.filter((item) => item.shop_id === shopId)
    for (const item of toDelete) {
      await this.db.delete(STORE_NAME, item.id)
    }
  }

  /**
   * Get sync statistics
   */
  async getStats(shopId: string) {
    await this.init()
    if (!this.db) throw new Error('Database not initialized')

    const allItems = await this.getAllByShop(shopId)
    const pending = allItems.filter((i) => i.status === 'pending').length
    const syncing = allItems.filter((i) => i.status === 'syncing').length
    const synced = allItems.filter((i) => i.status === 'synced').length
    const failed = allItems.filter((i) => i.status === 'failed').length

    return { pending, syncing, synced, failed, total: allItems.length }
  }

  /**
   * Register a listener for sync events
   */
  onSyncEvent(callback: (item: SyncQueueItem) => void) {
    this.syncListeners.add(callback)
    return () => this.syncListeners.delete(callback)
  }

  /**
   * Notify all listeners of a sync event
   */
  private notifyListeners(item: SyncQueueItem) {
    this.syncListeners.forEach((callback) => callback(item))
  }
}

// Singleton instance
export const syncQueue = new SyncQueueManager()
