"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { adjustInventory, createProduct } from "@/app/actions/inventory"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { formatKES } from "@/lib/format"
import { Loader2, Package, Plus, Minus, X } from "lucide-react"

type Product = { id: string; name: string; brand: string | null; sku: string | null; selling_price: number; quantity: number; reorder_level: number }

export function InventoryClient({ products }: { products: Product[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Product | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState(1)
  const [note, setNote] = useState("")

  function submit(direction: 1 | -1) {
    if (!selected) return
    startTransition(async () => {
      const result = await adjustInventory({ productId: selected.id, quantity: direction * Math.max(1, Math.floor(amount)), note })
      if ("error" in result) { toast.error(result.error); return }
      toast.success(`Stock updated to ${result.quantity}`)
      setSelected(null); setNote(""); router.refresh()
    })
  }

  function addProduct(formData: FormData) {
    startTransition(async () => {
      const result = await createProduct({ name: String(formData.get("name") || ""), brand: String(formData.get("brand") || ""), sku: String(formData.get("sku") || ""), costPrice: Number(formData.get("cost_price")), sellingPrice: Number(formData.get("selling_price")), quantity: Number(formData.get("quantity")), reorderLevel: Number(formData.get("reorder_level")) })
      if ("error" in result) { toast.error(result.error); return }
      toast.success("Product added to inventory")
      setShowForm(false); router.refresh()
    })
  }

  return <div className="flex flex-col gap-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="sr-only">Inventory</h1><p className="text-sm text-muted-foreground">Add products, monitor stock, and preserve every adjustment in the audit trail.</p></div><Button onClick={() => setShowForm((value) => !value)}>{showForm ? <X data-icon="inline-start" /> : <Plus data-icon="inline-start" />} {showForm ? "Close" : "Add product"}</Button></div>
    {showForm && <Card><CardHeader><CardTitle>Add product</CardTitle></CardHeader><CardContent><form action={addProduct} className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="name">Product name *</Label><Input id="name" name="name" required minLength={2} placeholder="e.g. 2kg Rice" /></div>
      <div className="grid gap-1.5"><Label htmlFor="brand">Brand</Label><Input id="brand" name="brand" placeholder="Optional" /></div><div className="grid gap-1.5"><Label htmlFor="sku">SKU</Label><Input id="sku" name="sku" placeholder="Optional" /></div>
      <div className="grid gap-1.5"><Label htmlFor="cost_price">Cost price (KES) *</Label><Input id="cost_price" name="cost_price" type="number" min="0" step="0.01" required /></div><div className="grid gap-1.5"><Label htmlFor="selling_price">Selling price (KES) *</Label><Input id="selling_price" name="selling_price" type="number" min="0" step="0.01" required /></div>
      <div className="grid gap-1.5"><Label htmlFor="quantity">Initial stock *</Label><Input id="quantity" name="quantity" type="number" min="0" step="1" defaultValue="0" required /></div><div className="grid gap-1.5"><Label htmlFor="reorder_level">Reorder level *</Label><Input id="reorder_level" name="reorder_level" type="number" min="0" step="1" defaultValue="5" required /></div>
      <div className="flex justify-end sm:col-span-2"><Button type="submit" disabled={pending}>{pending && <Loader2 data-icon="inline-start" className="animate-spin" />} Save product</Button></div>
    </form></CardContent></Card>}
    {selected && <Card className="border-primary/40"><CardHeader><CardTitle className="flex items-center justify-between">Adjust stock <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Cancel</Button></CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"><div><p className="text-sm font-medium">{selected.name}</p><p className="text-xs text-muted-foreground">Current: {selected.quantity} units</p></div><div className="grid gap-1.5"><Label htmlFor="adjust-amount">Units</Label><Input id="adjust-amount" type="number" min={1} value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></div><div className="flex gap-2"><Button disabled={pending} onClick={() => submit(1)}>{pending ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Plus data-icon="inline-start" />} Add</Button><Button disabled={pending} variant="outline" onClick={() => submit(-1)}><Minus data-icon="inline-start" /> Remove</Button></div><Input className="sm:col-span-3" placeholder="Reason or supplier note (optional)" value={note} onChange={(event) => setNote(event.target.value)} /></CardContent></Card>}
    <Card><CardHeader><CardTitle>Stock levels</CardTitle></CardHeader><CardContent className="p-0"><div className="divide-y divide-border">{products.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No products yet. Add your first product above.</p>}{products.map((product) => { const low = product.quantity <= product.reorder_level; return <div key={product.id} className="flex items-center justify-between gap-3 px-4 py-3"><div className="flex min-w-0 items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"><Package /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{product.name}</p><p className="truncate text-xs text-muted-foreground">{product.brand || product.sku || "No SKU"} · {formatKES(Number(product.selling_price))}</p></div></div><div className="flex items-center gap-3"><Badge variant={product.quantity === 0 ? "destructive" : low ? "secondary" : "outline"}>{product.quantity} units</Badge><Button size="sm" variant="outline" onClick={() => setSelected(product)}>Adjust</Button></div></div> })}</div></CardContent></Card>
  </div>
}
