'use server'

import { createClient } from '@/lib/supabase/server'
import type {
  AnalyticsMetrics,
  ResearchByProgram,
  ResearchTypeDistribution,
  TopResearch,
} from './types'
import { RESEARCH_TYPE_OPTIONS, getResearchTypeLabel } from '@/lib/research-types'

export async function getAnalyticsMetrics(): Promise<AnalyticsMetrics> {
  const supabase = await createClient()

  try {
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    const { count: pendingFaculty } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'mentor')
      .eq('is_verified', false)

    const { count: totalPublishedPapers } = await supabase
      .from('research')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Approved')

    const { count: totalPendingPapers } = await supabase
      .from('research')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Pending Review')

    return {
      totalUsers: totalUsers || 0,
      pendingFaculty: pendingFaculty || 0,
      totalPublishedPapers: totalPublishedPapers || 0,
      totalPendingPapers: totalPendingPapers || 0,
    }
  } catch (error) {
    console.error('Error fetching analytics metrics:', error)
    return {
      totalUsers: 0,
      pendingFaculty: 0,
      totalPublishedPapers: 0,
      totalPendingPapers: 0,
    }
  }
}

export async function getResearchByProgram(): Promise<ResearchByProgram[]> {
  const supabase = await createClient()

  try {
    const { data: research, error: researchError } = await supabase
      .from('research')
      .select('user_id')

    if (researchError || !research) return []

    const programCounts: Record<string, number> = {}

    for (const item of research) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('course_program')
        .eq('id', item.user_id)
        .single()

      if (profile?.course_program) {
        programCounts[profile.course_program] =
          (programCounts[profile.course_program] || 0) + 1
      }
    }

    return Object.entries(programCounts)
      .map(([program, count]) => ({ program, count }))
      .sort((a, b) => b.count - a.count)
  } catch (error) {
    console.error('Error fetching research by program:', error)
    return []
  }
}

export async function getResearchTypeDistribution(): Promise<ResearchTypeDistribution[]> {
  const supabase = await createClient()

  try {
    const { count: totalCount } = await supabase
      .from('research')
      .select('*', { count: 'exact', head: true })

    const distribution = await Promise.all(
      RESEARCH_TYPE_OPTIONS.map(async ({ value }) => {
        const { count } = await supabase
          .from('research')
          .select('*', { count: 'exact', head: true })
          .eq('type', value)

        const countValue = count || 0

        return {
          type: getResearchTypeLabel(value),
          count: countValue,
          percentage: totalCount
            ? Math.round((countValue / totalCount) * 100)
            : 0,
        }
      })
    )

    return distribution.sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
  } catch (error) {
    console.error('Error fetching research type distribution:', error)
    return []
  }
}

export async function getTopResearch(): Promise<TopResearch[]> {
  const supabase = await createClient()

  try {
    const { data: research, error: researchError } = await supabase
      .from('research')
      .select('id, title, user_id, views_count, downloads_count')
      .order('views_count', { ascending: false })
      .limit(10)

    if (researchError || !research) return []

    const topResearch: TopResearch[] = await Promise.all(
      research.map(async (item) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', item.user_id)
          .single()

        const author_name = profile
          ? `${profile.first_name} ${profile.last_name}`
          : 'Unknown'

        return {
          id: item.id,
          title: item.title,
          author_name,
          views_count: item.views_count || 0,
          downloads_count: item.downloads_count || 0,
          total_engagement:
            (item.views_count || 0) + (item.downloads_count || 0),
        }
      })
    )

    return topResearch
  } catch (error) {
    console.error('Error fetching top research:', error)
    return []
  }
}

export async function getPublishedResearchForExport() {
  const supabase = await createClient()

  try {
    const { data: research, error: researchError } = await supabase
      .from('research')
      .select(
        'id, title, user_id, adviser_id, type, created_at, published_at, views_count, downloads_count'
      )
      .eq('status', 'Approved')
      .order('published_at', { ascending: false })

    if (researchError || !research) return []

    const enrichedData = await Promise.all(
      research.map(async (item) => {
        const { data: author } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', item.user_id)
          .single()

        let adviser_name = 'N/A'

        if (item.adviser_id) {
          const { data: adviser } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', item.adviser_id)
            .single()

          if (adviser) {
            adviser_name = `${adviser.first_name} ${adviser.last_name}`
          }
        }

        const author_name = author
          ? `${author.first_name} ${author.last_name}`
          : 'Unknown'

        return {
          title: item.title,
          author: author_name,
          adviser: adviser_name,
          type: item.type,
          date_published: item.published_at
            ? new Date(item.published_at).toLocaleDateString()
            : 'N/A',
          views: item.views_count || 0,
          downloads: item.downloads_count || 0,
        }
      })
    )

    return enrichedData
  } catch (error) {
    console.error('Error fetching published research for export:', error)
    return []
  }
}
