'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { syncQueue } from '@/lib/offline/sync-queue'
import { Customer } from '@/types/shop'

/**
 * Customer Management Server Actions
 * Handles customer CRUD and credit operations
 */

export async function getCustomers(shopId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('shop_id', shopId)
      .order('name')

    if (error) throw error
    return { customers }
  } catch (error) {
    console.error('[v0] Error fetching customers:', error)
    return { error: 'Failed to fetch customers' }
  }
}

export async function createCustomer(shopId: string, customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const newCustomer = {
      ...customer,
      shop_id: shopId,
      created_by: user.id,
      total_purchases: 0,
      total_paid: 0,
      outstanding_balance: 0,
      status: 'current' as const,
    }

    const { data, error } = await supabase.from('customers').insert(newCustomer).select().single()

    if (error) throw error

    // Queue for sync
    await syncQueue.enqueue(shopId, user.id, 'create', 'customers', data.id, newCustomer)

    revalidatePath('/dashboard/customers')
    return { customer: data }
  } catch (error) {
    console.error('[v0] Error creating customer:', error)
    return { error: 'Failed to create customer' }
  }
}

export async function updateCustomer(shopId: string, customerId: string, updates: Partial<Customer>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', customerId)
      .eq('shop_id', shopId)
      .select()
      .single()

    if (error) throw error

    // Queue for sync
    await syncQueue.enqueue(shopId, user.id, 'update', 'customers', customerId, updates)

    revalidatePath('/dashboard/customers')
    return { customer: data }
  } catch (error) {
    console.error('[v0] Error updating customer:', error)
    return { error: 'Failed to update customer' }
  }
}

export async function deleteCustomer(shopId: string, customerId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    await supabase.from('customers').delete().eq('id', customerId).eq('shop_id', shopId)

    // Queue for sync
    await syncQueue.enqueue(shopId, user.id, 'delete', 'customers', customerId, { id: customerId })

    revalidatePath('/dashboard/customers')
    return { success: true }
  } catch (error) {
    console.error('[v0] Error deleting customer:', error)
    return { error: 'Failed to delete customer' }
  }
}

export async function searchCustomers(shopId: string, query: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('shop_id', shopId)
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(20)

    if (error) throw error
    return { customers }
  } catch (error) {
    console.error('[v0] Error searching customers:', error)
    return { error: 'Search failed' }
  }
}

export async function getCustomerById(shopId: string, customerId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('shop_id', shopId)
      .single()

    if (error) throw error
    return { customer }
  } catch (error) {
    console.error('[v0] Error fetching customer:', error)
    return { error: 'Failed to fetch customer' }
  }
}

export async function getDebtors(shopId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data: debtors, error } = await supabase
      .from('customers')
      .select('*')
      .eq('shop_id', shopId)
      .gt('outstanding_balance', 0)
      .order('status', { ascending: false })
      .order('name')

    if (error) throw error

    const totalDebt = debtors?.reduce((sum: number, c: Customer) => sum + c.outstanding_balance, 0) || 0
    const overdueDebt = debtors?.filter((c: Customer) => c.status === 'overdue').reduce((sum: number, c: Customer) => sum + c.outstanding_balance, 0) || 0

    return {
      debtors,
      stats: {
        totalDebtors: debtors?.length || 0,
        totalOutstandingDebt: totalDebt,
        overdueDebt,
      },
    }
  } catch (error) {
    console.error('[v0] Error fetching debtors:', error)
    return { error: 'Failed to fetch debtors' }
  }
}

export async function getCustomerStats(shopId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('shop_id', shopId)

    if (error) throw error

    const stats = {
      totalCustomers: customers?.length || 0,
      totalPurchases: customers?.reduce((sum: number, c: Customer) => sum + c.total_purchases, 0) || 0,
      totalOutstandingDebt: customers?.reduce((sum: number, c: Customer) => sum + c.outstanding_balance, 0) || 0,
      totalPaid: customers?.reduce((sum: number, c: Customer) => sum + c.total_paid, 0) || 0,
      debtorsCount: customers?.filter((c: Customer) => c.outstanding_balance > 0).length || 0,
      overdueCount: customers?.filter((c: Customer) => c.status === 'overdue').length || 0,
    }

    return { stats }
  } catch (error) {
    console.error('[v0] Error getting customer stats:', error)
    return { error: 'Failed to get customer stats' }
  }
}

export async function getCreditSales(shopId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data: sales, error } = await supabase
      .from('sales')
      .select(`
        id,
        shop_id,
        customer_id,
        amount,
        status,
        date,
        notes,
        items_count,
        due_date
      `)
      .eq('shop_id', shopId)
      .eq('is_credit', true)
      .order('date', { ascending: false })

    if (error) throw error

    const salesWithCustomerNames = (sales || []).map((sale: any) => ({
      ...sale,
      customer_name: sale.customer_id || 'Unknown',
    }))

    return { sales: salesWithCustomerNames }
  } catch (error) {
    console.error('[v0] Error fetching credit sales:', error)
    return { error: 'Failed to fetch credit sales' }
  }
}

export async function getCreditSalesStats(shopId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data: sales, error } = await supabase
      .from('sales')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_credit', true)

    if (error) throw error

    const stats = {
      totalOnCredit: sales?.reduce((sum: number, s: any) => sum + s.amount, 0) || 0,
      totalPending: sales?.filter((s: any) => s.status === 'pending').reduce((sum: number, s: any) => sum + s.amount, 0) || 0,
      totalPaid: sales?.filter((s: any) => s.status === 'paid').reduce((sum: number, s: any) => sum + s.amount, 0) || 0,
      salesCount: sales?.length || 0,
      pendingCount: sales?.filter((s: any) => s.status === 'pending').length || 0,
    }

    return { stats }
  } catch (error) {
    console.error('[v0] Error getting credit sales stats:', error)
    return { error: 'Failed to get credit sales stats' }
  }
}
