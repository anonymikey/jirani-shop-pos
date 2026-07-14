'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ReceiptTemplate, ReceiptData } from './receipt-template'

interface ReceiptPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  receiptData: ReceiptData | null
}

export function ReceiptPreviewModal({ open, onOpenChange, receiptData }: ReceiptPreviewModalProps) {
  if (!receiptData) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receipt Preview</DialogTitle>
          <DialogDescription>
            Receipt #{receiptData.receipt_number}
          </DialogDescription>
        </DialogHeader>
        <ReceiptTemplate data={receiptData} />
      </DialogContent>
    </Dialog>
  )
}
