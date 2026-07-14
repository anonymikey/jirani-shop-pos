'use client'

import { useState } from 'react'
import { Product } from '@/types/shop'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { adjustStock } from '@/app/actions/inventory'

interface StockAdjustmentProps {
  shopId: string
  product: Product
  onClose: () => void
  onSuccess: () => void
}

const ADJUSTMENT_REASONS = [
  'Physical Count Discrepancy',
  'Damaged Stock',
  'Expiry',
  'Return from Customer',
  'Transfer Out',
  'Transfer In',
  'Promotional Gift',
  'Staff Sample',
  'Other Adjustment',
]

/**
 * Stock Adjustment Component
 * Record inventory adjustments with reasons
 */
export function StockAdjustment({ shopId, product, onClose, onSuccess }: StockAdjustmentProps) {
  const [loading, setLoading] = useState(false)
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove'>('add')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  const quantityNum = parseInt(quantity) || 0
  const newQuantity = adjustmentType === 'add' 
    ? product.quantity + quantityNum 
    : Math.max(0, product.quantity - quantityNum)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!quantity || quantityNum <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    if (!reason) {
      toast.error('Please select a reason')
      return
    }

    try {
      setLoading(true)

      const quantityChange = adjustmentType === 'add' ? quantityNum : -quantityNum
      const reasonText = notes ? `${reason}: ${notes}` : reason

      const result = await adjustStock(shopId, product.id, quantityChange, reasonText)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Stock adjusted successfully')
        onSuccess()
      }
    } catch (error) {
      toast.error('Failed to adjust stock')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            {product.name}
            <div className="mt-2 text-sm font-semibold">
              Current Stock: <span className="text-base">{product.quantity} units</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Adjustment Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={adjustmentType === 'add' ? 'default' : 'outline'}
                onClick={() => setAdjustmentType('add')}
                className="flex-1"
              >
                Add Stock
              </Button>
              <Button
                type="button"
                variant={adjustmentType === 'remove' ? 'default' : 'outline'}
                onClick={() => setAdjustmentType('remove')}
                className="flex-1"
              >
                Remove Stock
              </Button>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-sm font-medium">
              Quantity *
            </Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              step="1"
              min="1"
              required
            />
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason *
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {ADJUSTMENT_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Additional Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional details..."
              className="min-h-24"
            />
          </div>

          {/* Preview */}
          <div className="rounded-lg bg-muted p-3 space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Current: </span>
              <span className="font-semibold">{product.quantity}</span>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Change: </span>
              <span className={`font-semibold ${adjustmentType === 'add' ? 'text-green-600' : 'text-red-600'}`}>
                {adjustmentType === 'add' ? '+' : '-'}{quantityNum}
              </span>
            </div>
            <div className="border-t pt-2 text-sm">
              <span className="text-muted-foreground">New: </span>
              <span className="font-semibold text-base">{newQuantity}</span>
            </div>
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
              Adjust Stock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
