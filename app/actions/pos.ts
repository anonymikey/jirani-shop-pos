"use server"

import { createClient } from "@/lib/supabase/server"
import { notifyOrganization } from "@/app/actions/notification-events"
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
  amountPaid: number
  customerId: string | null
  customerName?: string | null
  dueAt?: string | null
  idempotencyKey?: string
}

function friendlyCheckoutError(message: string | null): string {
  if (!message) return "We could not complete the sale. Please try again."
  const m = message.toLowerCase()
  if (m.includes("credit limit")) return "This customer has reached their credit limit for this sale."
  if (m.includes("insufficient stock")) return "Not enough stock for one of the items. Adjust the quantity and try again."
  if (m.includes("customer is required") || m.includes("debtor is required")) return "Select a customer for this outstanding sale."
  if (m.includes("customer not found") || m.includes("customer is not authorized")) return "The selected customer is not valid for this shop."
  if (m.includes("product not found")) return "One of the products is no longer available. Refresh the page and try again."
  if (m.includes("price is not approved")) return "The price for one of the products is not approved. Go to Inventory and update the product's selling price, then try again."
  if (m.includes("not authorized") || m.includes("permission")) return "You do not have permission to complete this sale."
  if (m.includes("amount paid exceeds")) return "The amount paid is more than the sale total."
  if (m.includes("invalid item quantity") || m.includes("invalid unit price")) return "One of the items has an invalid quantity or price."
  if (m.includes("unsupported payment method")) return "The selected payment method is not supported."
  if (m.includes("cart is empty")) return "The cart is empty."
  if (m.includes("relation") && m.includes("does not exist")) return "A required database table is missing. Please apply migration 0006_jirani_debtor_first_checkout.sql."
  return "We could not complete the sale. Please try again."
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

  if (!Number.isFinite(input.amountPaid) || input.amountPaid < 0) {
    return { error: "Enter a valid amount paid" }
  }

  const { data: organizationId, error: organizationError } = await supabase.rpc(
    "get_or_create_current_organization",
  )
  if (organizationError || !organizationId) {
    return { error: "Your shop could not be initialized" }
  }

  const paymentMethod = input.paymentMethod
  const receiptNumber = `JR-${Date.now().toString().slice(-8)}`
  const { data, error } = await supabase.rpc("create_sale_atomic", {
    payload: {
      organization_id: organizationId,
      receipt_number: receiptNumber,
      customer_id: input.customerId,
      customer_name: input.customerName?.trim() || null,
      discount: Math.max(0, Number(input.discount) || 0),
      tax: Math.max(0, Math.round(((Number(input.taxRate) || 0) / 100) * Math.max(0, input.lines.reduce((sum, line) => sum + line.unit_price * line.quantity, 0) - Math.max(0, Number(input.discount) || 0)) * 100) / 100),
      payment_method: paymentMethod,
      amount_paid: Math.min(Math.max(0, Number(input.amountPaid) || 0), Number.POSITIVE_INFINITY),
      due_at: input.dueAt ?? null,
      idempotency_key: input.idempotencyKey ?? crypto.randomUUID(),
      items: input.lines.map((line) => ({
        product_id: line.product_id,
        quantity: line.quantity,
        unit_price: line.unit_price,
      })),
    },
  })

  if (error || !data) return { error: friendlyCheckoutError(error?.message ?? null) }

  revalidatePath("/dashboard")
  revalidatePath("/dashboard/pos")
  await notifyOrganization({ organizationId, type: "sale", title: "Sale completed", body: `${receiptNumber} was completed via ${paymentMethod.replace("_", " ")}.` })
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

  const { data: organizationId, error: organizationError } = await supabase.rpc("get_or_create_current_organization")
  if (organizationError || !organizationId) return { error: "Shop could not be initialized" }

  const rows = SAMPLE.map((p) => ({
    organization_id: organizationId,
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

  const { data: products, error } = await supabase.from("products").insert(rows).select("id, selling_price")
  if (error || !products?.length) return { error: error?.code === "23505" ? "Some sample products already exist" : "Could not add sample products" }

  const prices = products.map((product) => ({
    organization_id: organizationId,
    product_id: product.id,
    unit_price: product.selling_price,
    is_active: true,
    created_by: user.id,
  }))
  const { error: priceError } = await supabase.from("product_price_options").insert(prices)
  if (priceError) {
    await supabase.from("products").delete().eq("organization_id", organizationId).in("id", products.map((product) => product.id))
    if (priceError.code === "42P01") return { error: "The approved-price table is missing. Apply the checkout database migration, then try again." }
    console.error("[JIRANI] seed price registration failed:", priceError.code, priceError.message)
    return { error: "Sample products could not be prepared for checkout" }
  }

  revalidatePath("/dashboard/pos")
  revalidatePath("/dashboard")
  return { count: rows.length }
}
