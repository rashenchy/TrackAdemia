'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function ResearchRealtimeRefresh({ researchId }: { researchId: string }) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      refreshTimeoutRef.current = setTimeout(() => {
        router.refresh()
      }, 250)
    }

    const channel = supabase
      .channel(`research-page:${researchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'research',
          filter: `id=eq.${researchId}`,
        },
        scheduleRefresh
      )
      .subscribe()

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      supabase.removeChannel(channel)
    }
  }, [researchId, router, supabase])

  return null
}
