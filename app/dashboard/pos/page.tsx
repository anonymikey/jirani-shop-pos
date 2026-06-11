import { createClient } from "@/lib/supabase/server"
import { PosClient } from "@/components/pos/pos-client"

export default async function PosPage() {
  const supabase = await createClient()
  const { data: products } = await supabase
    .from("products")
    .select("id, name, brand, selling_price, cost_price, quantity")
    .eq("status", "active")
    .order("name", { ascending: true })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Point of Sale</h1>
        <p className="text-sm text-muted-foreground">Add products and complete a sale.</p>
      </div>
      <PosClient products={products ?? []} />
    </div>
  )
}
