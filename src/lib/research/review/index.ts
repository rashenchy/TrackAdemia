'use server'

import { syncResearchReviewStatus as syncResearchReviewStatusFromWorkflow } from '@/lib/research/workflow'

export async function syncResearchReviewStatus(
  supabase: any,
  researchId: string,
  actorId?: string | null,
  eventKeySuffix?: string | null
) {
  return syncResearchReviewStatusFromWorkflow(
    supabase,
    researchId,
    actorId,
    eventKeySuffix
  )
}
