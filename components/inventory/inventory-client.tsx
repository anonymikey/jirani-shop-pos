'use client'

import { useState, useEffect } from 'react'
import { Product } from '@/types/shop'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Search, Edit2, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/currency'
import { getProducts, deleteProduct, getInventoryStats } from '@/app/actions/inventory'
import { ProductForm } from './product-form'
import { StockAdjustment } from './stock-adjustment'

interface InventoryClientProps {
  shopId: string
}

/**
 * Inventory Management Client Component
 * Displays product list, allows CRUD operations, stock adjustments
 */
export function InventoryClient({ shopId }: InventoryClientProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showProductForm, setShowProductForm] = useState(false)
  const [showStockAdjustment, setShowStockAdjustment] = useState(false)
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalItems: 0,
    inventoryValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  })
  const [view, setView] = useState<'all' | 'low-stock' | 'out-of-stock'>('all')

  // Load products on mount
  useEffect(() => {
    loadData()
  }, [shopId])

  // Filter products based on view and search
  useEffect(() => {
    let filtered = [...products]

    if (view === 'low-stock') {
      filtered = filtered.filter((p) => p.quantity > 0 && p.quantity <= p.reorder_level)
    } else if (view === 'out-of-stock') {
      filtered = filtered.filter((p) => p.quantity === 0)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query) ||
          p.barcode?.toLowerCase().includes(query)
      )
    }

    setFilteredProducts(filtered)
  }, [products, view, searchQuery])

  async function loadData() {
    try {
      setLoading(true)
      const [productsRes, statsRes] = await Promise.all([
        getProducts(shopId),
        getInventoryStats(shopId),
      ])

      if (productsRes.products) {
        setProducts(productsRes.products)
      }

      if (statsRes && 'totalProducts' in statsRes) {
        setStats({
          totalProducts: statsRes.totalProducts,
          totalItems: statsRes.totalItems,
          inventoryValue: statsRes.inventoryValue,
          lowStockCount: statsRes.lowStockCount,
          outOfStockCount: statsRes.outOfStockCount,
        })
      }
    } catch (error) {
      console.error('[v0] Error loading inventory:', error)
      toast.error('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(productId: string) {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const result = await deleteProduct(shopId, productId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Product deleted successfully')
        setProducts(products.filter((p) => p.id !== productId))
      }
    } catch (error) {
      toast.error('Failed to delete product')
    }
  }

  function handleEditProduct(product: Product) {
    setSelectedProduct(product)
    setShowProductForm(true)
  }

  function handleStockAdjustment(product: Product) {
    setSelectedProduct(product)
    setShowStockAdjustment(true)
  }

  function getStockStatus(product: Product) {
    if (product.quantity === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>
    }
    if (product.quantity <= product.reorder_level) {
      return <Badge variant="secondary">Low Stock</Badge>
    }
    return <Badge variant="outline">In Stock</Badge>
  }

  const profitMargin = products.length > 0
    ? products.reduce((sum, p) => sum + (p.selling_price - p.cost_price) * p.quantity, 0)
    : 0

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Total Products</div>
          <div className="text-2xl font-bold">{stats.totalProducts}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Total Items</div>
          <div className="text-2xl font-bold">{stats.totalItems.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Inventory Value</div>
          <div className="text-2xl font-bold">{formatCurrency(stats.inventoryValue, false)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Low Stock</div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStockCount}</div>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Out of Stock</div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-red-600">{stats.outOfStockCount}</div>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Tabs and Search */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Tabs
            defaultValue="all"
            value={view}
            onValueChange={(v) => setView(v as typeof view)}
            className="w-full md:w-auto"
          >
            <TabsList>
              <TabsTrigger value="all">All Products</TabsTrigger>
              <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
              <TabsTrigger value="out-of-stock">Out of Stock</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button onClick={() => setShowProductForm(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead className="hidden md:table-cell">SKU / Barcode</TableHead>
              <TableHead className="text-right">Cost Price</TableHead>
              <TableHead className="text-right">Selling Price</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="hidden md:table-cell">Reorder Level</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Loading inventory...
                </TableCell>
              </TableRow>
            ) : filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No products found
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => (
                <TableRow key={product.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {product.sku && <div>{product.sku}</div>}
                    {product.barcode && <div className="text-xs">{product.barcode}</div>}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(product.cost_price, false)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(product.selling_price, false)}</TableCell>
                  <TableCell className="text-right font-semibold">{product.quantity}</TableCell>
                  <TableCell className="hidden md:table-cell text-right">{product.reorder_level}</TableCell>
                  <TableCell className="text-center">{getStockStatus(product)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStockAdjustment(product)}
                        title="Adjust stock"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                        title="Edit product"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                        title="Delete product"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modals */}
      {showProductForm && (
        <ProductForm
          shopId={shopId}
          product={selectedProduct || undefined}
          onClose={() => {
            setShowProductForm(false)
            setSelectedProduct(null)
          }}
          onSuccess={() => {
            loadData()
            setShowProductForm(false)
            setSelectedProduct(null)
          }}
        />
      )}

      {showStockAdjustment && selectedProduct && (
        <StockAdjustment
          shopId={shopId}
          product={selectedProduct}
          onClose={() => {
            setShowStockAdjustment(false)
            setSelectedProduct(null)
          }}
          onSuccess={() => {
            loadData()
            setShowStockAdjustment(false)
            setSelectedProduct(null)
          }}
        />
      )}
    </div>
  )
}
