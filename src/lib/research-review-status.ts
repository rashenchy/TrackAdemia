'use server'

import { createClient } from '@/lib/supabase/server'

type SupabaseClientLike = Awaited<ReturnType<typeof createClient>>

export async function syncResearchReviewStatus(
  supabase: SupabaseClientLike,
  researchId: string
) {
  const { data: research, error: researchError } = await supabase
    .from('research')
    .select('status')
    .eq('id', researchId)
    .single()

  if (researchError) throw researchError

  const { count, error: annotationError } = await supabase
    .from('annotations')
    .select('id', { count: 'exact', head: true })
    .eq('research_id', researchId)
    .eq('is_resolved', false)

  if (annotationError) throw annotationError

  const hasUnresolvedAnnotations = (count ?? 0) > 0

  if (hasUnresolvedAnnotations && research?.status === 'Pending Review') {
    const { error } = await supabase
      .from('research')
      .update({ status: 'Revision Requested' })
      .eq('id', researchId)

    if (error) throw error

    return 'Revision Requested'
  }

  if (!hasUnresolvedAnnotations && research?.status === 'Revision Requested') {
    const { error } = await supabase
      .from('research')
      .update({ status: 'Pending Review' })
      .eq('id', researchId)

    if (error) throw error

    return 'Pending Review'
  }

  return research?.status ?? null
}
