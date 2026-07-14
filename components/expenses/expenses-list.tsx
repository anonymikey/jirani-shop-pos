'use client'

import { useState, useEffect } from 'react'
import { Expense } from '@/types/shop'
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
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { getExpenses, deleteExpense, getExpenseStats } from '@/app/actions/expenses'
import { ExpenseForm } from './expense-form'

interface ExpensesListProps {
  shopId: string
}

const EXPENSE_COLORS: Record<string, string> = {
  rent: 'bg-blue-50 text-blue-700',
  electricity: 'bg-yellow-50 text-yellow-700',
  water: 'bg-cyan-50 text-cyan-700',
  salaries: 'bg-purple-50 text-purple-700',
  internet: 'bg-indigo-50 text-indigo-700',
  transport: 'bg-orange-50 text-orange-700',
  other: 'bg-gray-50 text-gray-700',
}

export function ExpensesList({ shopId }: ExpensesListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [stats, setStats] = useState({
    totalExpenses: 0,
    thisMonthExpenses: 0,
    thisWeekExpenses: 0,
    averageDailyExpense: 0,
  })

  useEffect(() => {
    loadData()
  }, [shopId])

  useEffect(() => {
    let filtered = expenses

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (e) =>
          e.description.toLowerCase().includes(query) ||
          e.category.toLowerCase().includes(query)
      )
    }

    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    setFilteredExpenses(filtered)
  }, [expenses, searchQuery])

  async function loadData() {
    try {
      setLoading(true)
      const [expensesRes, statsRes] = await Promise.all([
        getExpenses(shopId),
        getExpenseStats(shopId),
      ])

      if (expensesRes.expenses) {
        setExpenses(expensesRes.expenses)
      }

      if (statsRes.stats) {
        setStats(statsRes.stats)
      }
    } catch (error) {
      console.error('[v0] Error loading expenses:', error)
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(expenseId: string) {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      const result = await deleteExpense(shopId, expenseId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Expense deleted')
        setExpenses(expenses.filter((e) => e.id !== expenseId))
      }
    } catch (error) {
      toast.error('Failed to delete expense')
    }
  }

  function getCategoryColor(category: string) {
    return EXPENSE_COLORS[category] || EXPENSE_COLORS.other
  }

  function getCategoryLabel(category: string) {
    return category.charAt(0).toUpperCase() + category.slice(1)
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Total Expenses</div>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalExpenses, false)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">This Month</div>
          <div className="text-2xl font-bold">{formatCurrency(stats.thisMonthExpenses, false)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">This Week</div>
          <div className="text-2xl font-bold">{formatCurrency(stats.thisWeekExpenses, false)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs font-medium text-muted-foreground">Avg Daily</div>
          <div className="text-2xl font-bold">{formatCurrency(stats.averageDailyExpense, false)}</div>
        </Card>
      </div>

      {/* Header and Search */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold">Expenses</h2>
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by description or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading expenses...
                </TableCell>
              </TableRow>
            ) : filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No expenses found
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((expense) => (
                <TableRow key={expense.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{formatDate(expense.date)}</TableCell>
                  <TableCell>
                    <Badge className={getCategoryColor(expense.category)}>
                      {getCategoryLabel(expense.category)}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm">{expense.description}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(expense.amount, false)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedExpense(expense)
                          setShowForm(true)
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(expense.id)}
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
        <ExpenseForm
          shopId={shopId}
          expense={selectedExpense || undefined}
          onClose={() => {
            setShowForm(false)
            setSelectedExpense(null)
          }}
          onSuccess={() => {
            loadData()
            setShowForm(false)
            setSelectedExpense(null)
          }}
        />
      )}
    </div>
  )
}
