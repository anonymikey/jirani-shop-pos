'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Printer, Download } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import QRCode from 'qrcode.react'

export interface ReceiptItem {
  product_name: string
  quantity: number
  unit_price: number
  total: number
  discount?: number
}

export interface ReceiptData {
  receipt_number: string
  date: string
  time: string
  cashier: string
  shop_name: string
  shop_phone?: string
  shop_location?: string
  items: ReceiptItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  amount_paid: number
  change: number
  payment_method: 'cash' | 'mpesa' | 'card' | 'credit'
  customer_name?: string
  credit_sales_details?: {
    credit_limit: number
    amount_paid: number
    balance: number
    due_date: string
  }
  qr_code?: string
  notes?: string
}

export function ReceiptTemplate({ data }: { data: ReceiptData }) {
  const receiptRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '', 'width=600,height=800')
      if (printWindow) {
        printWindow.document.write(receiptRef.current.innerHTML)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  const handleDownload = () => {
    // Implementation for PDF download using libraries like jsPDF
    console.log('[v0] PDF download not yet implemented - use print to PDF instead')
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          PDF
        </Button>
      </div>

      <Card>
        <CardContent className="p-0" ref={receiptRef}>
          <div className="w-full max-w-sm mx-auto p-6 font-mono text-sm" style={{ fontSize: '11px', lineHeight: '1.4' }}>
            {/* Header */}
            <div className="text-center space-y-1 mb-4 pb-4 border-b">
              <div className="text-lg font-bold">{data.shop_name}</div>
              {data.shop_phone && <div>{data.shop_phone}</div>}
              {data.shop_location && <div>{data.shop_location}</div>}
            </div>

            {/* Receipt Info */}
            <div className="space-y-1 mb-4 pb-4 border-b text-xs">
              <div className="flex justify-between">
                <span>Receipt #:</span>
                <span className="font-bold">{data.receipt_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{data.date}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{data.time}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{data.cashier}</span>
              </div>
              {data.customer_name && (
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span>{data.customer_name}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="mb-4 pb-4 border-b">
              <div className="space-y-2">
                {data.items.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-semibold">{item.product_name}</span>
                      <span className="font-semibold">{formatCurrency(item.total)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{item.quantity} x {formatCurrency(item.unit_price)}</span>
                      {item.discount && <span>-{formatCurrency(item.discount)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1 mb-4 pb-4 border-b text-xs">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(data.subtotal)}</span>
              </div>
              {data.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-{formatCurrency(data.discount)}</span>
                </div>
              )}
              {data.tax > 0 && (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(data.tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-2">
                <span>TOTAL:</span>
                <span>{formatCurrency(data.total)}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="space-y-1 mb-4 pb-4 border-b text-xs">
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-semibold capitalize">{data.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount Paid:</span>
                <span>{formatCurrency(data.amount_paid)}</span>
              </div>
              <div className="flex justify-between">
                <span>Change:</span>
                <span>{formatCurrency(data.change)}</span>
              </div>
            </div>

            {/* Credit Sales Details */}
            {data.credit_sales_details && (
              <div className="space-y-1 mb-4 pb-4 border-b text-xs bg-yellow-50 p-2 rounded">
                <div className="font-bold text-center mb-2">CREDIT SALE</div>
                <div className="flex justify-between">
                  <span>Credit Limit:</span>
                  <span>{formatCurrency(data.credit_sales_details.credit_limit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(data.credit_sales_details.amount_paid)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Remaining Balance:</span>
                  <span>{formatCurrency(data.credit_sales_details.balance)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Due Date:</span>
                  <span>{data.credit_sales_details.due_date}</span>
                </div>
              </div>
            )}

            {/* QR Code */}
            {data.qr_code && (
              <div className="flex justify-center mb-4">
                <QRCode value={data.qr_code} size={100} />
              </div>
            )}

            {/* Footer */}
            <div className="text-center space-y-2 text-xs">
              <div className="font-semibold">Thank You!</div>
              <div>Please come again</div>
              {data.notes && <div className="italic">{data.notes}</div>}
              <div className="text-gray-500 mt-4">Powered by Jirani Shop</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
