'use server'

import { createClient } from '@/lib/supabase/server'
import { getPublishedAtForStatusChange } from '@/lib/research/publication'

export interface ResearchRecord {
  id: string
  title: string
  type: string
  abstract: string
  status: string
  user_id: string
  author_name: string
  adviser_id?: string
  adviser_name?: string
  created_at: string
  published_at?: string
  views_count: number
  downloads_count: number
  file_url?: string
  keywords?: string[]
}

/**
 * Fetch all research records (admin has no RLS constraints)
 */
export async function getAllResearch(
  statusFilter?: string,
  typeFilter?: string
): Promise<ResearchRecord[]> {
  const supabase = await createClient()

  try {
    let query = supabase
      .from('research')
      .select(
        `
        id, 
        title, 
        type, 
        abstract, 
        status, 
        user_id, 
        adviser_id,
        created_at, 
        published_at,
        views_count,
        downloads_count,
        file_url,
        keywords
      `
      )
      .order('created_at', { ascending: false })

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (typeFilter && typeFilter !== 'all') {
      query = query.eq('type', typeFilter)
    }

    const { data: research, error } = await query

    if (error) {
      console.error('Error fetching research:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      return []
    }

    // Enrich with author and adviser names
    const enrichedResearch: ResearchRecord[] = []

    if (research && research.length > 0) {
      for (const item of research) {
        // Get author name
        const { data: authorProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', item.user_id)
          .single()

        const authorName = authorProfile
          ? `${authorProfile.first_name} ${authorProfile.last_name}`
          : 'Unknown'

        // Get adviser name if available
        let adviserName = 'N/A'
        if (item.adviser_id) {
          const { data: adviserProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', item.adviser_id)
            .single()

          adviserName = adviserProfile
            ? `${adviserProfile.first_name} ${adviserProfile.last_name}`
            : 'Unknown'
        }

        enrichedResearch.push({
          id: item.id,
          title: item.title,
          type: item.type,
          abstract: item.abstract,
          status: item.status,
          user_id: item.user_id,
          author_name: authorName,
          adviser_id: item.adviser_id,
          adviser_name: adviserName,
          created_at: item.created_at,
          published_at: item.published_at,
          views_count: item.views_count || 0,
          downloads_count: item.downloads_count || 0,
          file_url: item.file_url,
          keywords: item.keywords,
        })
      }
    }

    return enrichedResearch
  } catch (error) {
    console.error('Unexpected error fetching research:', error)
    return []
  }
}

/**
 * Delete a research record and its associated file
 */
export async function forceDeleteResearch(researchId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    // Verify admin access
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (!adminProfile || adminProfile.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Get the research record to find the file URL
    const { data: research, error: fetchError } = await supabase
      .from('research')
      .select('file_url')
      .eq('id', researchId)
      .single()

    if (fetchError) {
      return { success: false, error: 'Research not found' }
    }

    // Delete file from storage if it exists
    if (research?.file_url) {
      try {
        const filePathMatch = research.file_url.match(/research-files%2F(.+)\?/)
        if (filePathMatch) {
          const filePath = decodeURIComponent(filePathMatch[1])
          await supabase.storage.from('research-files').remove([filePath])
        }
      } catch (storageError) {
        console.log('Note: Could not delete associated file from storage', storageError)
      }
    }

    // Delete research record
    const { error: deleteError } = await supabase
      .from('research')
      .delete()
      .eq('id', researchId)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error deleting research:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Override research status
 */
export async function overrideResearchStatus(
  researchId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    // Verify admin access
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (!adminProfile || adminProfile.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Update research status
    const { data: currentResearch, error: fetchError } = await supabase
      .from('research')
      .select('status, published_at')
      .eq('id', researchId)
      .single()

    if (fetchError || !currentResearch) {
      return { success: false, error: 'Research not found' }
    }

    const { error } = await supabase
      .from('research')
      .update({
        status: newStatus,
        published_at: getPublishedAtForStatusChange(
          currentResearch.status,
          newStatus,
          currentResearch.published_at
        ),
      })
      .eq('id', researchId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error updating research status:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Archive all sections (semester archiving)
 */
export async function archiveAllSections(): Promise<{ success: boolean; error?: string; archivedCount?: number }> {
  const supabase = await createClient()

  try {
    // Verify admin access
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (!adminProfile || adminProfile.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Get count of non-archived sections
    const { count: countBefore } = await supabase
      .from('sections')
      .select('*', { count: 'exact', head: true })
      .eq('is_archived', false)

    // Archive all active sections
    const { error } = await supabase
      .from('sections')
      .update({ is_archived: true, is_frozen: true, updated_at: new Date().toISOString() })
      .eq('is_archived', false)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, archivedCount: countBefore || 0 }
  } catch (error) {
    console.error('Unexpected error archiving sections:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
