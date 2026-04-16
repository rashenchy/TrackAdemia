import type { SupabaseClient } from '@supabase/supabase-js'

export function getPublishedAtForStatusChange(
  previousStatus: string | null | undefined,
  nextStatus: string,
  currentPublishedAt: string | null | undefined
) {
  if (nextStatus === 'Published') {
    if (previousStatus !== 'Published' || !currentPublishedAt) {
      return new Date().toISOString()
    }

    return currentPublishedAt
  }

  return null
}

export async function researchHasPublishablePdf(
  supabase: SupabaseClient,
  researchId: string
) {
  const [{ data: research }, { data: latestPdfVersion }] = await Promise.all([
    supabase
      .from('research')
      .select('file_url')
      .eq('id', researchId)
      .maybeSingle(),
    supabase
      .from('research_versions')
      .select('file_url')
      .eq('research_id', researchId)
      .not('file_url', 'is', null)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  return Boolean(research?.file_url || latestPdfVersion?.file_url)
}
