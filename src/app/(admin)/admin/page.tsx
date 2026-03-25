import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getAnalyticsMetrics,
  getResearchByProgram,
  getResearchTypeDistribution,
  getTopResearch,
} from './analytics/actions'
import AdminDashboardClient from './analytics/dashboard-client'
import type { AnalyticsMetrics } from './analytics/types'

const EMPTY_METRICS: AnalyticsMetrics = {
  totalUsers: 0,
  pendingFaculty: 0,
  totalPublishedPapers: 0,
  totalPendingPapers: 0,
}

async function loadAdminDashboardData() {
  try {
    const [metrics, programData, typeData, topResearch] = await Promise.all([
      getAnalyticsMetrics(),
      getResearchByProgram(),
      getResearchTypeDistribution(),
      getTopResearch(),
    ])

    return {
      metrics,
      programData,
      typeData,
      topResearch,
      error: null,
    }
  } catch (error) {
    console.error('Error loading analytics:', error)

    return {
      metrics: EMPTY_METRICS,
      programData: [],
      typeData: [],
      topResearch: [],
      error: 'Failed to load analytics data',
    }
  }
}

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  const { metrics, programData, typeData, topResearch, error } =
    await loadAdminDashboardData()

  return (
    <AdminDashboardClient
      metrics={metrics}
      programData={programData}
      typeData={typeData}
      topResearch={topResearch}
      error={error}
    />
  )
}