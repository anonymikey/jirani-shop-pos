'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { syncQueue } from '@/lib/offline/sync-queue'

/**
 * Credit Sales & Payment Server Actions
 * Handles credit transactions and debt management
 */

export type CheckoutInput = {
  lines: Array<{
    product_id: string
    product_name: string
    quantity: number
    unit_price: number
    cost_price: number
  }>
  discount: number
  taxRate: number
  paymentMethod: 'cash' | 'mpesa' | 'card' | 'credit'
  customerId: string | null
  customerName?: string
}

export async function checkoutWithCredit(shopId: string, input: CheckoutInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (input.lines.length === 0) return { error: 'Cart is empty' }

  try {
    // Calculate totals
    const subtotal = input.lines.reduce((a, l) => a + l.unit_price * l.quantity, 0)
    const discount = Math.min(Math.max(input.discount, 0), subtotal)
    const taxable = subtotal - discount
    const tax = Math.round(taxable * (input.taxRate / 100) * 100) / 100
    const total = taxable + tax
    const profit = input.lines.reduce((a, l) => a + (l.unit_price - l.cost_price) * l.quantity, 0) - discount

    const receiptNumber = `JR-${Date.now().toString().slice(-8)}`

    // Get or validate customer
    let customerId = input.customerId
    let customer = null

    if (input.paymentMethod === 'credit' && customerId) {
      const { data: cust } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .eq('shop_id', shopId)
        .single()

      customer = cust
      if (!customer) return { error: 'Customer not found' }

      // Check credit limit
      if (customer.outstanding_balance + total > customer.credit_limit) {
        return { error: `Credit limit exceeded. Available: ${customer.credit_limit - customer.outstanding_balance}` }
      }
    }

    // Create sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        shop_id: shopId,
        user_id: user.id,
        receipt_number: receiptNumber,
        customer_id: customerId || null,
        customer_name: customer?.name || input.customerName || 'Guest',
        subtotal,
        discount,
        tax,
        total,
        profit,
        payment_method: input.paymentMethod,
        status: 'completed',
      })
      .select('id')
      .single()

    if (saleError || !sale) return { error: saleError?.message ?? 'Failed to create sale' }

    // Add sale items
    const items = input.lines.map((l) => ({
      shop_id: shopId,
      user_id: user.id,
      sale_id: sale.id,
      product_id: l.product_id,
      product_name: l.product_name,
      quantity: l.quantity,
      unit_price: l.unit_price,
      cost_price: l.cost_price,
      line_total: l.unit_price * l.quantity,
    }))

    const { error: itemsError } = await supabase.from('sale_items').insert(items)
    if (itemsError) return { error: itemsError.message }

    // Update inventory
    for (const l of input.lines) {
      const { data: product } = await supabase
        .from('products')
        .select('quantity')
        .eq('id', l.product_id)
        .single()
      if (product) {
        await supabase
          .from('products')
          .update({ quantity: Math.max(0, product.quantity - l.quantity) })
          .eq('id', l.product_id)
      }
    }

    // If credit sale, update customer balance
    if (input.paymentMethod === 'credit' && customer && customerId) {
      const newBalance = customer.outstanding_balance + total
      await supabase
        .from('customers')
        .update({
          outstanding_balance: newBalance,
          total_purchases: customer.total_purchases + total,
          status: newBalance > 0 ? 'current' : 'current',
        })
        .eq('id', customerId)

      // Create credit sale record
      await supabase.from('credit_sales').insert({
        shop_id: shopId,
        user_id: user.id,
        sale_id: sale.id,
        customer_id: customerId,
        amount_due: total,
        amount_paid: 0,
        remaining_balance: total,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        overdue_status: 'current',
      })
    }

    // Queue for offline sync
    await syncQueue.enqueue(shopId, user.id, 'create', 'sales', sale.id, {
      ...input,
      sale_id: sale.id,
      receipt_number: receiptNumber,
      total,
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/pos')
    return { receiptNumber, total, customerId }
  } catch (error) {
    console.error('[v0] Checkout error:', error)
    return { error: error instanceof Error ? error.message : 'Checkout failed' }
  }
}

/**
 * Record payment for a credit sale
 */
export async function recordPayment(
  shopId: string,
  customerId: string,
  amount: number,
  paymentMethod: 'cash' | 'mpesa' | 'card',
  notes?: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const paymentId = `PAY-${Date.now()}`

    // Get customer
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .eq('shop_id', shopId)
      .single()

    if (!customer) return { error: 'Customer not found' }

    // Create payment
    const { error: paymentError } = await supabase.from('payments').insert({
      id: paymentId,
      shop_id: shopId,
      user_id: user.id,
      customer_id: customerId,
      amount_paid: amount,
      payment_method: paymentMethod,
      notes,
    })

    if (paymentError) throw paymentError

    // Update customer balance
    const newBalance = Math.max(0, customer.outstanding_balance - amount)
    await supabase
      .from('customers')
      .update({
        outstanding_balance: newBalance,
        total_paid: customer.total_paid + amount,
        status: newBalance > 0 ? 'current' : 'current',
      })
      .eq('id', customerId)

    // Queue for sync
    await syncQueue.enqueue(shopId, user.id, 'create', 'payments', paymentId, {
      shop_id: shopId,
      user_id: user.id,
      customer_id: customerId,
      amount_paid: amount,
      payment_method: paymentMethod,
      notes,
    })

    revalidatePath('/dashboard/customers')
    revalidatePath('/dashboard')
    return { success: true, paymentId, newBalance }
  } catch (error) {
    console.error('[v0] Payment record error:', error)
    return { error: 'Failed to record payment' }
  }
}

/**
 * Get payment history for a customer
 */
export async function getPaymentHistory(customerId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return { payments }
  } catch (error) {
    console.error('[v0] Error fetching payment history:', error)
    return { error: 'Failed to fetch payment history' }
  }
}

/**
 * Get credit sales for a customer
 */
export async function getCreditSalesForCustomer(customerId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data: creditSales, error } = await supabase
      .from('credit_sales')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { creditSales }
  } catch (error) {
    console.error('[v0] Error fetching credit sales:', error)
    return { error: 'Failed to fetch credit sales' }
  }
}
