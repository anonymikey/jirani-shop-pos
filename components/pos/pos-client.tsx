"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
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
import { clearOfflineOperation, getOfflineCatalog, getOfflineOperations, queueOfflineOperation, saveOfflineCatalog, updateOfflineOperation } from "@/lib/offline-queue"
import { Search, Plus, Minus, Trash2, ShoppingCart, PackageOpen, Banknote, Smartphone, CreditCard, NotebookPen, Loader2, ArrowDown, Check } from "lucide-react"

type Product = {
  id: string
  name: string
  brand: string | null
  selling_price: number
  cost_price: number
  quantity: number
}

type Customer = {
  id: string
  name: string
  phone: string | null
  credit_limit: number
}

type Line = CartLine & { stock: number }

const PAYMENTS = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "mpesa", label: "M-Pesa", icon: Smartphone },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "debt", label: "Credit", icon: NotebookPen },
] as const

export function PosClient({ products, customers }: { products: Product[]; customers: Customer[] }) {
  const [query, setQuery] = useState("")
  const [catalog, setCatalog] = useState<Product[]>(products)
  const [cart, setCart] = useState<Line[]>([])
  const [discount, setDiscount] = useState(0)
  const [taxRate, setTaxRate] = useState(0)
  const [payment, setPayment] = useState<(typeof PAYMENTS)[number]["value"]>("cash")
  const [amountPaid, setAmountPaid] = useState(0)
  const [paidEdited, setPaidEdited] = useState(false)
  const [customerId, setCustomerId] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [debtorAttempted, setDebtorAttempted] = useState(false)
  const [dueAt, setDueAt] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })
  const [pending, startTransition] = useTransition()
  const [seeding, startSeeding] = useTransition()
  const [offlineCount, setOfflineCount] = useState(0)
  const [checkoutVisible, setCheckoutVisible] = useState(false)
  const checkoutRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkoutElement = checkoutRef.current
    if (!checkoutElement) return
    const observer = new IntersectionObserver(([entry]) => setCheckoutVisible(entry.isIntersecting), { threshold: 0.15 })
    observer.observe(checkoutElement)
    return () => observer.disconnect()
  }, [])

  function continueToCheckout() {
    const checkoutElement = checkoutRef.current
    if (!checkoutElement) return
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    checkoutElement.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" })
    window.setTimeout(() => checkoutElement.focus({ preventScroll: true }), reduceMotion ? 0 : 450)
  }

  const syncOffline = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return
    const operations = await getOfflineOperations()
    setOfflineCount(operations.length)
    for (const operation of operations) {
      if (operation.nextRetryAt > Date.now()) continue
      try {
        const result = await checkout(operation.payload as Parameters<typeof checkout>[0])
        if ("error" in result) throw new Error(result.error)
        await clearOfflineOperation(operation.idempotencyKey)
        toast.success(`Offline sale synced${result.duplicate ? " (already recorded)" : ""}`)
      } catch (error) {
        const attempts = operation.attempts + 1
        await updateOfflineOperation(operation.idempotencyKey, { status: "failed", attempts, lastError: error instanceof Error ? error.message : "Sync failed", nextRetryAt: Date.now() + Math.min(300000, 1000 * 2 ** attempts) })
      }
    }
    setOfflineCount((await getOfflineOperations()).length)
  }, [])

  useEffect(() => {
    const handleOnline = () => void syncOffline()
    const handleServiceWorker = (event: MessageEvent) => {
      if (event.data?.type === "jirani-sync-request") handleOnline()
    }
    window.addEventListener("online", handleOnline)
    navigator.serviceWorker?.addEventListener("message", handleServiceWorker)
    void navigator.serviceWorker?.ready.then((registration) => {
      const sync = (registration as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } }).sync
      return sync?.register("jirani-offline-sync").catch(() => undefined)
    })
    const timer = window.setTimeout(handleOnline, 0)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener("online", handleOnline)
      navigator.serviceWorker?.removeEventListener("message", handleServiceWorker)
    }
  }, [syncOffline])

  useEffect(() => {
    if (products.length > 0) void saveOfflineCatalog(products)
    else void getOfflineCatalog<Product[]>().then((cached) => cached && setCatalog(cached))
  }, [products])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter((p) => p.name.toLowerCase().includes(q) || (p.brand ?? "").toLowerCase().includes(q))
  }, [query, catalog])

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
      if (!paidEdited) setAmountPaid((current) => current + Number(p.selling_price))
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
  const outstanding = Math.max(0, total - amountPaid)
  const showCheckoutGuide = cart.length > 0 && !checkoutVisible
  const selectedCustomer = customers.find((customer) => customer.id === customerId)
  const debtorQuery = customerName.trim().toLowerCase()
  const debtorSuggestions = customers
    .filter((customer) => !debtorQuery || customer.name.toLowerCase().includes(debtorQuery) || (customer.phone ?? "").includes(debtorQuery))
    .sort((a, b) => Number((b as Customer & { balance?: number }).balance ?? 0) - Number((a as Customer & { balance?: number }).balance ?? 0))
    .slice(0, 6)
  const debtorNeedsAttention = debtorAttempted && outstanding > 0 && !customerId && !customerName.trim()

  function customerBalance(customer: Customer | undefined) {
    return Number((customer as (Customer & { balance?: number }) | undefined)?.balance ?? 0)
  }

  function handleCheckout() {
    if (cart.length === 0) {
      toast.error("Cart is empty")
      return
    }
    if (amountPaid < 0 || amountPaid > total) {
      toast.error("Amount paid must be between zero and the sale total")
      return
    }
    if (outstanding > 0 && !customerId && !customerName.trim()) {
      setDebtorAttempted(true)
      toast.error("Enter or select the debtor for the outstanding balance")
      return
    }
    if (outstanding > 0 && !dueAt) {
      toast.error("Set a due date for the outstanding balance")
      return
    }
    const idempotencyKey = crypto.randomUUID()
    const payload = {
      lines: cart.map((line) => ({ product_id: line.product_id, product_name: line.product_name, quantity: line.quantity, unit_price: line.unit_price, cost_price: line.cost_price })),
      discount: safeDiscount,
      taxRate: taxRate || 0,
      paymentMethod: payment,
      amountPaid,
      customerId: outstanding > 0 ? customerId || null : null,
      customerName: outstanding > 0 ? customerName.trim() || null : null,
      dueAt: outstanding > 0 ? new Date(`${dueAt}T23:59:59`).toISOString() : null,
      idempotencyKey,
    }
    startTransition(async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await queueOfflineOperation({ operation: "checkout", payload, idempotencyKey })
        setOfflineCount((count) => count + 1)
        setCart([])
        toast.success("Sale saved offline and will sync when you reconnect")
        return
      }
      const res = await checkout(payload)
      if ("error" in res) {
        if (/network|fetch|failed to fetch/i.test(res.error ?? "")) {
          await queueOfflineOperation({ operation: "checkout", payload, idempotencyKey })
          setOfflineCount((count) => count + 1)
          setCart([])
          toast.success("Sale saved offline and will sync when you reconnect")
          return
        }
        toast.error(res.error)
        return
      }
      toast.success(`Sale complete - ${res.receiptNumber} (${formatKES(res.total)})`)
      setCart([])
      setDiscount(0)
      setAmountPaid(0)
      setPaidEdited(false)
      setCustomerId("")
      setCustomerName("")
      setDebtorAttempted(false)
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
    <>
      {showCheckoutGuide && cart.length > 0 && !checkoutVisible && (
        <div className="pointer-events-none fixed inset-x-3 bottom-4 z-20 flex justify-center md:inset-x-auto md:right-6 md:w-auto" aria-live="polite">
          <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl border border-primary/40 bg-card/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/85">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              {cart.length === 1 ? <Check aria-hidden="true" /> : <ShoppingCart aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{cart.length === 1 ? "Product added" : `${cart.length} items in cart`}</p>
              <p className="text-xs text-muted-foreground">{cart.length === 1 ? "Scroll down to complete the sale" : "Review & complete sale"}</p>
            </div>
            <Button type="button" size="sm" onClick={continueToCheckout} aria-label="Continue to checkout">
              <ArrowDown data-icon="inline-end" aria-hidden="true" />
              <span className="hidden sm:inline">Continue to checkout</span>
              <span className="sm:hidden">Checkout</span>
            </Button>
          </div>
        </div>
      )}
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

        {catalog.length === 0 ? (
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
      <div ref={checkoutRef} tabIndex={-1} className="scroll-mt-20 outline-none lg:col-span-2">
        <Card className="flex h-full flex-col">
          <CardContent className="flex flex-1 flex-col gap-4 p-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-5" />
              <h2 className="font-semibold">Current sale</h2>
              {cart.length > 0 && <Badge variant="secondary">{cart.length}</Badge>}
              {offlineCount > 0 && <><Badge variant="outline">{offlineCount} awaiting sync</Badge><Button type="button" size="sm" variant="ghost" onClick={() => void syncOffline()}>Sync now</Button></>}
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
              <Label htmlFor="amount-paid" className="text-xs">Amount paid</Label>
              <Input
                id="amount-paid"
                type="number"
                min={0}
                max={total}
                step="0.01"
                value={amountPaid || ""}
                onChange={(e) => { setPaidEdited(true); setAmountPaid(Number(e.target.value)) }}
                placeholder={formatKES(total)}
              />
              <p className="text-xs text-muted-foreground">
                Outstanding: {formatKES(outstanding)}
              </p>
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

            {outstanding > 0 ? (
              <div className={`flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3 ${debtorNeedsAttention ? "debtor-needs-attention" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label htmlFor="credit-customer" className="text-xs">Customer / Debtor</Label>
                    <p className="mt-1 text-xs text-muted-foreground">Outstanding {formatKES(outstanding)}</p>
                  </div>
                  {selectedCustomer && <Badge variant="secondary">Existing</Badge>}
                </div>
                <div className="grid gap-1.5">
                  <Input
                    id="credit-customer"
                    value={customerName}
                    onChange={(e) => { setCustomerName(e.target.value); setCustomerId(""); setDebtorAttempted(false) }}
                    placeholder="Search or enter debtor name"
                    aria-describedby="credit-customer-help"
                    autoFocus
                  />
                  {!customerId && (
                    <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-1" role="listbox" aria-label="Debtor suggestions">
                      {debtorSuggestions.map((customer) => (
                        <button key={customer.id} type="button" role="option" aria-selected={false} className="flex items-center justify-between gap-3 rounded px-2 py-2 text-left text-sm hover:bg-accent" onClick={() => { setCustomerId(customer.id); setCustomerName(customer.name) }}>
                          <span className="min-w-0"><span className="block truncate">{customer.name}</span>{customer.phone && <span className="block text-xs text-muted-foreground">{customer.phone}</span>}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">Debt {formatKES(customerBalance(customer))}</span>
                        </button>
                      ))}
                      <p className="px-2 py-1 text-xs text-muted-foreground">{debtorSuggestions.length ? "Select an existing debtor or continue with a new name." : "No matching debtor. This name will be created at checkout."}</p>
                    </div>
                  )}
                  {selectedCustomer ? (
                    <p id="credit-customer-help" className="text-xs text-muted-foreground">Current debt {formatKES(customerBalance(selectedCustomer))} · Projected balance {formatKES(customerBalance(selectedCustomer) + outstanding)}</p>
                  ) : (
                    <p id="credit-customer-help" className="text-xs text-muted-foreground">A new debtor will be created at checkout.</p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="credit-due" className="text-xs">Due date</Label>
                  <Input id="credit-due" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                </div>
                {debtorNeedsAttention && <p className="text-xs text-destructive" role="alert">Select an existing debtor or enter a name before completing this sale.</p>}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">Fully paid — no debtor required.</div>
            )}

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
        <style jsx>{`
          @keyframes debtor-edge-glow {
            0%, 100% { box-shadow: 0 0 0 0 hsl(var(--primary) / 0); }
            50% { box-shadow: 0 0 0 2px hsl(var(--primary) / 0.35); }
          }
          .debtor-needs-attention {
            animation: debtor-edge-glow 1.8s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .debtor-needs-attention { animation: none; }
          }
        `}</style>
      </div>
      </div>
    </>
  )
}
