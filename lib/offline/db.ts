import Dexie, { Table } from 'dexie'

// Types for offline data structures
export interface OfflineProduct {
  id: string
  shop_id: string
  name: string
  sku?: string
  barcode?: string
  category_id?: string
  category_name?: string
  supplier?: string
  cost_price: number
  selling_price: number
  quantity: number
  reorder_level: number
  product_image_url?: string
  expiry_date?: string
  created_at: string
  updated_at: string
}

export interface OfflineCustomer {
  id: string
  shop_id: string
  name: string
  phone: string
  alt_phone?: string
  location?: string
  notes?: string
  credit_limit: number
  total_purchases: number
  total_paid: number
  outstanding_balance: number
  status: 'current' | 'overdue'
  created_at: string
  updated_at: string
}

export interface OfflineSale {
  id: string
  shop_id: string
  user_id: string
  receipt_number: string
  customer_id?: string
  customer_name?: string
  subtotal: number
  discount: number
  tax: number
  total: number
  profit: number
  payment_method: 'cash' | 'mpesa' | 'card' | 'credit'
  status: 'completed' | 'pending' | 'voided'
  items: OfflineSaleItem[]
  created_at: string
  updated_at: string
}

export interface OfflineSaleItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  cost_price: number
  line_total: number
}

export interface OfflinePayment {
  id: string
  shop_id: string
  user_id: string
  customer_id: string
  sale_id?: string
  amount_paid: number
  payment_method: 'cash' | 'mpesa' | 'card'
  notes?: string
  created_at: string
}

export interface OfflineExpense {
  id: string
  shop_id: string
  user_id: string
  category: 'rent' | 'electricity' | 'water' | 'salaries' | 'internet' | 'transport' | 'other'
  amount: number
  description: string
  date: string
  created_at: string
  updated_at: string
}

export interface OfflineStockMovement {
  id: string
  shop_id: string
  user_id: string
  product_id: string
  quantity_change: number
  reason: string
  movement_type: 'in' | 'out' | 'adjustment'
  created_at: string
}

export interface OfflineNotification {
  id: string
  shop_id: string
  user_id: string
  type: 'low_stock' | 'out_of_stock' | 'overdue_debt' | 'due_today' | 'sync_failed' | 'sync_completed' | 'target_achieved' | 'payment_received'
  title: string
  message: string
  related_id?: string
  read: boolean
  created_at: string
}

/**
 * Jirani Shop Offline Database
 * Uses Dexie.js as IndexedDB wrapper for offline-first functionality
 * Schema supports multi-tenancy with shop_id
 */
export class JiraniOfflineDB extends Dexie {
  products!: Table<OfflineProduct>
  customers!: Table<OfflineCustomer>
  sales!: Table<OfflineSale>
  payments!: Table<OfflinePayment>
  expenses!: Table<OfflineExpense>
  stock_movements!: Table<OfflineStockMovement>
  notifications!: Table<OfflineNotification>

  constructor() {
    super('JiraniShopDB')
    this.version(1).stores({
      products: '++id, shop_id, sku, barcode',
      customers: '++id, shop_id, phone',
      sales: '++id, shop_id, user_id, receipt_number, created_at',
      payments: '++id, shop_id, user_id, customer_id, created_at',
      expenses: '++id, shop_id, user_id, date',
      stock_movements: '++id, shop_id, product_id, created_at',
      notifications: '++id, shop_id, user_id, read, created_at',
    })
  }

  /**
   * Clear all data for a shop (useful for logout)
   */
  async clearShopData(shopId: string) {
    await this.products.where('shop_id').equals(shopId).delete()
    await this.customers.where('shop_id').equals(shopId).delete()
    await this.sales.where('shop_id').equals(shopId).delete()
    await this.payments.where('shop_id').equals(shopId).delete()
    await this.expenses.where('shop_id').equals(shopId).delete()
    await this.stock_movements.where('shop_id').equals(shopId).delete()
    await this.notifications.where('shop_id').equals(shopId).delete()
  }

  /**
   * Export shop data for backup
   */
  async exportShopData(shopId: string) {
    return {
      products: await this.products.where('shop_id').equals(shopId).toArray(),
      customers: await this.customers.where('shop_id').equals(shopId).toArray(),
      sales: await this.sales.where('shop_id').equals(shopId).toArray(),
      payments: await this.payments.where('shop_id').equals(shopId).toArray(),
      expenses: await this.expenses.where('shop_id').equals(shopId).toArray(),
      stock_movements: await this.stock_movements.where('shop_id').equals(shopId).toArray(),
      notifications: await this.notifications.where('shop_id').equals(shopId).toArray(),
    }
  }
}

// Singleton instance
export const offlineDB = typeof window !== 'undefined' ? new JiraniOfflineDB() : null
