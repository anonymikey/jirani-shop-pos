'use server'

import { createClient } from '@/lib/supabase/server'

export async function getShop() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  if (!user) return null

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', user.id)
      .single()

    if (!profile?.shop_id) return null

    const { data: shop } = await supabase
      .from('shops')
      .select('*')
      .eq('id', profile.shop_id)
      .single()

    return shop
  } catch (error) {
    console.error('[v0] Error getting shop:', error)
    return null
  }
}
