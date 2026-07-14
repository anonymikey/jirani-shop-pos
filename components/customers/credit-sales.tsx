'use client'

import { useState, useEffect } from 'react'
import { CreditSale } from '@/types/shop'
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
import { Search, Download, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/currency'
import { getCreditSales, getCreditSalesStats } from '@/app/actions/customers'
import { formatDate } from '@/lib/utils/date'

interface CreditSalesProps {
  shopId: string
}

export function CreditSales({ shopId }: CreditSalesProps) {
  const [sales, setSales] = useState<CreditSale[]>([])
  const [filteredSales, setFilteredSales] = useState<CreditSale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState({
    totalOnCredit: 0,
    totalPending: 0,
    totalPaid: 0,
    salesCount: 0,
    pendingCount: 0,
  })

  useEffect(() => {
    loadData()
  }, [shopId])

  useEffect(() => {
    let filtered = sales

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.customer_name.toLowerCase().includes(query) ||
          (s.notes && s.notes.toLowerCase().includes(query))
      )
    }

    setFilteredSales(filtered)
  }, [sales, searchQuery])

  async function loadData() {
    try {
      setLoading(true)
      const [salesRes, statsRes] = await Promise.all([
        getCreditSales(shopId),
        getCreditSalesStats(shopId),
      ])

      if (salesRes.sales) {
        setSales(salesRes.sales)
      }

      if (statsRes.stats) {
        setStats(statsRes.stats)
      }
    } catch (error) {
      console.error('[v0] Error loading credit sales:', error)
      toast.error('Failed to load credit sales')
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: string, dueDate?: string) {
    if (status === 'paid') {
      return <Badge variant="outline" className="bg-green-50 text-green-700">Paid</Badge>
    }

    if (dueDate) {
      const due = new Date(dueDate)
      const today = new Date()
      if (due < today) {
        return <Badge variant="destructive">Overdue</Badge>
      }
    }

    return <Badge variant="secondary">Pending</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Total on Credit</div>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalOnCredit, false)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Total Pending</div>
          <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.totalPending, false)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Total Paid</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalPaid, false)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Total Sales</div>
          <div className="text-2xl font-bold">{stats.salesCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Pending</div>
          <div className="text-2xl font-bold text-orange-600">{stats.pendingCount}</div>
        </Card>
      </div>

      {/* Header and Search */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold">Credit Sales</h2>
          <Button size="sm" className="gap-2" disabled>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Sales Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="hidden md:table-cell">Due</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading credit sales...
                </TableCell>
              </TableRow>
            ) : filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No credit sales found
                </TableCell>
              </TableRow>
            ) : (
              filteredSales.map((sale) => (
                <TableRow key={sale.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{sale.customer_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {sale.items_count} {sale.items_count === 1 ? 'item' : 'items'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(sale.amount, false)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {formatDate(sale.date)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {sale.due_date ? formatDate(sale.due_date) : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(sale.status, sale.due_date)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
