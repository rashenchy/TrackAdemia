'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { syncResearchReviewStatus } from '@/lib/research/review'
import { createNotifications } from '@/lib/notifications/service'
import {
  hasResearchTextContent,
  getPlainTextFromRichText,
  getResearchDocumentSections,
  isTextAnnotationPosition,
  normalizeResearchDocumentContent,
  type ResearchDocumentContent,
  type TextAnnotationPosition,
} from '@/lib/research/document'
import {
  getAnnotationSourceType,
  getVersionLineageKey,
  type AnnotationVersionLike,
} from '@/lib/research/annotation-versioning'
import { getPublishedAtForStatusChange } from '@/lib/research/publication'
import { getNextStudentVersion, getNextTeacherVersion } from '@/lib/research/versioning'
import {
  getUnresolvedAnnotationCount,
  notifyTeachersForResearchSubmission,
} from '@/lib/research/workflow'

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
}

type ActiveAnnotationVersionContext = AnnotationVersionLike

type StudentChangeRecord = {
  changedAt: string
  content: unknown
  fileUrl: string | null
  source: 'draft' | 'version'
}

async function getAuthenticatedUserContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('User not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .eq('is_active', true)
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

type QuickReviewStatus = 'Revision Requested' | 'Approved' | 'Published'

async function requireStudentAuthor(researchId: string) {
  const context = await getAuthenticatedUserContext()

  const { data: research } = await context.supabase
    .from('research')
    .select('user_id, members')
    .eq('id', researchId)
    .single()

  const isAuthor =
    research?.user_id === context.user.id ||
    (Array.isArray(research?.members) && research.members.includes(context.user.id))

  if (!isAuthor) {
    throw new Error('Only the student author group can edit this working draft.')
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

function normalizeComparableText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function getSectionPlainText(content: unknown, sectionKey: string) {
  const normalized = normalizeResearchDocumentContent(content)
  const section = getResearchDocumentSections(normalized).find(
    (candidate) => candidate.id === sectionKey
  )

  return normalizeComparableText(getPlainTextFromRichText(section?.content ?? ''))
}

async function getAnnotatedVersionRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  {
    annotationId,
    researchId,
    versionId,
    versionNumber,
  }: {
    annotationId: string
    researchId: string
    versionId?: string | null
    versionNumber?: number | null
  }
) {
  if (versionId) {
    const { data: versionById } = await supabase
      .from('research_versions')
      .select('id, content_json, file_url')
      .eq('id', versionId)
      .maybeSingle()

    if (versionById) {
      return versionById
    }
  }

  if (versionNumber != null) {
    const { data: versionByNumber } = await supabase
      .from('research_versions')
      .select('id, content_json, file_url')
      .eq('research_id', researchId)
      .eq('version_number', versionNumber)
      .maybeSingle()

    if (versionByNumber) {
      return versionByNumber
    }
  }

  const { data: fallbackResearch } = await supabase
    .from('research')
    .select('id, content_json, file_url')
    .eq('id', researchId)
    .maybeSingle()

  if (!fallbackResearch) {
    throw new Error(`Could not load the manuscript snapshot for annotation ${annotationId}.`)
  }

  return fallbackResearch
}

async function ensureStudentCanResolveAnnotation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  annotation: {
    id: string
    research_id: string
    created_at: string
    position_data: unknown
    version_id?: string | null
    version_number?: number | null
  }
) {
  const [{ data: studentDraft }, { data: latestStudentVersion }] = await Promise.all([
    supabase
      .from('research_drafts')
      .select('updated_at, content_json')
      .eq('research_id', annotation.research_id)
      .eq('owner_role', 'student')
      .eq('owner_user_id', userId)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('research_versions')
      .select('created_at, content_json, file_url')
      .eq('research_id', annotation.research_id)
      .eq('uploaded_by', userId)
      .eq('created_by_role', 'student')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const studentChanges: StudentChangeRecord[] = []

  if (studentDraft?.updated_at && studentDraft.updated_at > annotation.created_at) {
    studentChanges.push({
      changedAt: studentDraft.updated_at,
      content: studentDraft.content_json,
      fileUrl: null,
      source: 'draft',
    })
  }

  if (latestStudentVersion?.created_at && latestStudentVersion.created_at > annotation.created_at) {
    studentChanges.push({
      changedAt: latestStudentVersion.created_at,
      content: latestStudentVersion.content_json,
      fileUrl: latestStudentVersion.file_url ?? null,
      source: 'version',
    })
  }

  if (studentChanges.length === 0) {
    throw new Error(
      'You need to save or submit changes to your manuscript before marking this feedback as resolved.'
    )
  }

  if (!isTextAnnotationPosition(annotation.position_data)) {
    const hasNewStudentVersion = studentChanges.some((change) => change.source === 'version')

    if (!hasNewStudentVersion) {
      throw new Error(
        'PDF feedback can only be resolved after you submit a newer student version.'
      )
    }

    return
  }

  const latestTextChange = [...studentChanges]
    .filter((change) => change.content)
    .sort((first, second) => second.changedAt.localeCompare(first.changedAt))[0]

  if (!latestTextChange) {
    throw new Error(
      'Text feedback can only be resolved after you save or submit editor changes.'
    )
  }

  const annotatedVersion = await getAnnotatedVersionRecord(supabase, {
    annotationId: annotation.id,
    researchId: annotation.research_id,
    versionId: annotation.version_id,
    versionNumber: annotation.version_number,
  })

  const previousSectionText = getSectionPlainText(
    annotatedVersion.content_json,
    annotation.position_data.sectionKey
  )
  const currentSectionText = getSectionPlainText(
    latestTextChange.content,
    annotation.position_data.sectionKey
  )

  if (!currentSectionText || previousSectionText === currentSectionText) {
    throw new Error(
      'Update the annotated section in the manuscript editor before marking this feedback as resolved.'
    )
  }
}


// Creates a new annotation linked to a highlighted portion of the research document
export async function addAnnotation(
  researchId: string,
  activeVersion: ActiveAnnotationVersionContext | null,
  highlightData: AnnotationHighlightData,
  commentText: string
) {
  const { supabase, user } = await requireReviewer()
  const sourceType = getAnnotationSourceType({
    position_data: highlightData.highlightAreas,
  })
  const versionLineageKey = getVersionLineageKey(activeVersion)
  const versionLineageNumber =
    activeVersion?.version_major ?? activeVersion?.version_number ?? null

  // Construct the annotation record to be inserted into the database
  const newAnnotation = {
    research_id: researchId,
    user_id: user.id,
    version_id: activeVersion?.id ?? null,
    version_number: activeVersion?.version_number ?? null,
    version_major: versionLineageNumber,
    version_minor: activeVersion?.version_minor ?? 0,
    version_lineage_key: versionLineageKey,
    source_type: sourceType,
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

export async function updateReviewDecision(
  researchId: string,
  nextStatus: QuickReviewStatus
) {
  const { supabase } = await requireReviewer()

  const { data: currentResearch, error: currentResearchError } = await supabase
    .from('research')
    .select('status, published_at')
    .eq('id', researchId)
    .single()

  if (currentResearchError || !currentResearch) {
    throw new Error('Research record not found.')
  }

  const { data, error } = await supabase
    .from('research')
    .update({
      status: nextStatus,
      published_at: getPublishedAtForStatusChange(
        currentResearch.status,
        nextStatus,
        currentResearch.published_at
      ),
    })
    .eq('id', researchId)
    .select('status')
    .single()

  if (error) {
    throw error
  }

  revalidatePath(`/dashboard/research/${researchId}`)
  revalidatePath(`/dashboard/research/${researchId}/annotate`)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/tasks')

  return data?.status ?? nextStatus
}

export async function saveStudentWorkspaceDraft(
  researchId: string,
  content: ResearchDocumentContent,
  changeSummary?: string | null
) {
  const { supabase, user } = await requireStudentAuthor(researchId)

  const { data, error } = await supabase
    .from('research')
    .update({
      content_json: content,
      status: 'Draft',
    })
    .eq('id', researchId)
    .select('id')
    .single()

  if (error) {
    throw error
  }

  await supabase
    .from('research_drafts')
    .upsert({
      research_id: researchId,
      owner_role: 'student',
      owner_user_id: user.id,
      content_json: content,
      change_summary: changeSummary || null,
      is_active: true,
    }, { onConflict: 'research_id,owner_role,owner_user_id' })

  revalidatePath(`/dashboard/research/${researchId}`)
  revalidatePath(`/dashboard/research/${researchId}/annotate`)
  revalidatePath('/dashboard')

  return data
}

export async function submitStudentWorkspaceVersion(
  researchId: string,
  content: ResearchDocumentContent,
  changeSummary?: string | null
) {
  const { supabase, user } = await requireStudentAuthor(researchId)

  const { data: currentResearch, error: currentResearchError } = await supabase
    .from('research')
    .select('title, status, published_at, subject_code, adviser_id, file_url, original_file_name, current_stage')
    .eq('id', researchId)
    .single()

  if (currentResearchError || !currentResearch) {
    throw new Error('Research record not found.')
  }

  if (!hasResearchTextContent(content, currentResearch.current_stage)) {
    throw new Error('Please add manuscript content before submitting.')
  }

  if (currentResearch.status !== 'Draft') {
    const unresolvedCount = await getUnresolvedAnnotationCount(supabase, researchId)
    if (unresolvedCount > 0) {
      throw new Error('All feedback must be resolved before you can resubmit.')
    }
  }

  const { data: existingVersions } = await supabase
    .from('research_versions')
    .select('version_number, version_major, version_minor, version_label')
    .eq('research_id', researchId)
    .order('version_number', { ascending: false })

  const versionRows = existingVersions || []
  const versionInfo = getNextStudentVersion(versionRows)
  const nextVersionNumber =
    versionRows.length > 0 ? (versionRows[0].version_number ?? 0) + 1 : 1
  const nextStatus = currentResearch.status === 'Draft' ? 'Pending Review' : 'Resubmitted'

  const { error: updateError } = await supabase
    .from('research')
    .update({
      content_json: content,
      status: nextStatus,
      published_at: getPublishedAtForStatusChange(
        currentResearch.status,
        nextStatus,
        currentResearch.published_at
      ),
    })
    .eq('id', researchId)

  if (updateError) {
    throw updateError
  }

  const { error: versionError } = await supabase
    .from('research_versions')
    .insert({
      research_id: researchId,
      uploaded_by: user.id,
      file_url: currentResearch.file_url,
      original_file_name: currentResearch.original_file_name,
      content_json: content,
      version_number: nextVersionNumber,
      version_major: versionInfo.version_major,
      version_minor: versionInfo.version_minor,
      version_label: versionInfo.version_label,
      created_by_role: 'student',
      change_type: 'student_submit',
      change_summary: changeSummary || null,
    })

  if (versionError) {
    throw versionError
  }

  await supabase
    .from('research_drafts')
    .upsert({
      research_id: researchId,
      owner_role: 'student',
      owner_user_id: user.id,
      content_json: content,
      base_version_id: null,
      change_summary: changeSummary || null,
      is_active: true,
    }, { onConflict: 'research_id,owner_role,owner_user_id' })

  await notifyTeachersForResearchSubmission(supabase, {
    actorId: user.id,
    researchId,
    researchTitle: currentResearch.title,
    subjectCode: currentResearch.subject_code,
    adviserId: currentResearch.adviser_id,
    status: nextStatus === 'Pending Review' ? 'Pending Review' : 'Resubmitted',
    eventKeySuffix: `workspace-${versionInfo.version_label}`,
  })

  revalidatePath(`/dashboard/research/${researchId}`)
  revalidatePath(`/dashboard/research/${researchId}/annotate`)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/tasks')

  return { versionLabel: versionInfo.version_label, status: nextStatus }
}

export async function saveTeacherWorkspaceVersion(
  researchId: string,
  content: ResearchDocumentContent,
  changeSummary?: string | null
) {
  const { supabase, user } = await requireReviewer()

  const { data: currentResearch, error: currentResearchError } = await supabase
    .from('research')
    .select('file_url, original_file_name, current_stage')
    .eq('id', researchId)
    .single()

  if (currentResearchError || !currentResearch) {
    throw new Error('Research record not found.')
  }

  if (!hasResearchTextContent(content, currentResearch.current_stage)) {
    throw new Error('Please add manuscript content before saving a review edit.')
  }

  const { data: existingVersions } = await supabase
    .from('research_versions')
    .select('id, version_number, version_major, version_minor, version_label')
    .eq('research_id', researchId)
    .order('version_number', { ascending: false })

  const versionRows = existingVersions || []
  const versionInfo = getNextTeacherVersion(versionRows)
  const nextVersionNumber =
    versionRows.length > 0 ? (versionRows[0].version_number ?? 0) + 1 : 1

  const { data: insertedVersion, error: versionError } = await supabase
    .from('research_versions')
    .insert({
      research_id: researchId,
      uploaded_by: user.id,
      file_url: currentResearch.file_url,
      original_file_name: currentResearch.original_file_name,
      content_json: content,
      version_number: nextVersionNumber,
      version_major: versionInfo.version_major,
      version_minor: versionInfo.version_minor,
      version_label: versionInfo.version_label,
      created_by_role: 'teacher',
      change_type: 'teacher_edit',
      change_summary: changeSummary || null,
    })
    .select('id')
    .single()

  if (versionError) {
    throw versionError
  }

  await supabase
    .from('research_drafts')
    .upsert({
      research_id: researchId,
      owner_role: 'teacher',
      owner_user_id: user.id,
      base_version_id: insertedVersion?.id ?? null,
      content_json: content,
      change_summary: changeSummary || null,
      is_active: true,
    }, { onConflict: 'research_id,owner_role,owner_user_id' })

  revalidatePath(`/dashboard/research/${researchId}`)
  revalidatePath(`/dashboard/research/${researchId}/annotate`)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/tasks')

  return { versionLabel: versionInfo.version_label }
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
  activeVersion?: ActiveAnnotationVersionContext | null
) {
  const { supabase } = await requireResearchParticipant(researchId)
  const versionLineageNumber =
    activeVersion?.version_major ?? activeVersion?.version_number ?? null

  let query = supabase
    .from('annotations')
    .select('*')
    .eq('research_id', researchId)
    .order('created_at', { ascending: true })

  if (versionLineageNumber != null) {
    query = query.eq('version_major', versionLineageNumber)
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

  const { data: annotationRecord, error: annotationLookupError } = await supabase
    .from('annotations')
    .select('id, research_id, created_at, position_data, version_id, version_number')
    .eq('id', annotationId)
    .single()

  if (annotationLookupError || !annotationRecord) {
    throw new Error('Annotation not found.')
  }

  const { data: research } = await supabase
    .from('research')
    .select('user_id, members')
    .eq('id', annotationRecord.research_id)
    .single()

  const isStudentAuthor =
    user.id === research?.user_id ||
    (Array.isArray(research?.members) && research.members.includes(user.id))

  if (newStatus && isStudentAuthor) {
    await ensureStudentCanResolveAnnotation(supabase, user.id, annotationRecord)
  }

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

export async function deleteAnnotation(annotationId: string) {
  const { supabase, user } = await requireReviewer()

  const { data: annotation, error: annotationError } = await supabase
    .from('annotations')
    .select('id, research_id')
    .eq('id', annotationId)
    .single()

  if (annotationError || !annotation) {
    throw new Error('Annotation not found.')
  }

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

  await syncResearchReviewStatus(supabase, annotation.research_id, user.id, null)
  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/research/${annotation.research_id}`)
  revalidatePath(`/dashboard/research/${annotation.research_id}/annotate`)
  revalidatePath('/dashboard/tasks')

  return { annotationId, researchId: annotation.research_id }
}



// Retrieves all replies associated with a specific annotation
export async function getReplies(annotationId: string) {
  const { supabase } = await requireAnnotationParticipant(annotationId)


  // Fetch replies along with author profile information
  const { data, error } = await supabase
    .from('annotation_replies')
    .select(`
      *,
      profiles(first_name, last_name, role)
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
