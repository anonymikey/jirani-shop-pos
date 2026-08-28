import { createClient } from "@/lib/supabase/server"
import { SuppliersClient } from "./suppliers-client"

export default async function SuppliersPage() {
  const supabase = await createClient()
  const { data: suppliers } = await supabase.from("suppliers").select("id, name, phone, notes, created_at").order("name")
  const { data: products } = await supabase.from("products").select("id, name, quantity, supplier_id").eq("status", "active").order("name")
  return <div className="flex flex-col gap-6"><div><h1 className="text-2xl font-bold tracking-tight">Suppliers</h1><p className="text-sm text-muted-foreground">Manage supplier contacts and restock requests.</p></div><SuppliersClient initialSuppliers={(suppliers ?? []) as never} products={(products ?? []) as never} /></div>
}
