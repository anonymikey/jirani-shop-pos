'use client'

import { useState, useEffect } from 'react'
import { Customer } from '@/types/shop'
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
import { Plus, Search, Edit2, Trash2, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/currency'
import { getCustomers, deleteCustomer, getCustomerStats } from '@/app/actions/customers'
import { CustomerForm } from './customer-form'

interface CustomerListProps {
  shopId: string
}

export function CustomerList({ shopId }: CustomerListProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalPurchases: 0,
    totalOutstandingDebt: 0,
    debtorsCount: 0,
    overdueCount: 0,
  })

  useEffect(() => {
    loadData()
  }, [shopId])

  useEffect(() => {
    let filtered = customers

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.phone.toLowerCase().includes(query)
      )
    }

    setFilteredCustomers(filtered)
  }, [customers, searchQuery])

  async function loadData() {
    try {
      setLoading(true)
      const [customersRes, statsRes] = await Promise.all([
        getCustomers(shopId),
        getCustomerStats(shopId),
      ])

      if (customersRes.customers) {
        setCustomers(customersRes.customers)
      }

      if (statsRes.stats) {
        setStats(statsRes.stats)
      }
    } catch (error) {
      console.error('[v0] Error loading customers:', error)
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(customerId: string, name: string) {
    if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return

    try {
      const result = await deleteCustomer(shopId, customerId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Customer deleted')
        setCustomers(customers.filter((c) => c.id !== customerId))
      }
    } catch (error) {
      toast.error('Failed to delete customer')
    }
  }

  function getStatusBadge(customer: Customer) {
    if (customer.outstanding_balance === 0) {
      return <Badge variant="outline">Settled</Badge>
    }
    if (customer.status === 'overdue') {
      return <Badge variant="destructive">Overdue</Badge>
    }
    return <Badge variant="secondary">Has Debt</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Total Customers</div>
          <div className="text-2xl font-bold">{stats.totalCustomers}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Total Sales</div>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalPurchases, false)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Outstanding Debt</div>
          <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.totalOutstandingDebt, false)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Debtors</div>
          <div className="text-2xl font-bold">{stats.debtorsCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Overdue</div>
          <div className="text-2xl font-bold text-red-600">{stats.overdueCount}</div>
        </Card>
      </div>

      {/* Header and Search */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold">Customers</h2>
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead className="text-right">Total Purchases</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="hidden md:table-cell">Credit Limit</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading customers...
                </TableCell>
              </TableRow>
            ) : filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No customers found
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(customer.total_purchases, false)}</TableCell>
                  <TableCell className={`text-right font-semibold ${customer.outstanding_balance > 0 ? 'text-yellow-600' : ''}`}>
                    {formatCurrency(customer.outstanding_balance, false)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-right">{formatCurrency(customer.credit_limit, false)}</TableCell>
                  <TableCell className="text-center">{getStatusBadge(customer)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCustomer(customer)
                          setShowForm(true)
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(customer.id, customer.name)}
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

      {showForm && (
        <CustomerForm
          shopId={shopId}
          customer={selectedCustomer || undefined}
          onClose={() => {
            setShowForm(false)
            setSelectedCustomer(null)
          }}
          onSuccess={() => {
            loadData()
            setShowForm(false)
            setSelectedCustomer(null)
          }}
        />
      )}
    </div>
  )
}
