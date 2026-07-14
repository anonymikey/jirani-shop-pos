import { createClient } from "@/lib/supabase/server"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ExpenseForm } from "@/components/expenses/expense-form"
import { ExpensesList } from "@/components/expenses/expenses-list"
import { redirect } from "next/navigation"

export const metadata = {
  title: 'Expenses | Jirani Shop',
  description: 'Track and manage business expenses',
}

export default async function ExpensesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('shop_id')
    .eq('id', user.id)
    .single()

  if (!profile?.shop_id) {
    redirect('/auth/login')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
        <p className="text-muted-foreground mt-2">
          Track rent, utilities, salaries and other business expenses
        </p>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Expenses</TabsTrigger>
          <TabsTrigger value="add">Add Expense</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <ExpensesList shopId={profile.shop_id} />
        </TabsContent>

        <TabsContent value="add" className="space-y-4">
          <ExpenseForm shopId={profile.shop_id} onSuccess={() => {}} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
