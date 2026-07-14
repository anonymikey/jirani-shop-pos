'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { InventoryClient } from '@/components/inventory/inventory-client'
import { redirect } from 'next/navigation'

export default function InventoryPage() {
  const [shopId, setShopId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadShopId() {
      try {
        const supabase = createClient()
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

        if (profile?.shop_id) {
          setShopId(profile.shop_id)
        }
      } catch (error) {
        console.error('[v0] Failed to load shop:', error)
      } finally {
        setLoading(false)
      }
    }

    loadShopId()
  }, [])

  if (loading || !shopId) {
    return <div className="flex items-center justify-center py-12">Loading inventory...</div>
  }

  return <InventoryClient shopId={shopId} />
}
