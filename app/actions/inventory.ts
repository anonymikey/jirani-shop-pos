"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function createProduct(input: { name: string; brand?: string; sku?: string; costPrice: number; sellingPrice: number; quantity: number; reorderLevel: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }
  const name = input.name.trim()
  if (!name) return { error: "Product name is required" }
  if (![input.costPrice, input.sellingPrice].every((value) => Number.isFinite(value) && value >= 0)) return { error: "Prices cannot be negative" }
  if (![input.quantity, input.reorderLevel].every((value) => Number.isInteger(value) && value >= 0)) return { error: "Stock values must be whole numbers" }

  const { data: org, error: orgError } = await supabase.rpc("get_or_create_current_organization")
  if (orgError || !org) return { error: "Shop could not be initialized" }
  const { data: product, error } = await supabase.from("products").insert({ organization_id: org, user_id: user.id, name, brand: input.brand?.trim() || null, sku: input.sku?.trim() || null, cost_price: input.costPrice, selling_price: input.sellingPrice, quantity: input.quantity, reorder_level: input.reorderLevel, status: "active" }).select("id").single()
  if (error) return { error: error.code === "23505" ? "That SKU is already in use" : "Could not create product" }

  // Register the selling price in product_price_options so the debtor-first
  // create_sale_atomic RPC (migrations 0006-0008) can process it.
  const { error: priceOptionError } = await supabase.from("product_price_options").insert({
    organization_id: org,
    product_id: product.id,
    unit_price: input.sellingPrice,
    is_active: true,
    created_by: user.id,
  })

  if (priceOptionError) {
    if (priceOptionError.code === "42P01") {
      // 42P01 = undefined_table: product_price_options table does not exist.
      // The debtor-first checkout RPC requires this table. Return a clear error
      // with migration instructions so the shopkeeper knows what to do.
      return {
        error: "Product could not be prepared for checkout. The required database migration (0006) has not been applied. Please apply migration 0006_jirani_debtor_first_checkout.sql to enable sales for new products.",
        migration: "0006_jirani_debtor_first_checkout.sql",
      }
    }
    // Other insert error (RLS, constraint violation, etc.). Log but don't block
    // the product — the shopkeeper can update the price from Inventory.
    console.error("[JIRANI] product_price_options insert failed:", priceOptionError.code, priceOptionError.message)
  }

  revalidatePath("/dashboard/inventory")
  revalidatePath("/dashboard/pos")
  revalidatePath("/dashboard")
  return { productId: product.id }
}

export async function restockProduct(input: { productId: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }
  if (!input.productId) return { error: "Product is required" }

  const { data: org, error: orgError } = await supabase.rpc("get_or_create_current_organization")
  if (orgError || !org) return { error: "Shop could not be initialized" }

  const { data: product } = await supabase
    .from("products")
    .select("quantity")
    .eq("id", input.productId)
    .eq("organization_id", org)
    .eq("status", "active")
    .single()
  if (!product) return { error: "Product not found in this shop" }

  const currentQuantity = Number(product.quantity)
  if (!Number.isInteger(currentQuantity) || currentQuantity < 0) return { error: "Product stock is invalid" }
  const restockQuantity = 2000 - currentQuantity
  if (restockQuantity <= 0) return { quantity: currentQuantity }

  const { error } = await supabase
    .from("products")
    .update({ quantity: 2000 })
    .eq("id", input.productId)
    .eq("organization_id", org)
    .eq("status", "active")
  if (error) return { error: "Could not update stock" }

  const { error: movementError } = await supabase.from("inventory_movements").insert({
    organization_id: org,
    product_id: input.productId,
    movement_type: "adjustment",
    quantity: restockQuantity,
    note: "Quick restock from Point of Sale",
    created_by: user.id,
  })
  if (movementError) {
    await supabase.from("products").update({ quantity: currentQuantity }).eq("id", input.productId).eq("organization_id", org)
    return { error: "Could not record the restock audit, so stock was left unchanged" }
  }

  revalidatePath("/dashboard/inventory")
  revalidatePath("/dashboard/pos")
  revalidatePath("/dashboard")
  return { quantity: 2000 }
}

export async function updateProduct(input: { productId: string; name: string; brand?: string; sku?: string; costPrice: number; sellingPrice: number; reorderLevel: number; supplierId?: string | null }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }
  const name = input.name.trim()
  if (!input.productId || !name) return { error: "Product name is required" }
  if (![input.costPrice, input.sellingPrice].every((value) => Number.isFinite(value) && value >= 0)) return { error: "Prices cannot be negative" }
  if (!Number.isInteger(input.reorderLevel) || input.reorderLevel < 0) return { error: "Reorder level must be a whole number" }
  const { data: org, error: orgError } = await supabase.rpc("get_or_create_current_organization")
  if (orgError || !org) return { error: "Shop could not be initialized" }
  const supplierId: string | null = input.supplierId || null
  if (supplierId) {
    const { data: supplier } = await supabase.from("suppliers").select("id").eq("id", supplierId).eq("organization_id", org).maybeSingle()
    if (!supplier) return { error: "Supplier not found in this shop" }
  }
  const { data: product, error } = await supabase.from("products").update({ name, brand: input.brand?.trim() || null, sku: input.sku?.trim() || null, cost_price: input.costPrice, selling_price: input.sellingPrice, reorder_level: input.reorderLevel, supplier_id: supplierId }).eq("id", input.productId).eq("organization_id", org).select("id, name, brand, sku, cost_price, selling_price, quantity, reorder_level, supplier_id").single()
  if (error || !product) return { error: error?.code === "23505" ? "That SKU is already in use" : "Could not update product" }
  const { data: currentPrice } = await supabase.from("product_price_options").select("id").eq("organization_id", org).eq("product_id", product.id).eq("unit_price", product.selling_price).eq("is_active", true).maybeSingle()
  if (!currentPrice) {
    const { error: priceError } = await supabase.from("product_price_options").insert({ organization_id: org, product_id: product.id, unit_price: product.selling_price, is_active: true, created_by: user.id })
    if (priceError) return { error: "Product updated, but its approved selling price could not be registered" }
  }
  revalidatePath("/dashboard/inventory"); revalidatePath("/dashboard/pos"); revalidatePath("/dashboard")
  return { productId: product.id, product }
}

