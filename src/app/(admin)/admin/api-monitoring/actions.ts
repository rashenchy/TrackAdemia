'use server'

import { createClient } from '@/lib/supabase/server'
import type { MonitoredProvider, MonitoredStatus } from '@/lib/api-monitoring/service'

export interface ApiMonitoringLog {
  id: string
  provider: MonitoredProvider
  api_name: string
  endpoint?: string | null
  user_id?: string | null
  user_name: string
  status: MonitoredStatus
  response_time_ms: number
  input_units: number
  output_units: number
  error_message?: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface ProviderMetrics {
  provider: MonitoredProvider
  label: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  validationErrors: number
  successRate: number
  averageResponseTime: number
  totalInputUnits: number
  totalOutputUnits: number
  lastActivity: string | null
  extraMetrics: Array<{ label: string; value: string }>
}

export interface SupabaseMonitoringMetrics {
  totalUsers: number
  totalMentors: number
  totalStudents: number
  totalResearch: number
  publishedResearch: number
  pendingResearch: number
  totalSections: number
  activeSectionMembers: number
  totalAnnotations: number
  unresolvedAnnotations: number
  totalTasks: number
  unresolvedTasks: number
  totalVersions: number
  totalViews: number
  totalDownloads: number
  totalBookmarks: number
}

export interface MonitoringDashboardData {
  providerMetrics: ProviderMetrics[]
  supabaseMetrics: SupabaseMonitoringMetrics
  recentLogs: ApiMonitoringLog[]
  dailyActivity: Array<{
    date: string
    gemini: number
    groq: number
    serpapi: number
  }>
}

interface ApiRequestLogRow {
  id: string
  provider: MonitoredProvider
  api_name: string
  endpoint?: string | null
  user_id?: string | null
  status: MonitoredStatus
  response_time_ms: number
  input_units: number
  output_units: number
  error_message?: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

function toNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function formatProviderLabel(provider: MonitoredProvider) {
  if (provider === 'gemini') return 'Gemini'
  if (provider === 'groq') return 'Groq'
  if (provider === 'serpapi') return 'SerpAPI'
  return 'Supabase'
}

function getProviderExtraMetrics(
  provider: MonitoredProvider,
  logs: ApiRequestLogRow[]
): Array<{ label: string; value: string }> {
  if (provider === 'gemini' || provider === 'groq') {
    const totalCorrections = logs.reduce(
      (sum, log) => sum + toNumber(log.output_units),
      0
    )

    return [
      { label: 'Characters Checked', value: logs.reduce((sum, log) => sum + toNumber(log.input_units), 0).toLocaleString() },
      { label: 'Corrections Returned', value: totalCorrections.toLocaleString() },
    ]
  }

  if (provider === 'serpapi') {
    const totalQueries = logs.reduce(
      (sum, log) => sum + toNumber(log.metadata?.query_count),
      0
    )
    const totalMatches = logs.reduce(
      (sum, log) => sum + toNumber(log.output_units),
      0
    )

    return [
      { label: 'Text Characters Checked', value: logs.reduce((sum, log) => sum + toNumber(log.input_units), 0).toLocaleString() },
      { label: 'Search Queries Triggered', value: totalQueries.toLocaleString() },
      { label: 'Matches Found', value: totalMatches.toLocaleString() },
    ]
  }

  return []
}

async function enrichLogs(logs: ApiRequestLogRow[]): Promise<ApiMonitoringLog[]> {
  if (logs.length === 0) return []

  const supabase = await createClient()
  const userIds = [
    ...new Set(
      logs.map((log) => log.user_id).filter((userId): userId is string => Boolean(userId))
    ),
  ]

  let profiles: Array<{ id: string; first_name: string; last_name: string }> = []

  if (userIds.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds)

    profiles = data || []
  }

  return logs.map((log) => {
    const profile = profiles.find((item) => item.id === log.user_id)

    return {
      ...log,
      user_name: profile
        ? `${profile.first_name} ${profile.last_name}`.trim()
        : 'Anonymous / System',
      metadata: log.metadata ?? {},
    }
  })
}

async function getRequestLogs(limit = 100) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('api_request_logs')
    .select(
      'id, provider, api_name, endpoint, user_id, status, response_time_ms, input_units, output_units, error_message, metadata, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (error.code === '42P01') {
      return [] as ApiRequestLogRow[]
    }

    throw error
  }

  return (data || []) as ApiRequestLogRow[]
}

async function getProviderMetrics(logs: ApiRequestLogRow[]): Promise<ProviderMetrics[]> {
  const providers: MonitoredProvider[] = ['groq', 'serpapi']

  return providers.map((provider) => {
    const providerLogs = logs.filter((log) => log.provider === provider)
    const totalRequests = providerLogs.length
    const successfulRequests = providerLogs.filter((log) => log.status === 'success').length
    const failedRequests = providerLogs.filter((log) => log.status === 'failed').length
    const validationErrors = providerLogs.filter(
      (log) => log.status === 'validation_error'
    ).length
    const averageResponseTime =
      totalRequests > 0
        ? Math.round(
            providerLogs.reduce(
              (sum, log) => sum + toNumber(log.response_time_ms),
              0
            ) / totalRequests
          )
        : 0
    const totalInputUnits = providerLogs.reduce(
      (sum, log) => sum + toNumber(log.input_units),
      0
    )
    const totalOutputUnits = providerLogs.reduce(
      (sum, log) => sum + toNumber(log.output_units),
      0
    )

    return {
      provider,
      label: formatProviderLabel(provider),
      totalRequests,
      successfulRequests,
      failedRequests,
      validationErrors,
      successRate:
        totalRequests > 0
          ? Math.round((successfulRequests / totalRequests) * 100)
          : 0,
      averageResponseTime,
      totalInputUnits,
      totalOutputUnits,
      lastActivity: providerLogs[0]?.created_at || null,
      extraMetrics: getProviderExtraMetrics(provider, providerLogs),
    }
  })
}

