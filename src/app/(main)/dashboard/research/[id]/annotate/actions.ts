'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { syncResearchReviewStatus } from '@/lib/research-review-status'
import { createNotifications } from '@/lib/notification-service'

type HighlightArea = {
  pageIndex: number
  top: number
  left: number
  width: number
  height: number
}

type AnnotationHighlightData = {
  selectedText: string
  highlightAreas: HighlightArea[]
}

async function getAuthenticatedUserContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('User not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return { supabase, user, role: profile?.role ?? null }
}

async function requireReviewer() {
  const context = await getAuthenticatedUserContext()

  if (context.role !== 'mentor' && context.role !== 'admin') {
    throw new Error('Only reviewers can perform this action.')
  }

  return context
}

async function requireResearchParticipant(researchId: string) {
  const context = await getAuthenticatedUserContext()

  if (context.role === 'mentor' || context.role === 'admin') {
    return context
  }

  const { data: research } = await context.supabase
    .from('research')
    .select('user_id, members')
    .eq('id', researchId)
    .single()

  const isParticipant =
    research?.user_id === context.user.id ||
    (Array.isArray(research?.members) && research.members.includes(context.user.id))

  if (!isParticipant) {
    throw new Error('You are not allowed to access this research feedback.')
  }

  return context
}

async function requireAnnotationParticipant(annotationId: string) {
  const context = await getAuthenticatedUserContext()

  const { data: annotation } = await context.supabase
    .from('annotations')
    .select('id, research_id')
    .eq('id', annotationId)
    .single()

  if (!annotation) {
    throw new Error('Annotation not found.')
  }

  await requireResearchParticipant(annotation.research_id)

  return { ...context, annotation }
}


// Creates a new annotation linked to a highlighted portion of the research document
export async function addAnnotation(
  researchId: string,
  highlightData: AnnotationHighlightData,
  commentText: string
) {
  const { supabase, user } = await requireReviewer()


  // Construct the annotation record to be inserted into the database
  const newAnnotation = {
    research_id: researchId,
    user_id: user.id,
    quote: highlightData.selectedText,
    comment_text: commentText,
    position_data: highlightData.highlightAreas,
  }


  // Insert annotation into the database and return the created record
  const { data, error } = await supabase
    .from('annotations')
    .insert(newAnnotation)
    .select()
    .single()

  if (error) {
    console.error('Insert annotation error:', error)
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
      .filter((recipientId): recipientId is string => Boolean(recipientId && recipientId !== user.id))
      .map((recipientId) => ({
        user_id: recipientId,
        actor_id: user.id,
        title: 'New feedback added',
        message: `A reviewer added feedback to "${research?.title || 'your research'}".`,
        notification_type: 'annotation_added',
        reference_id: researchId,
        reason: data.id,
        event_key: `annotation-added:${data.id}:${recipientId}`,
      }))
  )

  await syncResearchReviewStatus(supabase, researchId, user.id, data.id)
  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/research/${researchId}`)
  revalidatePath('/dashboard/tasks')

  return data
}



// Generates a temporary signed URL allowing secure access to the research file
export async function getResearchFile(researchId: string) {
  const { supabase } = await requireResearchParticipant(researchId)


  // Retrieve the storage path of the research file
  const { data: research } = await supabase
    .from('research')
    .select('file_url')
    .eq('id', researchId)
    .single()

  if (!research?.file_url) return null


  // Create a temporary signed URL to access the stored PDF file
  const { data } = await supabase.storage
    .from('trackademiaPapers')
    .createSignedUrl(research.file_url, 3600)

  return data?.signedUrl
}

async function getVersionWindow(
  researchId: string,
  versionNumber?: number | null
) {
  const supabase = await createClient()

  if (!versionNumber) {
    const { data: latestVersion } = await supabase
      .from('research_versions')
      .select('created_at')
      .eq('research_id', researchId)
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    return {
      versionCreatedAt: latestVersion?.created_at ?? null,
      nextVersionCreatedAt: null as string | null,
    }
  }

  const { data: targetVersion } = await supabase
    .from('research_versions')
    .select('created_at, version_number')
    .eq('research_id', researchId)
    .eq('version_number', versionNumber)
    .maybeSingle()

  if (!targetVersion?.created_at) {
    return {
      versionCreatedAt: null,
      nextVersionCreatedAt: null,
    }
  }

  const { data: newerVersion } = await supabase
    .from('research_versions')
    .select('created_at, version_number')
    .eq('research_id', researchId)
    .gt('version_number', versionNumber)
    .order('version_number', { ascending: true })
    .limit(1)
    .maybeSingle()

  return {
    versionCreatedAt: targetVersion.created_at,
    nextVersionCreatedAt: newerVersion?.created_at ?? null,
  }
}

export async function getResearchFileForVersion(
  researchId: string,
  versionNumber?: number | null
) {
  const { supabase } = await requireResearchParticipant(researchId)

  if (!versionNumber) {
    return getResearchFile(researchId)
  }

  const { data: version } = await supabase
    .from('research_versions')
    .select('file_url')
    .eq('research_id', researchId)
    .eq('version_number', versionNumber)
    .maybeSingle()

  if (!version?.file_url) {
    return getResearchFile(researchId)
  }

  const { data } = await supabase.storage
    .from('trackademiaPapers')
    .createSignedUrl(version.file_url, 3600)

  return data?.signedUrl ?? null
}



// Retrieves annotations for a research document while respecting file version changes
export async function getAnnotations(
  researchId: string,
  versionNumber?: number | null
) {
  const { supabase } = await requireResearchParticipant(researchId)

  const { versionCreatedAt, nextVersionCreatedAt } = await getVersionWindow(
    researchId,
    versionNumber
  )


  // Build the base query for retrieving annotations
  let query = supabase
    .from('annotations')
    .select('*')
    .eq('research_id', researchId)
    .order('created_at', { ascending: true })


  // Filter annotations so only those created after the latest file upload are returned
  if (versionCreatedAt) {
    query = query.gte('created_at', versionCreatedAt)
  }

  if (nextVersionCreatedAt) {
    query = query.lt('created_at', nextVersionCreatedAt)
  }


  // Execute the query
  const { data, error } = await query

  if (error) {
    console.error(error)
    return []
  }

  return data || []
}



// Updates the resolved/unresolved state of a specific annotation
export async function toggleAnnotationResolved(
  annotationId: string,
  newStatus: boolean
) {
  const { supabase, user } = await requireAnnotationParticipant(annotationId)


  // Update annotation status and return the updated record
  const { data, error } = await supabase
    .from('annotations')
    .update({ is_resolved: newStatus })
    .eq('id', annotationId)
    .select()
    .single()

  if (error) throw error

  await syncResearchReviewStatus(supabase, data.research_id, user.id, newStatus ? null : annotationId)
  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/research/${data.research_id}`)
  revalidatePath('/dashboard/tasks')

  return data
}



