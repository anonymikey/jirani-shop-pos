'use client'

// Simple sync queue implementation for offline support
export interface SyncQueueItem {
  id: string
  table: string
  action: 'insert' | 'update' | 'delete'
  data: any
  status: 'pending' | 'syncing' | 'synced' | 'failed'
  createdAt: string
  shop_id?: string
}

class SyncQueueManager {
  private items: SyncQueueItem[] = []

  async add(item: Omit<SyncQueueItem, 'id'>) {
    const queueItem: SyncQueueItem = {
      id: `${Date.now()}-${Math.random()}`,
      ...item,
    }
    this.items.push(queueItem)
    return queueItem
  }

  async getAll() {
    return this.items
  }

  async getPending() {
    return this.items.filter(i => i.status === 'pending')
  }

  async updateStatus(id: string, status: SyncQueueItem['status']) {
    const item = this.items.find(i => i.id === id)
    if (item) {
      item.status = status
    }
  }

  async clear() {
    this.items = []
  }

  async remove(id: string) {
    this.items = this.items.filter(i => i.id !== id)
  }
}

export const syncQueue = new SyncQueueManager()