async function getSupabaseMetrics(): Promise<SupabaseMonitoringMetrics> {
  const supabase = await createClient()

  const [
    profilesResult,
    researchResult,
    sectionsResult,
    sectionMembersResult,
    annotationsResult,
    unresolvedAnnotationsResult,
    tasksResult,
    unresolvedTasksResult,
    versionsResult,
    viewsResult,
    downloadsResult,
    bookmarksResult,
  ] = await Promise.all([
    supabase.from('profiles').select('id, role'),
    supabase.from('research').select('id, status'),
    supabase.from('sections').select('id'),
    supabase.from('section_members').select('id').eq('status', 'active'),
    supabase.from('annotations').select('id'),
    supabase.from('annotations').select('id').eq('is_resolved', false),
    supabase.from('tasks').select('id, status'),
    supabase.from('tasks').select('id').eq('status', 'unresolved'),
    supabase.from('research_versions').select('id'),
    supabase.from('research_views').select('id'),
    supabase.from('research_downloads').select('id'),
    supabase.from('research_bookmarks').select('id'),
  ])

  const profiles = profilesResult.data || []
  const research = researchResult.data || []
  const tasks = tasksResult.data || []

  return {
    totalUsers: profiles.length,
    totalMentors: profiles.filter((profile) => profile.role === 'mentor').length,
    totalStudents: profiles.filter((profile) => profile.role === 'student').length,
    totalResearch: research.length,
    publishedResearch: research.filter((item) => item.status === 'Published').length,
    pendingResearch: research.filter((item) => item.status !== 'Published').length,
    totalSections: sectionsResult.data?.length || 0,
    activeSectionMembers: sectionMembersResult.data?.length || 0,
    totalAnnotations: annotationsResult.data?.length || 0,
    unresolvedAnnotations: unresolvedAnnotationsResult.data?.length || 0,
    totalTasks: tasks.length,
    unresolvedTasks: unresolvedTasksResult.data?.length || 0,
    totalVersions: versionsResult.data?.length || 0,
    totalViews: viewsResult.data?.length || 0,
    totalDownloads: downloadsResult.data?.length || 0,
    totalBookmarks: bookmarksResult.data?.length || 0,
  }
}

function buildDailyActivity(logs: ApiRequestLogRow[]) {
  const dailyMap = new Map<string, { date: string; groq: number; serpapi: number }>()

  for (const log of logs) {
    const date = new Date(log.created_at).toISOString().split('T')[0]
    const current = dailyMap.get(date) || { date, groq: 0, serpapi: 0 }

    if (log.provider === 'groq') {
      current.groq += 1
    }

    if (log.provider === 'serpapi') {
      current.serpapi += 1
    }

    dailyMap.set(date, current)
  }

  return Array.from(dailyMap.values()).sort((first, second) =>
    first.date.localeCompare(second.date)
  )
}

export async function getMonitoringDashboardData(): Promise<MonitoringDashboardData> {
  const logs = await getRequestLogs(200)
  const [providerMetrics, supabaseMetrics, recentLogs] = await Promise.all([
    getProviderMetrics(logs),
    getSupabaseMetrics(),
    enrichLogs(logs.slice(0, 100)),
  ])

  return {
    providerMetrics,
    supabaseMetrics,
    recentLogs,
    dailyActivity: buildDailyActivity(logs),
  }
}

export async function exportMonitoringData(
  startDate: string,
  endDate: string
): Promise<string> {
  const supabase = await createClient()
  const startAt = new Date(`${startDate}T00:00:00.000Z`).toISOString()
  const endAt = new Date(`${endDate}T23:59:59.999Z`).toISOString()
  const { data, error } = await supabase
    .from('api_request_logs')
    .select(
      'id, provider, api_name, endpoint, user_id, status, response_time_ms, input_units, output_units, error_message, metadata, created_at'
    )
    .gte('created_at', startAt)
    .lte('created_at', endAt)
    .order('created_at', { ascending: false })

  if (error) {
    if (error.code === '42P01') {
      return ''
    }

    throw error
  }

  const logs = await enrichLogs((data || []) as ApiRequestLogRow[])
  const headers = [
    'Provider',
    'API Name',
    'Endpoint',
    'User',
    'Status',
    'Response Time (ms)',
    'Input Units',
    'Output Units',
    'Error Message',
    'Created At',
  ]

  return [
    headers.join(','),
    ...logs.map((log) =>
      [
        log.provider,
        `"${log.api_name}"`,
        `"${log.endpoint || ''}"`,
        `"${log.user_name}"`,
        log.status,
        log.response_time_ms,
        log.input_units,
        log.output_units,
        `"${log.error_message || ''}"`,
        new Date(log.created_at).toISOString(),
      ].join(',')
    ),
  ].join('\n')
}
