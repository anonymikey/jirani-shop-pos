import { createClient } from "@/lib/supabase/server"
import { InventoryClient } from "./inventory-client"

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: products } = await supabase.from("products").select("id, name, brand, sku, cost_price, selling_price, quantity, reorder_level, supplier_id, suppliers(id, name, phone, notes)").eq("status", "active").order("name")
  const { data: suppliers } = await supabase.from("suppliers").select("id, name, phone, notes").order("name")
  return <div className="flex flex-col gap-6"><div><h1 className="text-2xl font-bold tracking-tight">Inventory</h1><p className="text-sm text-muted-foreground">Monitor stock and record adjustments with an audit trail.</p></div><InventoryClient products={(products ?? []) as never} suppliers={(suppliers ?? []) as never} /></div>
}
