'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Reports Server Actions
 * Generates business reports for analytics and decision making
 */

export async function getDailySalesReport(shopId: string, date: string) {
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
      .eq(
        'created_at',
        `${date.substring(0, 10)}`
      )
      .order('created_at', { ascending: false })

    if (error) throw error

    const report = {
      date,
      totalSales: sales?.reduce((sum, s) => sum + s.total, 0) || 0,
      totalProfit: sales?.reduce((sum, s) => sum + s.profit, 0) || 0,
      transactionCount: sales?.length || 0,
      cashSales: sales?.filter((s) => s.payment_method === 'cash').reduce((sum, s) => sum + s.total, 0) || 0,
      creditSales: sales?.filter((s) => s.payment_method === 'credit').reduce((sum, s) => sum + s.total, 0) || 0,
      mPesaSales: sales?.filter((s) => s.payment_method === 'mpesa').reduce((sum, s) => sum + s.total, 0) || 0,
      cardSales: sales?.filter((s) => s.payment_method === 'card').reduce((sum, s) => sum + s.total, 0) || 0,
      avgTransactionValue: sales?.length ? (sales.reduce((sum, s) => sum + s.total, 0) / sales.length).toFixed(2) : 0,
    }

    return { report }
  } catch (error) {
    console.error('[v0] Error generating daily sales report:', error)
    return { error: 'Failed to generate report' }
  }
}

export async function getWeeklySalesReport(shopId: string, startDate: string, endDate: string) {
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
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    if (error) throw error

    // Group by day
    const byDay: Record<string, any> = {}
    sales?.forEach((sale) => {
      const day = sale.created_at.split('T')[0]
      if (!byDay[day]) {
        byDay[day] = { sales: 0, profit: 0, count: 0 }
      }
      byDay[day].sales += sale.total
      byDay[day].profit += sale.profit
      byDay[day].count += 1
    })

    const report = {
      startDate,
      endDate,
      totalSales: sales?.reduce((sum, s) => sum + s.total, 0) || 0,
      totalProfit: sales?.reduce((sum, s) => sum + s.profit, 0) || 0,
      transactionCount: sales?.length || 0,
      avgDailySales: sales?.length ? ((sales.reduce((sum, s) => sum + s.total, 0) / Object.keys(byDay).length)).toFixed(2) : 0,
      byDay,
    }

    return { report }
  } catch (error) {
    console.error('[v0] Error generating weekly report:', error)
    return { error: 'Failed to generate report' }
  }
}

export async function getInventoryReport(shopId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('shop_id', shopId)

    if (error) throw error

    const lowStockProducts = products?.filter((p) => p.quantity > 0 && p.quantity <= p.reorder_level) || []
    const outOfStockProducts = products?.filter((p) => p.quantity === 0) || []

    const report = {
      totalProducts: products?.length || 0,
      totalItems: products?.reduce((sum: number, p: any) => sum + p.quantity, 0) || 0,
      inventoryValue: products?.reduce((sum: number, p: any) => sum + p.cost_price * p.quantity, 0) || 0,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      lowStockProducts,
      outOfStockProducts,
      avgCostPerItem: products?.length ? (products.reduce((sum: number, p: any) => sum + p.cost_price, 0) / products.length).toFixed(2) : 0,
      avgSellingPrice: products?.length ? (products.reduce((sum: number, p: any) => sum + p.selling_price, 0) / products.length).toFixed(2) : 0,
    }

    return { report }
  } catch (error) {
    console.error('[v0] Error generating inventory report:', error)
    return { error: 'Failed to generate report' }
  }
}

export async function getCreditReport(shopId: string) {
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
      .gt('outstanding_balance', 0)

    if (error) throw error

    const currentDebtors = customers?.filter((c) => c.status === 'current') || []
    const overdueDebtors = customers?.filter((c) => c.status === 'overdue') || []

    const report = {
      totalDebtors: customers?.length || 0,
      totalOutstandingDebt: customers?.reduce((sum: number, c: any) => sum + c.outstanding_balance, 0) || 0,
      currentDebtors: currentDebtors.length,
      overdueDebtors: overdueDebtors.length,
      currentDebtAmount: currentDebtors.reduce((sum: number, c: any) => sum + c.outstanding_balance, 0),
      overdueDebtAmount: overdueDebtors.reduce((sum: number, c: any) => sum + c.outstanding_balance, 0),
      topDebtors: customers?.sort((a, b) => b.outstanding_balance - a.outstanding_balance).slice(0, 10) || [],
    }

    return { report }
  } catch (error) {
    console.error('[v0] Error generating credit report:', error)
    return { error: 'Failed to generate report' }
  }
}

export async function getProfitReport(shopId: string, startDate: string, endDate: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    // Get sales
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .eq('shop_id', shopId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    // Get expenses
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('*')
      .eq('shop_id', shopId)
      .gte('date', startDate)
      .lte('date', endDate)

    if (salesError || expensesError) throw new Error('Failed to fetch data')

    const totalSales = sales?.reduce((sum, s) => sum + s.total, 0) || 0
    const totalCOGS = sales?.reduce((sum, s) => sum + s.lines?.reduce((l: number, item: any) => l + item.cost_price * item.quantity, 0) || 0, 0) || 0
    const grossProfit = totalSales - totalCOGS
    const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0
    const netProfit = grossProfit - totalExpenses

    // Group expenses by category
    const expensesByCategory: Record<string, number> = {}
    expenses?.forEach((expense) => {
      expensesByCategory[expense.category] = (expensesByCategory[expense.category] || 0) + expense.amount
    })

    const report = {
      period: { startDate, endDate },
      revenue: totalSales,
      cogs: totalCOGS,
      grossProfit,
      grossMargin: totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(2) : 0,
      expenses: totalExpenses,
      expensesByCategory,
      netProfit,
      netMargin: totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(2) : 0,
      transactionCount: sales?.length || 0,
    }

    return { report }
  } catch (error) {
    console.error('[v0] Error generating profit report:', error)
    return { error: 'Failed to generate report' }
  }
}

export async function getTopProductsReport(shopId: string, limit = 10) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data: saleItems, error } = await supabase
      .from('sale_items')
      .select('product_name, quantity, unit_price')
      .eq('shop_id', shopId)

    if (error) throw error

    // Group by product
    const productStats: Record<string, { qty: number; revenue: number }> = {}
    saleItems?.forEach((item) => {
      if (!productStats[item.product_name]) {
        productStats[item.product_name] = { qty: 0, revenue: 0 }
      }
      productStats[item.product_name].qty += item.quantity
      productStats[item.product_name].revenue += item.unit_price * item.quantity
    })

    const report = Object.entries(productStats)
      .map(([name, stats]) => ({
        productName: name,
        unitsSold: stats.qty,
        totalRevenue: stats.revenue,
        avgPrice: stats.qty > 0 ? (stats.revenue / stats.qty).toFixed(2) : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit)

    return { report }
  } catch (error) {
    console.error('[v0] Error generating top products report:', error)
    return { error: 'Failed to generate report' }
  }
}
