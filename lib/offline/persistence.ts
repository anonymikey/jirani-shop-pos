import { offlineDB, OfflineProduct, OfflineCustomer, OfflineSale, OfflinePayment, OfflineExpense, OfflineStockMovement } from './db'
import { syncQueue } from './sync-queue'

/**
 * Offline Persistence Service
 * Handles saving and retrieving data from IndexedDB
 * Automatically queues actions for sync when online
 */

export class OfflinePersistenceService {
  /**
   * Save or update a product offline
   */
  static async saveProduct(shopId: string, userId: string, product: OfflineProduct) {
    if (!offlineDB) throw new Error('Offline DB not available')

    try {
      const existingProduct = await offlineDB.products.where('id').equals(product.id).first()

      if (existingProduct) {
        await offlineDB.products.update(product.id, product)
        await syncQueue.enqueue(shopId, userId, 'update', 'products', product.id, product)
      } else {
        await offlineDB.products.add(product)
        await syncQueue.enqueue(shopId, userId, 'create', 'products', product.id, product)
      }

      return { success: true, product }
    } catch (error) {
      console.error('[v0] Failed to save product:', error)
      throw error
    }
  }

  /**
   * Get all products for a shop
   */
  static async getProducts(shopId: string): Promise<OfflineProduct[]> {
    if (!offlineDB) throw new Error('Offline DB not available')

    try {
      return await offlineDB.products.where('shop_id').equals(shopId).toArray()
    } catch (error) {
      console.error('[v0] Failed to get products:', error)
      return []
    }
  }

  /**
   * Delete a product
   */
  static async deleteProduct(shopId: string, userId: string, productId: string) {
    if (!offlineDB) throw new Error('Offline DB not available')

    try {
      await offlineDB.products.delete(productId)
      await syncQueue.enqueue(shopId, userId, 'delete', 'products', productId, { id: productId })
      return { success: true }
    } catch (error) {
      console.error('[v0] Failed to delete product:', error)
      throw error
    }
  }

  /**
   * Save or update a customer offline
   */
  static async saveCustomer(shopId: string, userId: string, customer: OfflineCustomer) {
    if (!offlineDB) throw new Error('Offline DB not available')

    try {
      const existingCustomer = await offlineDB.customers.where('id').equals(customer.id).first()

      if (existingCustomer) {
        await offlineDB.customers.update(customer.id, customer)
        await syncQueue.enqueue(shopId, userId, 'update', 'customers', customer.id, customer)
      } else {
        await offlineDB.customers.add(customer)
        await syncQueue.enqueue(shopId, userId, 'create', 'customers', customer.id, customer)
      }

      return { success: true, customer }
    } catch (error) {
      console.error('[v0] Failed to save customer:', error)
      throw error
    }
  }

  /**
   * Get all customers for a shop
   */
  static async getCustomers(shopId: string): Promise<OfflineCustomer[]> {
    if (!offlineDB) throw new Error('Offline DB not available')

    try {
      return await offlineDB.customers.where('shop_id').equals(shopId).toArray()
    } catch (error) {
      console.error('[v0] Failed to get customers:', error)
      return []
    }
  }

  /**
   * Save a sale transaction
   */
  static async saveSale(shopId: string, userId: string, sale: OfflineSale) {
    if (!offlineDB) throw new Error('Offline DB not available')

    try {
      await offlineDB.sales.add(sale)
      await syncQueue.enqueue(shopId, userId, 'create', 'sales', sale.id, sale)

      // If customer exists, update their balance
      if (sale.customer_id) {
        const customer = await offlineDB.customers.where('id').equals(sale.customer_id).first()
        if (customer) {
          if (sale.payment_method === 'credit') {
            customer.outstanding_balance += sale.total - (sale.payment_method === 'credit' ? 0 : 0)
          }
          customer.total_purchases += sale.total
          await offlineDB.customers.update(customer.id, customer)
        }
      }

      return { success: true, sale }
    } catch (error) {
      console.error('[v0] Failed to save sale:', error)
      throw error
    }
  }

