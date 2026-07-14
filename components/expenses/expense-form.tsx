'use client'

import { useState } from 'react'
import { Expense } from '@/types/shop'
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
import { createExpense, updateExpense } from '@/app/actions/expenses'

interface ExpenseFormProps {
  shopId: string
  expense?: Expense
  onClose: () => void
  onSuccess: () => void
}

const EXPENSE_CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'water', label: 'Water' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'internet', label: 'Internet' },
  { value: 'transport', label: 'Transport' },
  { value: 'other', label: 'Other' },
]

export function ExpenseForm({ shopId, expense, onClose, onSuccess }: ExpenseFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    category: (expense?.category || 'rent') as Expense['category'],
    amount: expense?.amount || 0,
    description: expense?.description || '',
    date: expense?.date || new Date().toISOString().split('T')[0],
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

    if (!formData.amount || !formData.description) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      setLoading(true)

      let result

      if (expense?.id) {
        result = await updateExpense(shopId, expense.id, {
          ...formData,
          shop_id: shopId,
        })
      } else {
        result = await createExpense(shopId, {
          ...formData,
          shop_id: shopId,
        })
      }

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(expense?.id ? 'Expense updated' : 'Expense created')
        onSuccess()
      }
    } catch (error) {
      toast.error('Failed to save expense')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{expense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          <DialogDescription>
            {expense ? 'Update expense details' : 'Record a new business expense'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category and Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Category
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value as any }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">
                Amount (KES)
              </Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0"
                step="50"
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium">
              Date
            </Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="e.g., Monthly office rent payment"
              className="min-h-20"
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
              {expense ? 'Update Expense' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
