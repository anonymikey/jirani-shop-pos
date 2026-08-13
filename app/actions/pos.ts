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
  idempotencyKey?: string
}

export async function checkout(input: CheckoutInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }
  if (input.lines.length === 0) return { error: "Cart is empty" }

  const invalidLine = input.lines.find(
    (line) => !line.product_id || !Number.isInteger(line.quantity) || line.quantity <= 0,
  )
  if (invalidLine) return { error: "Invalid cart quantity" }

  const { data: organizationId, error: organizationError } = await supabase.rpc(
    "get_or_create_current_organization",
  )
  if (organizationError || !organizationId) {
    return { error: "Your shop could not be initialized" }
  }

  const paymentMethod =
    input.paymentMethod === "mpesa"
      ? "mobile_money"
      : input.paymentMethod === "debt"
        ? "credit"
        : input.paymentMethod
  const receiptNumber = `JR-${Date.now().toString().slice(-8)}`
  const { data, error } = await supabase.rpc("create_sale_atomic", {
    payload: {
      organization_id: organizationId,
      receipt_number: receiptNumber,
      customer_id: input.customerId,
      discount: Math.max(0, Number(input.discount) || 0),
      tax: Math.max(0, Number(input.taxRate) || 0),
      payment_method: paymentMethod,
      idempotency_key: input.idempotencyKey ?? crypto.randomUUID(),
      items: input.lines.map((line) => ({
        product_id: line.product_id,
        quantity: line.quantity,
      })),
    },
  })

  if (error || !data) return { error: error?.message ?? "Failed to complete sale" }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/pos")
  return {
    receiptNumber: data.receipt_number as string,
    total: Number(data.total ?? data.subtotal),
    duplicate: Boolean(data.duplicate),
  }
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
