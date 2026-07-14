'use client'

import { useState } from 'react'
import { Customer } from '@/types/shop'
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
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { createCustomer, updateCustomer } from '@/app/actions/customers'
import { formatCurrency } from '@/lib/utils/currency'

interface CustomerFormProps {
  shopId: string
  customer?: Customer
  onClose: () => void
  onSuccess: () => void
}

export function CustomerForm({ shopId, customer, onClose, onSuccess }: CustomerFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    alt_phone: customer?.alt_phone || '',
    location: customer?.location || '',
    notes: customer?.notes || '',
    credit_limit: customer?.credit_limit || 5000,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name || !formData.phone) {
      toast.error('Please fill in required fields')
      return
    }

    try {
      setLoading(true)

      let result

      if (customer?.id) {
        result = await updateCustomer(shopId, customer.id, {
          ...formData,
          shop_id: shopId,
        })
      } else {
        result = await createCustomer(shopId, {
          ...formData,
          shop_id: shopId,
        })
      }

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(customer?.id ? 'Customer updated' : 'Customer created')
        onSuccess()
      }
    } catch (error) {
      toast.error('Failed to save customer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          <DialogDescription>
            {customer ? 'Update customer details' : 'Create a new customer account'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name and Phone */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Full Name *
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., John Mwangi"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone *
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="e.g., 0712345678"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alt_phone" className="text-sm font-medium">
                Alt Phone
              </Label>
              <Input
                id="alt_phone"
                name="alt_phone"
                value={formData.alt_phone}
                onChange={handleChange}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium">
              Location
            </Label>
            <Input
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Westlands, Nairobi"
            />
          </div>

          {/* Credit Limit */}
          <div className="space-y-2">
            <Label htmlFor="credit_limit" className="text-sm font-medium">
              Credit Limit (KES)
            </Label>
            <div className="space-y-1">
              <Input
                id="credit_limit"
                name="credit_limit"
                type="number"
                value={formData.credit_limit}
                onChange={handleChange}
                placeholder="5000"
                step="100"
              />
              <div className="text-xs text-muted-foreground">
                Current limit: {formatCurrency(formData.credit_limit)}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes
            </Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Add any notes about this customer..."
              className="min-h-20"
            />
          </div>

          {customer && (
            <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Total Purchases: </span>
                <span className="font-semibold">{formatCurrency(customer.total_purchases)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Outstanding Balance: </span>
                <span className="font-semibold">{formatCurrency(customer.outstanding_balance)}</span>
              </div>
            </div>
          )}

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
              {customer ? 'Update Customer' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
