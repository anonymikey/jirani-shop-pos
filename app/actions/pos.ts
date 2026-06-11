"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type CartLine = {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  cost_price: number
}

export type CheckoutInput = {
  lines: CartLine[]
  discount: number
  taxRate: number
  paymentMethod: "cash" | "mpesa" | "card" | "debt"
  customerId: string | null
}

export async function checkout(input: CheckoutInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }
  if (input.lines.length === 0) return { error: "Cart is empty" }

  const subtotal = input.lines.reduce((a, l) => a + l.unit_price * l.quantity, 0)
  const discount = Math.min(Math.max(input.discount, 0), subtotal)
  const taxable = subtotal - discount
  const tax = Math.round(taxable * (input.taxRate / 100) * 100) / 100
  const total = taxable + tax
  const profit =
    input.lines.reduce((a, l) => a + (l.unit_price - l.cost_price) * l.quantity, 0) - discount

  const receiptNumber = `JR-${Date.now().toString().slice(-8)}`

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      user_id: user.id,
      receipt_number: receiptNumber,
      customer_id: input.customerId,
      subtotal,
      discount,
      tax,
      total,
      profit,
      payment_method: input.paymentMethod,
      status: "completed",
    })
    .select("id")
    .single()

  if (saleError || !sale) return { error: saleError?.message ?? "Failed to create sale" }

  const items = input.lines.map((l) => ({
    user_id: user.id,
    sale_id: sale.id,
    product_id: l.product_id,
    product_name: l.product_name,
    quantity: l.quantity,
    unit_price: l.unit_price,
    cost_price: l.cost_price,
    line_total: l.unit_price * l.quantity,
  }))

  const { error: itemsError } = await supabase.from("sale_items").insert(items)
  if (itemsError) return { error: itemsError.message }

  // Decrement stock per product
  for (const l of input.lines) {
    const { data: product } = await supabase
      .from("products")
      .select("quantity")
      .eq("id", l.product_id)
      .single()
    if (product) {
      await supabase
        .from("products")
        .update({ quantity: Math.max(0, product.quantity - l.quantity) })
        .eq("id", l.product_id)
    }
  }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/pos")
  return { receiptNumber, total }
}

const SAMPLE = [
  { name: "Maize Flour 2kg", brand: "Pembe", cost: 130, price: 165, qty: 40 },
  { name: "Cooking Oil 1L", brand: "Fresh Fri", cost: 280, price: 340, qty: 25 },
  { name: "Sugar 1kg", brand: "Kabras", cost: 145, price: 180, qty: 30 },
  { name: "Bread 400g", brand: "Superloaf", cost: 55, price: 70, qty: 18 },
  { name: "Milk 500ml", brand: "Brookside", cost: 50, price: 65, qty: 50 },
  { name: "Rice 2kg", brand: "Pishori", cost: 320, price: 410, qty: 22 },
  { name: "Tea Leaves 500g", brand: "Ketepa", cost: 240, price: 300, qty: 15 },
  { name: "Soap Bar", brand: "Sunlight", cost: 45, price: 60, qty: 60 },
  { name: "Soda 500ml", brand: "Coca-Cola", cost: 40, price: 55, qty: 80 },
  { name: "Salt 1kg", brand: "Kensalt", cost: 25, price: 40, qty: 35 },
  { name: "Beans 1kg", brand: "Local", cost: 150, price: 200, qty: 20 },
  { name: "Detergent 1kg", brand: "Omo", cost: 260, price: 330, qty: 12 },
]

export async function seedProducts() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const rows = SAMPLE.map((p) => ({
    user_id: user.id,
    name: p.name,
    brand: p.brand,
    sku: p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24),
    cost_price: p.cost,
    selling_price: p.price,
    quantity: p.qty,
    reorder_level: 10,
    status: "active",
  }))

  const { error } = await supabase.from("products").insert(rows)
  if (error) return { error: error.message }

  revalidatePath("/dashboard/pos")
  revalidatePath("/dashboard")
  return { count: rows.length }
}
