'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { syncQueue } from '@/lib/offline/sync-queue'
import { Product } from '@/types/shop'

/**
 * Inventory Management Server Actions
 * Handles product CRUD, stock adjustments, and inventory operations
 */

export async function getProducts(shopId: string) {
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
      .order('name')

    if (error) throw error
    return { products }
  } catch (error) {
    console.error('[v0] Error fetching products:', error)
    return { error: 'Failed to fetch products' }
  }
}

export async function createProduct(shopId: string, product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const newProduct = {
      ...product,
      shop_id: shopId,
      created_by: user.id,
    }

    const { data, error } = await supabase.from('products').insert(newProduct).select().single()

    if (error) throw error

    // Queue for offline sync
    await syncQueue.enqueue(shopId, user.id, 'create', 'products', data.id, newProduct)

    revalidatePath('/dashboard/inventory')
    return { product: data }
  } catch (error) {
    console.error('[v0] Error creating product:', error)
    return { error: 'Failed to create product' }
  }
}

export async function updateProduct(shopId: string, productId: string, updates: Partial<Product>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .eq('shop_id', shopId)
      .select()
      .single()

    if (error) throw error

    // Queue for offline sync
    await syncQueue.enqueue(shopId, user.id, 'update', 'products', productId, updates)

    revalidatePath('/dashboard/inventory')
    return { product: data }
  } catch (error) {
    console.error('[v0] Error updating product:', error)
    return { error: 'Failed to update product' }
  }
}

export async function deleteProduct(shopId: string, productId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    await supabase.from('products').delete().eq('id', productId).eq('shop_id', shopId)

    // Queue for offline sync
    await syncQueue.enqueue(shopId, user.id, 'delete', 'products', productId, { id: productId })

    revalidatePath('/dashboard/inventory')
    return { success: true }
  } catch (error) {
    console.error('[v0] Error deleting product:', error)
    return { error: 'Failed to delete product' }
  }
}

export async function adjustStock(
  shopId: string,
  productId: string,
  quantityChange: number,
  reason: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    // Get current product
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('quantity')
      .eq('id', productId)
      .eq('shop_id', shopId)
      .single()

    if (fetchError || !product) throw new Error('Product not found')

    // Calculate new quantity
    const newQuantity = Math.max(0, product.quantity + quantityChange)

    // Update product quantity
    await supabase
      .from('products')
      .update({ quantity: newQuantity })
      .eq('id', productId)
      .eq('shop_id', shopId)

    // Record stock movement
    const movementId = `movement-${Date.now()}`
    const movement = {
      id: movementId,
      shop_id: shopId,
      user_id: user.id,
      product_id: productId,
      quantity_change: quantityChange,
      reason,
      movement_type: quantityChange > 0 ? 'in' : 'out',
      created_at: new Date().toISOString(),
    }

    await supabase.from('stock_movements').insert(movement)

    // Queue for sync
    await syncQueue.enqueue(shopId, user.id, 'update', 'products', productId, { quantity: newQuantity })
    await syncQueue.enqueue(shopId, user.id, 'create', 'stock_movements', movementId, movement)

    revalidatePath('/dashboard/inventory')
    return { success: true, newQuantity }
  } catch (error) {
    console.error('[v0] Error adjusting stock:', error)
    return { error: 'Failed to adjust stock' }
  }
}

export async function getStockHistory(productId: string, limit = 50) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    const { data: movements, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return { movements }
  } catch (error) {
    console.error('[v0] Error fetching stock history:', error)
    return { error: 'Failed to fetch stock history' }
  }
}

export async function getInventoryStats(shopId: string) {
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

    const lowStockProducts = products?.filter((p: Product) => p.quantity <= p.reorder_level) || []
    const outOfStockProducts = products?.filter((p: Product) => p.quantity === 0) || []
    const totalItems = products?.reduce((sum: number, p: Product) => sum + p.quantity, 0) || 0
    const inventoryValue = products?.reduce((sum: number, p: Product) => sum + p.cost_price * p.quantity, 0) || 0

    return {
      totalProducts: products?.length || 0,
      totalItems,
      inventoryValue,
      lowStockCount: lowStockProducts.length,
      outOfStockCount: outOfStockProducts.length,
      lowStockProducts: lowStockProducts.slice(0, 10),
      outOfStockProducts: outOfStockProducts.slice(0, 10),
    }
  } catch (error) {
    console.error('[v0] Error getting inventory stats:', error)
    return { error: 'Failed to get inventory stats' }
  }
}

export async function searchProducts(shopId: string, query: string) {
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
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%,barcode.ilike.%${query}%`)
      .limit(20)

    if (error) throw error
    return { products }
  } catch (error) {
    console.error('[v0] Error searching products:', error)
    return { error: 'Search failed' }
  }
}