export async function createSupplier(input: { name: string; phone?: string; notes?: string }) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return { error: "Not authenticated" }
  const name = input.name.trim(); const phone = input.phone?.trim() || null
  if (!name) return { error: "Supplier name is required" }
  if (phone && !/^[+0-9()\s-]{7,24}$/.test(phone)) return { error: "Enter a valid supplier phone number" }
  const { data: org, error: orgError } = await supabase.rpc("get_or_create_current_organization"); if (orgError || !org) return { error: "Shop could not be initialized" }
  const { data, error } = await supabase.from("suppliers").insert({ organization_id: org, name, phone, notes: input.notes?.trim() || null, created_by: user.id }).select("id, name, phone, notes").single()
  if (error || !data) return { error: "Could not add supplier" }
  revalidatePath("/dashboard/inventory")
  revalidatePath("/dashboard/pos")
  return { supplier: data }
}

export async function createOutOfStockRequest(input: { productName: string; productId?: string | null; supplierId?: string | null; quantity: number; note?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }
  const productName = input.productName.trim()
  if (!productName) return { error: "Goods name is required" }
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) return { error: "Requested quantity must be a positive whole number" }
  const { data: org, error: orgError } = await supabase.rpc("get_or_create_current_organization")
  if (orgError || !org) return { error: "Shop could not be initialized" }
  if (input.productId) { const { data: product } = await supabase.from("products").select("id").eq("id", input.productId).eq("organization_id", org).maybeSingle(); if (!product) return { error: "Product not found in this shop" } }
  if (input.supplierId) { const { data: supplier } = await supabase.from("suppliers").select("id").eq("id", input.supplierId).eq("organization_id", org).maybeSingle(); if (!supplier) return { error: "Supplier not found in this shop" } }
  const { data: request, error } = await supabase.from("out_of_stock_requests").insert({ organization_id: org, product_id: input.productId || null, supplier_id: input.supplierId || null, product_name: productName, quantity_requested: input.quantity, note: input.note?.trim() || null, created_by: user.id }).select("id").single()
  if (error || !request) return { error: "Could not record out-of-stock request" }
  const { data: members } = await supabase.from("organization_members").select("user_id").eq("organization_id", org).eq("is_active", true)
  if (members?.length) await supabase.from("notifications").insert(members.map((member) => ({ organization_id: org, user_id: member.user_id, type: "supplier_restock", title: "Supplier restock needed", body: `${productName}: request ${input.quantity} units from the supplier.` })))
  revalidatePath("/dashboard/suppliers"); revalidatePath("/dashboard/inventory"); revalidatePath("/dashboard/notifications")
  return { requestId: request.id }
}

export async function adjustInventory(input: { productId: string; quantity: number; note?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }
  if (!Number.isInteger(input.quantity) || input.quantity === 0) return { error: "Enter a non-zero whole number" }

  const { data: org, error: orgError } = await supabase.rpc("get_or_create_current_organization")
  if (orgError || !org) return { error: "Shop could not be initialized" }

  const { data: product } = await supabase.from("products").select("quantity").eq("id", input.productId).eq("organization_id", org).single()
  if (!product) return { error: "Product not found in this shop" }
  const nextQuantity = Number(product.quantity) + input.quantity
  if (nextQuantity < 0) return { error: "Stock cannot be negative" }

  const { error } = await supabase.from("products").update({ quantity: nextQuantity }).eq("id", input.productId).eq("organization_id", org)
  if (error) return { error: "Could not update stock" }
  const { error: movementError } = await supabase.from("inventory_movements").insert({ organization_id: org, product_id: input.productId, movement_type: "adjustment", quantity: input.quantity, note: input.note || null, created_by: user.id })
  if (movementError) {
    // Roll back the stock change so quantity stays consistent with the audit trail
    await supabase.from("products").update({ quantity: Number(product.quantity) }).eq("id", input.productId).eq("organization_id", org)
    return { error: "Could not record the audit entry. Stock was left unchanged." }
  }
  revalidatePath("/dashboard/inventory")
  revalidatePath("/dashboard/pos")
  revalidatePath("/dashboard")
  return { quantity: nextQuantity }
}
