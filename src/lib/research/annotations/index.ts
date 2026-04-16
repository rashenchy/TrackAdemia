import { createClient } from '@/lib/supabase/server'
import { createNotifications } from '@/lib/notifications/service'
import { syncResearchReviewStatus } from '@/lib/research/review'
import {
  getAnnotationSourceType,
  getVersionLineageKey,
  type AnnotationVersionLike,
} from '@/lib/research/annotation-versioning'
import { type TextAnnotationPosition } from '@/lib/research/document'

type SupabaseClientLike = Awaited<ReturnType<typeof createClient>>

type HighlightArea = {
  pageIndex: number
  top: number
  left: number
  width: number
  height: number
}

type AnnotationHighlightData = {
  selectedText: string
  highlightAreas: HighlightArea[] | TextAnnotationPosition
  commentText: string
}

export async function createAnnotationRecord(
  supabase: SupabaseClientLike,
  {
    researchId,
    userId,
    activeVersion,
    highlightData,
  }: {
    researchId: string
    userId: string
    activeVersion: AnnotationVersionLike | null
    highlightData: AnnotationHighlightData
  }
) {
  const sourceType = getAnnotationSourceType({
    position_data: highlightData.highlightAreas,
  })
  const versionLineageKey = getVersionLineageKey(activeVersion)
  const versionLineageNumber =
    activeVersion?.version_major ?? activeVersion?.version_number ?? null

  const newAnnotation = {
    research_id: researchId,
    user_id: userId,
    version_id: activeVersion?.id ?? null,
    version_number: activeVersion?.version_number ?? null,
    version_major: versionLineageNumber,
    version_minor: activeVersion?.version_minor ?? 0,
    version_lineage_key: versionLineageKey,
    source_type: sourceType,
    quote: highlightData.selectedText,
    comment_text: highlightData.commentText,
    position_data: highlightData.highlightAreas,
  }

  const { data, error } = await supabase
    .from('annotations')
    .insert(newAnnotation)
    .select()
    .single()

  if (error) {
    throw error
  }

  const { data: research } = await supabase
    .from('research')
    .select('title, user_id, members')
    .eq('id', researchId)
    .single()

  const participantIds = new Set<string>([
    research?.user_id,
    ...(Array.isArray(research?.members) ? research.members : []),
  ])

  await createNotifications(
    supabase,
    [...participantIds]
      .filter((recipientId): recipientId is string => Boolean(recipientId && recipientId !== userId))
      .map((recipientId) => ({
        user_id: recipientId,
        actor_id: userId,
        title: 'New feedback added',
        message: `A reviewer added feedback to "${research?.title || 'your research'}".`,
        notification_type: 'annotation_added' as const,
        reference_id: researchId,
        reason: data.id,
        event_key: `annotation-added:${data.id}:${recipientId}`,
      }))
  )

  await syncResearchReviewStatus(supabase, researchId, userId, data.id)

  return data
}

export async function setAnnotationResolvedState(
  supabase: SupabaseClientLike,
  {
    annotationId,
    userId,
    newStatus,
  }: {
    annotationId: string
    userId: string
    newStatus: boolean
  }
) {
  const { data, error } = await supabase
    .from('annotations')
    .update({ is_resolved: newStatus })
    .eq('id', annotationId)
    .select()
    .single()

  if (error) {
    throw error
  }

  await syncResearchReviewStatus(supabase, data.research_id, userId, newStatus ? null : annotationId)

  return data
}

export async function removeAnnotationRecord(
  supabase: SupabaseClientLike,
  {
    annotationId,
    researchId,
    userId,
  }: {
    annotationId: string
    researchId: string
    userId: string
  }
) {
  const { error: repliesError } = await supabase
    .from('annotation_replies')
    .delete()
    .eq('annotation_id', annotationId)

  if (repliesError) {
    throw repliesError
  }

  const { error: deleteError } = await supabase
    .from('annotations')
    .delete()
    .eq('id', annotationId)

  if (deleteError) {
    throw deleteError
  }

  await syncResearchReviewStatus(supabase, researchId, userId, null)

  return { annotationId, researchId }
}

export async function createAnnotationReplyRecord(
  supabase: SupabaseClientLike,
  {
    annotationId,
    userId,
    message,
  }: {
    annotationId: string
    userId: string
    message: string
  }
) {
  const { data: annotation } = await supabase
    .from('annotations')
    .select('research_id, user_id')
    .eq('id', annotationId)
    .single()

  const { data: reply, error } = await supabase
    .from('annotation_replies')
    .insert({
      annotation_id: annotationId,
      user_id: userId,
      message,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('id', userId)
    .single()

  if (annotation?.research_id) {
    const [{ data: research }, { data: existingReplies }] = await Promise.all([
      supabase
        .from('research')
        .select('title, user_id, members')
        .eq('id', annotation.research_id)
        .single(),
      supabase
        .from('annotation_replies')
        .select('user_id')
        .eq('annotation_id', annotationId),
    ])

    const recipientIds = new Set<string>([
      research?.user_id,
      ...(Array.isArray(research?.members) ? research.members : []),
      annotation.user_id,
      ...(existingReplies || []).map((existingReply: { user_id: string }) => existingReply.user_id),
    ])

    await createNotifications(
      supabase,
      [...recipientIds]
        .filter((recipientId): recipientId is string => Boolean(recipientId && recipientId !== userId))
        .map((recipientId) => ({
          user_id: recipientId,
          actor_id: userId,
          title: 'New reply in feedback thread',
          message: `${profile?.first_name || 'Someone'} replied in the feedback thread for "${research?.title || 'your research'}".`,
          notification_type: 'annotation_reply' as const,
          reference_id: annotation.research_id,
          reason: annotationId,
          event_key: `annotation-reply:${reply.id}:${recipientId}`,
        }))
    )
  }

  return { ...reply, profiles: profile }
}