// Retrieves all replies associated with a specific annotation
export async function getReplies(annotationId: string) {
  const { supabase } = await requireAnnotationParticipant(annotationId)


  // Fetch replies along with author profile information
  const { data, error } = await supabase
    .from('annotation_replies')
    .select(`
      *,
      profiles!inner(first_name, last_name, role)
    `)
    .eq('annotation_id', annotationId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching replies:', error)
    return []
  }

  return data || []
}



// Creates a new reply within an annotation discussion thread
export async function addReply(annotationId: string, message: string) {
  const { supabase, user } = await requireAnnotationParticipant(annotationId)

  const { data: annotation } = await supabase
    .from('annotations')
    .select('research_id, user_id')
    .eq('id', annotationId)
    .single()


  // Insert the reply into the database
  const { data: reply, error } = await supabase
    .from('annotation_replies')
    .insert({
      annotation_id: annotationId,
      user_id: user.id,
      message: message
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding reply:', error)
    throw error
  }


  // Fetch the author's profile so the UI can immediately display the reply with user info
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('id', user.id)
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
        .filter((recipientId): recipientId is string => Boolean(recipientId && recipientId !== user.id))
        .map((recipientId) => ({
          user_id: recipientId,
          actor_id: user.id,
          title: 'New reply in feedback thread',
          message: `${profile?.first_name || 'Someone'} replied in the feedback thread for "${research?.title || 'your research'}".`,
          notification_type: 'annotation_reply',
          reference_id: annotation.research_id,
          reason: annotationId,
          event_key: `annotation-reply:${reply.id}:${recipientId}`,
        }))
    )
  }

  return { ...reply, profiles: profile }
}



// Updates the content of an existing reply while ensuring only the owner can modify it
export async function updateReply(replyId: string, newMessage: string) {

  const supabase = await createClient()


  // Verify the user performing the update
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')


  // Update the reply message and mark it as edited
  const { error } = await supabase
    .from('annotation_replies')
    .update({ message: newMessage, is_edited: true })
    .eq('id', replyId)
    .eq('user_id', user.id)

  if (error) throw error
}



// Deletes a reply while enforcing ownership security
export async function deleteReply(replyId: string) {

  const supabase = await createClient()


  // Verify the user performing the deletion
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')


  // Delete the reply only if it belongs to the authenticated user
  const { error } = await supabase
    .from('annotation_replies')
    .delete()
    .eq('id', replyId)
    .eq('user_id', user.id)

  if (error) throw error
}
