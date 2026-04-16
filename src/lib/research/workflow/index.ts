'use server'

import { createNotifications } from '@/lib/notifications/service'

type SupabaseClientLike = any

export async function getUnresolvedAnnotationCount(
  supabase: SupabaseClientLike,
  researchId: string
) {
  const { count, error } = await supabase
    .from('annotations')
    .select('id', { count: 'exact', head: true })
    .eq('research_id', researchId)
    .eq('is_resolved', false)

  if (error) {
    throw error
  }

  return count ?? 0
}

async function getTeacherRecipientIds(
  supabase: SupabaseClientLike,
  subjectCode: string | null | undefined,
  adviserId: string | null | undefined
) {
  const recipientIds = new Set<string>()

  if (adviserId) {
    recipientIds.add(adviserId)
  }

  if (subjectCode) {
    const { data: sections } = await supabase
      .from('sections')
      .select('teacher_id')
      .eq('course_code', subjectCode)

    for (const section of sections || []) {
      if (section.teacher_id) {
        recipientIds.add(section.teacher_id)
      }
    }
  }

  return [...recipientIds]
}

export async function notifyTeachersForResearchSubmission(
  supabase: SupabaseClientLike,
  {
    actorId,
    researchId,
    researchTitle,
    subjectCode,
    adviserId,
    status,
    eventKeySuffix,
  }: {
    actorId: string
    researchId: string
    researchTitle: string
    subjectCode?: string | null
    adviserId?: string | null
    status: 'Pending Review' | 'Resubmitted'
    eventKeySuffix?: string | null
  }
) {
  const recipientIds = await getTeacherRecipientIds(supabase, subjectCode, adviserId)

  const notificationType =
    status === 'Pending Review' ? 'research_submission' : 'research_resubmitted'

  const title =
    status === 'Pending Review' ? 'New research submitted' : 'Research resubmitted'

  const message =
    status === 'Pending Review'
      ? `"${researchTitle}" is ready for your review.`
      : `"${researchTitle}" was resubmitted after revisions and is ready for review again.`

  await createNotifications(
    supabase,
    recipientIds
      .filter((recipientId) => recipientId !== actorId)
      .map((recipientId) => ({
        user_id: recipientId,
        actor_id: actorId,
        title,
        message,
        notification_type: notificationType,
        reason: researchId,
        reference_id: researchId,
        event_key: `${notificationType}:${researchId}:${eventKeySuffix || status}`,
        section_id: null,
      }))
  )
}

export async function notifyTeachersForResearchVersionUpload(
  supabase: SupabaseClientLike,
  {
    actorId,
    researchId,
    researchTitle,
    subjectCode,
    adviserId,
    originalFileName,
    versionNumber,
  }: {
    actorId: string
    researchId: string
    researchTitle: string
    subjectCode?: string | null
    adviserId?: string | null
    originalFileName?: string | null
    versionNumber: number
  }
) {
  const recipientIds = await getTeacherRecipientIds(supabase, subjectCode, adviserId)

  await createNotifications(
    supabase,
    recipientIds
      .filter((recipientId) => recipientId !== actorId)
      .map((recipientId) => ({
        user_id: recipientId,
        actor_id: actorId,
        title: 'New manuscript version uploaded',
        message: `"${researchTitle}" now has Version ${versionNumber}${originalFileName ? ` (${originalFileName})` : ''}.`,
        notification_type: 'research_version_uploaded',
        reason: researchId,
        reference_id: researchId,
        event_key: `research-version:${researchId}:${versionNumber}`,
      }))
  )
}

export async function notifyStudentRevisionRequested(
  supabase: SupabaseClientLike,
  {
    actorId,
    studentId,
    researchId,
    researchTitle,
    eventKeySuffix,
  }: {
    actorId: string
    studentId: string
    researchId: string
    researchTitle: string
    eventKeySuffix?: string | null
  }
) {
  if (actorId === studentId) {
    return
  }

  await createNotifications(supabase, [
    {
      user_id: studentId,
      actor_id: actorId,
      title: 'Revision requested',
      message: `Your research "${researchTitle}" has unresolved feedback that needs your attention.`,
      notification_type: 'revision_requested',
      reason: researchId,
      reference_id: researchId,
      event_key: `revision-requested:${researchId}:${eventKeySuffix || actorId}`,
      section_id: null,
    },
  ])
}

export async function syncResearchReviewStatus(
  supabase: SupabaseClientLike,
  researchId: string,
  actorId?: string | null,
  eventKeySuffix?: string | null
) {
  const { data: research, error: researchError } = await supabase
    .from('research')
    .select('id, title, status, user_id')
    .eq('id', researchId)
    .single()

  if (researchError || !research) {
    throw researchError ?? new Error('Research record not found.')
  }

  const unresolvedCount = await getUnresolvedAnnotationCount(supabase, researchId)

  if (unresolvedCount > 0 && research.status !== 'Revision Requested') {
    const { error } = await supabase
      .from('research')
      .update({ status: 'Revision Requested' })
      .eq('id', researchId)

    if (error) {
      throw error
    }

    if (actorId) {
      await notifyStudentRevisionRequested(supabase, {
        actorId,
        studentId: research.user_id,
        researchId,
        researchTitle: research.title,
        eventKeySuffix,
      })
    }

    return 'Revision Requested'
  }

  return research.status ?? null
}
