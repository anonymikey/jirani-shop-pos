"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { checkout, seedProducts, type CartLine } from "@/app/actions/pos"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatKES } from "@/lib/format"
import { Search, Plus, Minus, Trash2, ShoppingCart, PackageOpen, Banknote, Smartphone, CreditCard, NotebookPen, Loader2 } from "lucide-react"

type Product = {
  id: string
  name: string
  brand: string | null
  selling_price: number
  cost_price: number
  quantity: number
}

type Line = CartLine & { stock: number }

const PAYMENTS = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "mpesa", label: "M-Pesa", icon: Smartphone },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "debt", label: "Credit", icon: NotebookPen },
] as const

export function PosClient({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("")
  const [cart, setCart] = useState<Line[]>([])
  const [discount, setDiscount] = useState(0)
  const [taxRate, setTaxRate] = useState(0)
  const [payment, setPayment] = useState<(typeof PAYMENTS)[number]["value"]>("cash")
  const [pending, startTransition] = useTransition()
  const [seeding, startSeeding] = useTransition()

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q))
  }, [query, products])

  function addToCart(p: Product) {
    if (p.quantity <= 0) {
      toast.error(`${p.name} is out of stock`)
      return
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.product_id === p.id)
      if (existing) {
        if (existing.quantity >= p.quantity) {
          toast.error(`Only ${p.quantity} ${p.name} in stock`)
          return prev
        }
        return prev.map((l) => (l.product_id === p.id ? { ...l, quantity: l.quantity + 1 } : l))
      }
      return [
        ...prev,
        {
          product_id: p.id,
          product_name: p.name,
          quantity: 1,
          unit_price: Number(p.selling_price),
          cost_price: Number(p.cost_price),
          stock: p.quantity,
        },
      ]
    })
  }

  function changeQty(id: string, delta: number) {
    setCart((prev) =>
      prev.flatMap((l) => {
        if (l.product_id !== id) return [l]
        const next = l.quantity + delta
        if (next <= 0) return []
        if (next > l.stock) {
          toast.error(`Only ${l.stock} in stock`)
          return [l]
        }
        return [{ ...l, quantity: next }]
      }),
    )
  }

  function removeLine(id: string) {
    setCart((prev) => prev.filter((l) => l.product_id !== id))
  }

  const subtotal = cart.reduce((a, l) => a + l.unit_price * l.quantity, 0)
  const safeDiscount = Math.min(Math.max(discount || 0, 0), subtotal)
  const taxable = subtotal - safeDiscount
  const tax = Math.round(taxable * ((taxRate || 0) / 100) * 100) / 100
  const total = taxable + tax

  function handleCheckout() {
    if (cart.length === 0) {
      toast.error("Cart is empty")
      return
    }
    startTransition(async () => {
      const res = await checkout({
        lines: cart.map(({ stock, ...rest }) => rest),
        discount: safeDiscount,
        taxRate: taxRate || 0,
        paymentMethod: payment,
        customerId: null,
      })
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      toast.success(`Sale complete - ${res.receiptNumber} (${formatKES(res.total)})`)
      setCart([])
      setDiscount(0)
    })
  }

  function handleSeed() {
    startSeeding(async () => {
      const res = await seedProducts()
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      toast.success(`Added ${res.count} sample products`)
    })
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* Products */}
      <div className="flex flex-col gap-4 lg:col-span-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products by name or brand..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <PackageOpen className="size-6" />
              </span>
              <h2 className="text-lg font-semibold">No products yet</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                Add sample products to start testing the point of sale.
              </p>
              <Button onClick={handleSeed} disabled={seeding}>
                {seeding && <Loader2 className="size-4 animate-spin" />}
                Add sample products
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.quantity <= 0}
                className="flex flex-col rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="line-clamp-2 text-sm font-medium">{p.name}</span>
                {p.brand && <span className="text-xs text-muted-foreground">{p.brand}</span>}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{formatKES(Number(p.selling_price))}</span>
                  <Badge variant={p.quantity <= 0 ? "destructive" : "secondary"} className="text-xs">
                    {p.quantity <= 0 ? "Out" : `${p.quantity}`}
                  </Badge>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">No products match.</p>
            )}
          </div>
        )}
      </div>

      {/* Cart */}
      <div className="lg:col-span-2">
        <Card className="flex h-full flex-col">
          <CardContent className="flex flex-1 flex-col gap-4 p-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-5" />
              <h2 className="font-semibold">Current sale</h2>
              {cart.length > 0 && <Badge variant="secondary">{cart.length}</Badge>}
            </div>

            <ScrollArea className="h-[280px] pr-2">
              {cart.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Tap a product to add it to the sale.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {cart.map((l) => (
                    <div key={l.product_id} className="flex items-center gap-2 rounded-lg border border-border p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{l.product_name}</p>
                        <p className="text-xs text-muted-foreground">{formatKES(l.unit_price)} each</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="outline" className="size-7" onClick={() => changeQty(l.product_id, -1)}>
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">{l.quantity}</span>
                        <Button size="icon" variant="outline" className="size-7" onClick={() => changeQty(l.product_id, 1)}>
                          <Plus className="size-3" />
                        </Button>
                      </div>
                      <span className="w-16 text-right text-sm font-semibold">{formatKES(l.unit_price * l.quantity)}</span>
                      <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => removeLine(l.product_id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="discount" className="text-xs">Discount (KES)</Label>
                <Input
                  id="discount"
                  type="number"
                  min={0}
                  value={discount || ""}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="tax" className="text-xs">Tax (%)</Label>
                <Input
                  id="tax"
                  type="number"
                  min={0}
                  value={taxRate || ""}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Payment method</Label>
              <Select value={payment} onValueChange={(v) => setPayment(v as typeof payment)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENTS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">
                        <p.icon className="size-4" /> {p.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-auto flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatKES(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span>- {formatKES(safeDiscount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>{formatKES(tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatKES(total)}</span>
              </div>
            </div>

            <Button size="lg" onClick={handleCheckout} disabled={pending || cart.length === 0}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Complete sale
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
