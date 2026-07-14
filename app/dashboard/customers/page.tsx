import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CustomerList } from '@/components/customers/customer-list'
import { CreditSales } from '@/components/customers/credit-sales'
import { getShop } from '@/app/actions/shop'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Customers | Jirani Shop',
  description: 'Manage customers and credit sales',
}

export default async function CustomersPage() {
  const shop = await getShop()

  if (!shop) {
    redirect('/auth/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground mt-2">
          Manage your customer relationships and credit sales
        </p>
      </div>

      <Tabs defaultValue="customers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="customers">All Customers</TabsTrigger>
          <TabsTrigger value="credit-sales">Credit Sales</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          <CustomerList shopId={shop.id} />
        </TabsContent>

        <TabsContent value="credit-sales" className="space-y-4">
          <CreditSales shopId={shop.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
