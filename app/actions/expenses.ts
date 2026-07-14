'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { syncQueue } from '@/lib/offline/sync-queue'
import { Expense } from '@/types/shop'

/**
 * Expense Management Server Actions
 * Handles expense CRUD and statistics
 */

export async function getExpenses(shopId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('shop_id', shopId)
      .order('date', { ascending: false })

    if (error) throw error
    return { expenses }
  } catch (error) {
    console.error('[v0] Error fetching expenses:', error)
    return { error: 'Failed to fetch expenses' }
  }
}

export async function createExpense(shopId: string, expense: Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'user_id'>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const newExpense = {
      ...expense,
      shop_id: shopId,
      user_id: user.id,
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert(newExpense)
      .select()
      .single()

    if (error) throw error

    // Queue for sync
    await syncQueue.enqueue(shopId, user.id, 'create', 'expenses', data.id, newExpense)

    revalidatePath('/dashboard/reports')
    return { expense: data }
  } catch (error) {
    console.error('[v0] Error creating expense:', error)
    return { error: 'Failed to create expense' }
  }
}

export async function updateExpense(shopId: string, expenseId: string, updates: Partial<Expense>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', expenseId)
      .eq('shop_id', shopId)
      .select()
      .single()

    if (error) throw error

    // Queue for sync
    await syncQueue.enqueue(shopId, user.id, 'update', 'expenses', expenseId, updates)

    revalidatePath('/dashboard/reports')
    return { expense: data }
  } catch (error) {
    console.error('[v0] Error updating expense:', error)
    return { error: 'Failed to update expense' }
  }
}

export async function deleteExpense(shopId: string, expenseId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    await supabase.from('expenses').delete().eq('id', expenseId).eq('shop_id', shopId)

    // Queue for sync
    await syncQueue.enqueue(shopId, user.id, 'delete', 'expenses', expenseId, { id: expenseId })

    revalidatePath('/dashboard/reports')
    return { success: true }
  } catch (error) {
    console.error('[v0] Error deleting expense:', error)
    return { error: 'Failed to delete expense' }
  }
}

export async function getExpenseStats(shopId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('shop_id', shopId)

    if (error) throw error

    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const totalExpenses = expenses?.reduce((sum: number, e: Expense) => sum + e.amount, 0) || 0
    const thisMonthExpenses =
      expenses
        ?.filter((e: Expense) => new Date(e.date) >= thisMonth)
        .reduce((sum: number, e: Expense) => sum + e.amount, 0) || 0
    const thisWeekExpenses =
      expenses
        ?.filter((e: Expense) => new Date(e.date) >= weekAgo)
        .reduce((sum: number, e: Expense) => sum + e.amount, 0) || 0

    // Calculate days since first expense or use 30 days as default
    const firstExpense = expenses?.[expenses.length - 1]
    const daysSinceFirst = firstExpense
      ? Math.max(1, Math.ceil((now.getTime() - new Date(firstExpense.date).getTime()) / (1000 * 60 * 60 * 24)))
      : 30

    const stats = {
      totalExpenses,
      thisMonthExpenses,
      thisWeekExpenses,
      averageDailyExpense: Math.round(totalExpenses / daysSinceFirst),
    }

    return { stats }
  } catch (error) {
    console.error('[v0] Error getting expense stats:', error)
    return { error: 'Failed to get expense stats' }
  }
}

export async function getExpensesByCategory(shopId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('shop_id', shopId)

    if (error) throw error

    // Group by category
    const byCategory: Record<string, number> = {}
    expenses?.forEach((e: Expense) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
    })

    return { byCategory }
  } catch (error) {
    console.error('[v0] Error getting expenses by category:', error)
    return { error: 'Failed to get expenses by category' }
  }
}
