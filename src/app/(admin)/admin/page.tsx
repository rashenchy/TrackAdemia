/* =========================================
   IMPORTS
   - redirect: navigation control
   - createClient: Supabase server client
   - analytics actions: data fetchers
   - client component for rendering
   - types for metrics
========================================= */
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

/* =========================================
   FALLBACK METRICS
   - Used when analytics loading fails
========================================= */
const EMPTY_METRICS: AnalyticsMetrics = {
  totalUsers: 0,
  pendingFaculty: 0,
  totalPublishedPapers: 0,
  totalPendingPapers: 0,
}

/* =========================================
   LOAD DASHBOARD DATA
   - Fetches all analytics in parallel
   - Returns safe fallback on failure
========================================= */
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

/* =========================================
   ADMIN OVERVIEW PAGE (SERVER COMPONENT)
   - Auth check
   - Role validation (admin only)
   - Loads analytics data
   - Passes data to client dashboard
========================================= */
export default async function AdminOverviewPage() {

  /* =========================================
     SUPABASE CLIENT INIT
  ========================================= */
  const supabase = await createClient()

  /* =========================================
     AUTH CHECK
     Redirect if not logged in
  ========================================= */
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  /* =========================================
     ROLE CHECK
     Ensure user is admin
  ========================================= */
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  /* =========================================
     LOAD ANALYTICS DATA
  ========================================= */
  const { metrics, programData, typeData, topResearch, error } =
    await loadAdminDashboardData()

  /* =========================================
     RENDER CLIENT DASHBOARD
  ========================================= */
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