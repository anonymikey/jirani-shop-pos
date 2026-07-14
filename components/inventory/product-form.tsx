'use client'

import { useState, useEffect } from 'react'
import { Product } from '@/types/shop'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { createProduct, updateProduct } from '@/app/actions/inventory'
import { calculateMargin, formatCurrency } from '@/lib/utils/currency'

interface ProductFormProps {
  shopId: string
  product?: Product
  onClose: () => void
  onSuccess: () => void
}

/**
 * Product Form Component
 * Add or edit product with all fields including cost price, SKU, barcode, etc.
 */
export function ProductForm({ shopId, product, onClose, onSuccess }: ProductFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: product?.name || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    category_id: product?.category_id || '',
    category_name: product?.category_name || '',
    supplier: product?.supplier || '',
    cost_price: product?.cost_price || 0,
    selling_price: product?.selling_price || 0,
    quantity: product?.quantity || 0,
    reorder_level: product?.reorder_level || 5,
    expiry_date: product?.expiry_date || '',
  })

  const margin = calculateMargin(formData.cost_price, formData.selling_price)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name || formData.cost_price <= 0 || formData.selling_price <= 0) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)

      let result

      if (product?.id) {
        result = await updateProduct(shopId, product.id, {
          ...formData,
          shop_id: shopId,
        })
      } else {
        result = await createProduct(shopId, {
          ...formData,
          shop_id: shopId,
        })
      }

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(product?.id ? 'Product updated successfully' : 'Product created successfully')
        onSuccess()
      }
    } catch (error) {
      toast.error('Failed to save product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {product ? 'Update product details' : 'Create a new product in your inventory'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Product Name *
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Maize Flour 2kg"
              required
            />
          </div>

          {/* SKU and Barcode */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku" className="text-sm font-medium">
                SKU
              </Label>
              <Input
                id="sku"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                placeholder="e.g., MF-2KG"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="barcode" className="text-sm font-medium">
                Barcode
              </Label>
              <Input
                id="barcode"
                name="barcode"
                value={formData.barcode}
                onChange={handleChange}
                placeholder="e.g., 5011111111111"
              />
            </div>
          </div>

          {/* Category and Supplier */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category_name" className="text-sm font-medium">
                Category
              </Label>
              <Input
                id="category_name"
                name="category_name"
                value={formData.category_name}
                onChange={handleChange}
                placeholder="e.g., Grains"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier" className="text-sm font-medium">
                Supplier
              </Label>
              <Input
                id="supplier"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                placeholder="e.g., Pembe Mills"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost_price" className="text-sm font-medium">
                Cost Price (KES) *
              </Label>
              <Input
                id="cost_price"
                name="cost_price"
                type="number"
                value={formData.cost_price}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="selling_price" className="text-sm font-medium">
                Selling Price (KES) *
              </Label>
              <Input
                id="selling_price"
                name="selling_price"
                type="number"
                value={formData.selling_price}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                required
              />
            </div>
          </div>

          {/* Profit Margin Display */}
          {formData.cost_price > 0 && formData.selling_price > 0 && (
            <div className="rounded-lg bg-muted p-3">
              <div className="text-sm font-medium">Profit Margin: {margin.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">
                Profit per unit: {formatCurrency(formData.selling_price - formData.cost_price)}
              </div>
            </div>
          )}

          {/* Stock Levels */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-sm font-medium">
                Current Quantity
              </Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="0"
                step="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorder_level" className="text-sm font-medium">
                Reorder Level
              </Label>
              <Input
                id="reorder_level"
                name="reorder_level"
                type="number"
                value={formData.reorder_level}
                onChange={handleChange}
                placeholder="5"
                step="1"
              />
            </div>
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label htmlFor="expiry_date" className="text-sm font-medium">
              Expiry Date (Optional)
            </Label>
            <Input
              id="expiry_date"
              name="expiry_date"
              type="date"
              value={formData.expiry_date}
              onChange={handleChange}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {product ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
