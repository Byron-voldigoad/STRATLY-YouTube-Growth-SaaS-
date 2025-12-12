'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function useAuth(redirectToLogin = true) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session && redirectToLogin) {
        router.push('/login')
      } else {
        setUser(session?.user || null)
        setLoading(false)
      }
    }
    
    checkAuth()
  }, [router, redirectToLogin])

  return { user, loading }
}