  /**
   * Get sales for a shop
   */
  static async getSales(shopId: string, limit = 100): Promise<OfflineSale[]> {
    if (!offlineDB) throw new Error('Offline DB not available')

    try {
      return await offlineDB.sales
        .where('shop_id')
        .equals(shopId)
        .reverse()
        .limit(limit)
        .toArray()
    } catch (error) {
      console.error('[v0] Failed to get sales:', error)
      return []
    }
  }

  /**
   * Record a payment
   */
  static async recordPayment(shopId: string, userId: string, payment: OfflinePayment) {
    if (!offlineDB) throw new Error('Offline DB not available')

    try {
      await offlineDB.payments.add(payment)
      await syncQueue.enqueue(shopId, userId, 'create', 'payments', payment.id, payment)

      // Update customer balance
      const customer = await offlineDB.customers.where('id').equals(payment.customer_id).first()
      if (customer) {
        customer.outstanding_balance = Math.max(0, customer.outstanding_balance - payment.amount_paid)
        customer.total_paid += payment.amount_paid
        customer.status = customer.outstanding_balance > 0 ? 'current' : 'current'
        await offlineDB.customers.update(customer.id, customer)
      }

      return { success: true, payment }
    } catch (error) {
      console.error('[v0] Failed to record payment:', error)
      throw error
    }
  }

  /**
   * Save an expense
   */
  static async saveExpense(shopId: string, userId: string, expense: OfflineExpense) {
    if (!offlineDB) throw new Error('Offline DB not available')

    try {
      await offlineDB.expenses.add(expense)
      await syncQueue.enqueue(shopId, userId, 'create', 'expenses', expense.id, expense)

      return { success: true, expense }
    } catch (error) {
      console.error('[v0] Failed to save expense:', error)
      throw error
    }
  }

  /**
   * Get expenses for a date range
   */
  static async getExpenses(shopId: string, startDate: string, endDate: string): Promise<OfflineExpense[]> {
    if (!offlineDB) throw new Error('Offline DB not available')

    try {
      const all = await offlineDB.expenses.where('shop_id').equals(shopId).toArray()
      return all.filter((e) => e.date >= startDate && e.date <= endDate)
    } catch (error) {
      console.error('[v0] Failed to get expenses:', error)
      return []
    }
  }

  /**
   * Record stock movement
   */
  static async recordStockMovement(shopId: string, userId: string, movement: OfflineStockMovement) {
    if (!offlineDB) throw new Error('Offline DB not available')

    try {
      await offlineDB.stock_movements.add(movement)
      await syncQueue.enqueue(shopId, userId, 'create', 'stock_movements', movement.id, movement)

      // Update product quantity
      const product = await offlineDB.products.where('id').equals(movement.product_id).first()
      if (product) {
        product.quantity += movement.quantity_change
        product.quantity = Math.max(0, product.quantity)
        await offlineDB.products.update(product.id, product)
      }

      return { success: true, movement }
    } catch (error) {
      console.error('[v0] Failed to record stock movement:', error)
      throw error
    }
  }

  /**
   * Get stock history for a product
   */
  static async getStockHistory(productId: string, limit = 50): Promise<OfflineStockMovement[]> {
    if (!offlineDB) throw new Error('Offline DB not available')

    try {
      return await offlineDB.stock_movements
        .where('product_id')
        .equals(productId)
        .reverse()
        .limit(limit)
        .toArray()
    } catch (error) {
      console.error('[v0] Failed to get stock history:', error)
      return []
    }
  }

  /**
   * Get total inventory value
   */
  static async getInventoryValue(shopId: string): Promise<number> {
    if (!offlineDB) throw new Error('Offline DB not available')

    try {
      const products = await offlineDB.products.where('shop_id').equals(shopId).toArray()
      return products.reduce((total, product) => total + product.cost_price * product.quantity, 0)
    } catch (error) {
      console.error('[v0] Failed to get inventory value:', error)
      return 0
    }
  }

  /**
   * Calculate total outstanding debt
   */
  static async getTotalOutstandingDebt(shopId: string): Promise<number> {
    if (!offlineDB) throw new Error('Offline DB not available')

    try {
      const customers = await offlineDB.customers.where('shop_id').equals(shopId).toArray()
      return customers.reduce((total, customer) => total + customer.outstanding_balance, 0)
    } catch (error) {
      console.error('[v0] Failed to get outstanding debt:', error)
      return 0
    }
  }
}
