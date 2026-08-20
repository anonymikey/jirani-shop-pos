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
  if (movementError) return { error: "Stock changed but the audit entry failed" }
  revalidatePath("/dashboard/inventory")
  revalidatePath("/dashboard/pos")
  revalidatePath("/dashboard")
  return { quantity: nextQuantity }
}
