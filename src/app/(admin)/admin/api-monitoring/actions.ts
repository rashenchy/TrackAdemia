'use server'

import { createClient } from '@/lib/supabase/server'

export interface GrammarCheckLog {
  id: string
  user_id: string
  user_name?: string
  research_id: string
  research_title?: string
  status: 'success' | 'failed' | 'pending'
  error_message?: string
  processing_time_ms: number
  characters_checked: number
  issues_found: number
  created_at: string
}

export interface GrammarMetrics {
  totalChecks: number
  successfulChecks: number
  failedChecks: number
  averageProcessingTime: number
  totalCharactersChecked: number
  averageIssuesPerCheck: number
  dailyChecks: Array<{ date: string; count: number }>
  topUsers: Array<{ user_name: string; checks: number }>
  successRate: number
}

interface GrammarLogRow {
  id: string
  user_id: string
  research_id: string
  status: 'success' | 'failed' | 'pending'
  error_message?: string
  processing_time_ms: number
  characters_checked: number
  issues_found: number
  created_at: string
}

const EMPTY_GRAMMAR_METRICS: GrammarMetrics = {
  totalChecks: 0,
  successfulChecks: 0,
  failedChecks: 0,
  averageProcessingTime: 0,
  totalCharactersChecked: 0,
  averageIssuesPerCheck: 0,
  dailyChecks: [],
  topUsers: [],
  successRate: 0,
}

function getErrorInfo(error: unknown) {
  if (error && typeof error === 'object') {
    const maybeError = error as {
      message?: string
      details?: string
      hint?: string
      code?: string
    }

    return {
      message: maybeError.message,
      details: maybeError.details,
      hint: maybeError.hint,
      code: maybeError.code,
    }
  }

  return { message: String(error) }
}

function isMissingGrammarLogTable(error: unknown) {
  const { message, code } = getErrorInfo(error)
  return code === '42P01' || message?.includes('grammar_check_logs')
}

async function enrichGrammarLogs(logs: GrammarLogRow[]): Promise<GrammarCheckLog[]> {
  if (logs.length === 0) {
    return []
  }

  const supabase = await createClient()
  const userIds = [...new Set(logs.map((log) => log.user_id))]
  const researchIds = [...new Set(logs.map((log) => log.research_id))]

  const [{ data: profiles }, { data: researchItems }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', userIds),
    supabase
      .from('research')
      .select('id, title')
      .in('id', researchIds),
  ])

  return logs.map((log) => {
    const profile = profiles?.find((item) => item.id === log.user_id)
    const research = researchItems?.find((item) => item.id === log.research_id)

    return {
      ...log,
      user_name: profile
        ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Unknown'
        : 'Unknown',
      research_title: research?.title || 'Unknown',
    }
  })
}

export async function logGrammarCheck(
  userId: string,
  researchId: string,
  status: 'success' | 'failed' | 'pending',
  processingTimeMs: number,
  charactersChecked: number,
  issuesFound: number,
  errorMessage?: string
): Promise<GrammarCheckLog | null> {
  try {
    const supabase = await createClient()

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (profile?.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required')
    }

    const { data, error } = await supabase
      .from('grammar_check_logs')
      .insert([
        {
          user_id: userId,
          research_id: researchId,
          status,
          processing_time_ms: processingTimeMs,
          characters_checked: charactersChecked,
          issues_found: issuesFound,
          error_message: errorMessage || null,
        },
      ])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error logging grammar check:', err)
    return null
  }
}

export async function getGrammarCheckLogs(limit: number = 100): Promise<GrammarCheckLog[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('grammar_check_logs')
      .select(
        'id, user_id, research_id, status, error_message, processing_time_ms, characters_checked, issues_found, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      if (isMissingGrammarLogTable(error)) {
        return []
      }
      throw error
    }

    return enrichGrammarLogs((data || []) as GrammarLogRow[])
  } catch (err) {
    console.error('Error fetching grammar check logs:', getErrorInfo(err))
    return []
  }
}

export async function getGrammarMetrics(): Promise<GrammarMetrics | null> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('grammar_check_logs')
      .select('*')

    if (error) {
      if (isMissingGrammarLogTable(error)) {
        return EMPTY_GRAMMAR_METRICS
      }
      throw error
    }

    const logs = (data || []) as GrammarLogRow[]
    if (logs.length === 0) {
      return EMPTY_GRAMMAR_METRICS
    }

    const successfulChecks = logs.filter((log) => log.status === 'success').length
    const failedChecks = logs.filter((log) => log.status === 'failed').length

    const avgProcessingTime =
      logs.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0) /
      logs.length

    const totalCharsChecked = logs.reduce(
      (sum, log) => sum + (log.characters_checked || 0),
      0
    )

    const avgIssuesPerCheck =
      logs.reduce((sum, log) => sum + (log.issues_found || 0), 0) / logs.length

    // Daily checks
    const dailyMap = new Map<string, number>()
    logs.forEach((log) => {
      const date = new Date(log.created_at).toISOString().split('T')[0]
      dailyMap.set(date, (dailyMap.get(date) || 0) + 1)
    })
    const dailyChecks = Array.from(dailyMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Top users
    const userMap = new Map<string, number>()
    logs.forEach((log) => {
      userMap.set(log.user_id, (userMap.get(log.user_id) || 0) + 1)
    })
    const topUsers = Array.from(userMap.entries())
      .map(([userId, checks]) => ({ user_name: userId, checks }))
      .sort((a, b) => b.checks - a.checks)
      .slice(0, 5)

    return {
      totalChecks: logs.length,
      successfulChecks,
      failedChecks,
      averageProcessingTime: Math.round(avgProcessingTime),
      totalCharactersChecked: Math.round(totalCharsChecked),
      averageIssuesPerCheck: Math.round(avgIssuesPerCheck * 10) / 10,
      dailyChecks,
      topUsers,
      successRate: Math.round((successfulChecks / logs.length) * 100),
    }
  } catch (err) {
    console.error('Error fetching grammar metrics:', getErrorInfo(err))
    return EMPTY_GRAMMAR_METRICS
  }
}

export async function getGrammarChecksByDateRange(
  startDate: string,
  endDate: string
): Promise<GrammarCheckLog[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('grammar_check_logs')
      .select(
        'id, user_id, research_id, status, error_message, processing_time_ms, characters_checked, issues_found, created_at'
      )
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false })

    if (error) {
      if (isMissingGrammarLogTable(error)) {
        return []
      }
      throw error
    }

    return enrichGrammarLogs((data || []) as GrammarLogRow[])
  } catch (err) {
    console.error('Error fetching grammar checks by date range:', getErrorInfo(err))
    return []
  }
}

export async function exportGrammarMetrics(startDate: string, endDate: string): Promise<string> {
  try {
    const logs = await getGrammarChecksByDateRange(startDate, endDate)

    const headers = [
      'User',
      'Research',
      'Status',
      'Processing Time (ms)',
      'Characters Checked',
      'Issues Found',
      'Date',
    ]

    const csv = [
      headers.join(','),
      ...logs.map((log) =>
        [
          `"${log.user_name || 'Unknown'}"`,
          `"${log.research_title || 'Unknown'}"`,
          log.status,
          log.processing_time_ms,
          log.characters_checked,
          log.issues_found,
          new Date(log.created_at).toISOString(),
        ].join(',')
      ),
    ].join('\n')

    return csv
  } catch (err) {
    console.error('Error exporting grammar metrics:', err)
    return ''
  }
}
