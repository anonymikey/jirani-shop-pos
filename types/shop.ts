/**
 * Jirani Shop Type Definitions
 * Core types for the retail management system
 */

export interface Shop {
  id: string
  name: string
  owner_id: string
  location?: string
  phone?: string
  email?: string
  tax_rate: number
  currency: 'KES'
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  shop_id: string
  name: string
  sku?: string
  barcode?: string
  category_id: string
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

export interface Category {
  id: string
  shop_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Customer {
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
  last_purchase_date?: string
  created_at: string
  updated_at: string
}

export interface Sale {
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
  items: SaleItem[]
  notes?: string
  created_at: string
  updated_at: string
}

export interface SaleItem {
  id: string
  sale_id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  cost_price: number
  line_total: number
}

export interface Payment {
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

export interface Expense {
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

export interface StockMovement {
  id: string
  shop_id: string
  user_id: string
  product_id: string
  quantity_change: number
  reason: string
  movement_type: 'in' | 'out' | 'adjustment'
  created_at: string
}

export interface CreditSale {
  id: string
  shop_id: string
  customer_id: string
  customer_name: string
  amount: number
  status: 'pending' | 'paid' | 'overdue'
  date: string
  due_date?: string
  items_count: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface Notification {
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

export interface CartItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  cost_price: number
}

export interface CartLine extends CartItem {
  id: string
}

export interface DashboardMetrics {
  totalSalesToday: number
  totalProfitToday: number
  totalSalesWeek: number
  totalSalesMonth: number
  outstandingDebts: number
  collectedToday: number
  lowStockProducts: Product[]
  outOfStockProducts: Product[]
  inventoryValue: number
  topProducts: Array<{
    productId: string
    productName: string
    unitsSold: number
    revenue: number
  }>
  topCustomers: Array<{
    customerId: string
    customerName: string
    totalPurchases: number
    outstandingBalance: number
  }>
  recentSales: Sale[]
  pendingSyncItems: number
}
