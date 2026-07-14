'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getDailySalesReport, getWeeklySalesReport, getInventoryReport, getCreditReport, getProfitReport } from '@/app/actions/reports'
import { formatCurrency } from '@/lib/utils/currency'
import { Skeleton } from '@/components/ui/skeleton'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

interface ReportData {
  date: string
  sales: number
  transactions: number
}

interface InventoryReportData {
  category: string
  value: number
  items: number
}

export function ReportsDashboard({ shopId }: { shopId: string }) {
  const [loading, setLoading] = useState(true)
  const [dailyData, setDailyData] = useState<ReportData[]>([])
  const [weeklyData, setWeeklyData] = useState<ReportData[]>([])
  const [monthlyData, setMonthlyData] = useState<ReportData[]>([])
  const [inventoryData, setInventoryData] = useState<InventoryReportData[]>([])
  const [creditData, setCreditData] = useState<any>(null)
  const [profitData, setProfitData] = useState<any>(null)

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true)
        const today = new Date().toISOString().split('T')[0]
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const [daily, weekly, monthly, inventory, credit, profit] = await Promise.all([
          getDailySalesReport(shopId, today),
          getWeeklySalesReport(shopId, weekAgo, today),
          getWeeklySalesReport(shopId, monthAgo, today),
          getInventoryReport(shopId),
          getCreditReport(shopId),
          getProfitReport(shopId, monthAgo, today),
        ])

        if (daily.report) setDailyData([daily.report])
        if (weekly.report) setWeeklyData(Array.isArray(weekly.report) ? weekly.report : [weekly.report])
        if (monthly.report) setMonthlyData(Array.isArray(monthly.report) ? monthly.report : [monthly.report])
        if (inventory.report) setInventoryData(Array.isArray(inventory.report) ? inventory.report : [inventory.report])
        if (credit.report) setCreditData(credit.report)
        if (profit.report) setProfitData(profit.report)
      } catch (error) {
        console.error('[v0] Error loading reports:', error)
      } finally {
        setLoading(false)
      }
    }

    loadReports()
  }, [shopId])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  const totalDailySales = dailyData.reduce((sum, d) => sum + d.sales, 0)
  const totalWeeklySales = weeklyData.reduce((sum, d) => sum + d.sales, 0)
  const totalMonthlySales = monthlyData.reduce((sum, d) => sum + d.sales, 0)
  const totalInventoryValue = inventoryData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="space-y-6">
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="credit">Credit</TabsTrigger>
          <TabsTrigger value="profit">Profit</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          {/* Daily Sales */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Sales</CardTitle>
              <CardDescription>Today's sales transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-background p-4 border">
                  <div className="text-sm font-medium text-muted-foreground">Total Sales</div>
                  <div className="text-2xl font-bold">{formatCurrency(totalDailySales)}</div>
                </div>
                <div className="rounded-lg bg-background p-4 border">
                  <div className="text-sm font-medium text-muted-foreground">Transactions</div>
                  <div className="text-2xl font-bold">{dailyData.length}</div>
                </div>
              </div>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="sales" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No sales data available</div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Sales */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Sales</CardTitle>
              <CardDescription>This week's performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-background p-4 border">
                  <div className="text-sm font-medium text-muted-foreground">Total Sales</div>
                  <div className="text-2xl font-bold">{formatCurrency(totalWeeklySales)}</div>
                </div>
                <div className="rounded-lg bg-background p-4 border">
                  <div className="text-sm font-medium text-muted-foreground">Days Active</div>
                  <div className="text-2xl font-bold">{weeklyData.length}</div>
                </div>
              </div>
              {weeklyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Line type="monotone" dataKey="sales" stroke="#10b981" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No weekly data available</div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Sales */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Sales</CardTitle>
              <CardDescription>This month's trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-background p-4 border">
                  <div className="text-sm font-medium text-muted-foreground">Total Sales</div>
                  <div className="text-2xl font-bold">{formatCurrency(totalMonthlySales)}</div>
                </div>
                <div className="rounded-lg bg-background p-4 border">
                  <div className="text-sm font-medium text-muted-foreground">Average Daily</div>
                  <div className="text-2xl font-bold">
                    {monthlyData.length > 0 ? formatCurrency(totalMonthlySales / monthlyData.length) : 'KES 0'}
                  </div>
                </div>
              </div>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="sales" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No monthly data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Valuation</CardTitle>
              <CardDescription>Current stock value by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 rounded-lg bg-background p-4 border">
                <div className="text-sm font-medium text-muted-foreground">Total Inventory Value</div>
                <div className="text-3xl font-bold">{formatCurrency(totalInventoryValue)}</div>
              </div>
              {inventoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={inventoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, value }) => `${category}: ${formatCurrency(value)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {inventoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No inventory data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit" className="space-y-6">
          {creditData ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total On Credit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(creditData.totalOnCredit)}</div>
                  <p className="text-xs text-muted-foreground mt-1">All time credit sales</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Amount Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{formatCurrency(creditData.totalPending)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{creditData.pendingCount} transactions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Amount Collected</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(creditData.totalPaid)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{creditData.salesCount} transactions</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {creditData.totalOnCredit > 0 ? ((creditData.totalPaid / creditData.totalOnCredit) * 100).toFixed(1) : '0'}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Paid vs Total</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">No credit data available</div>
          )}
        </TabsContent>

        <TabsContent value="profit" className="space-y-6">
          {profitData ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(profitData.totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total sales</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">COGS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(profitData.totalCOGS)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Cost of goods</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{formatCurrency(profitData.totalExpenses)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Operating expenses</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${profitData.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(profitData.netProfit)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {profitData.totalRevenue > 0 ? ((profitData.netProfit / profitData.totalRevenue) * 100).toFixed(1) : '0'}% margin
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">No profit data available</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
