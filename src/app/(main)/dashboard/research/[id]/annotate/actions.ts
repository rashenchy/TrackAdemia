'use server'

import { createClient } from '@/lib/supabase/server'
import {
  getPlainTextFromRichText,
  getResearchDocumentSections,
  isTextAnnotationPosition,
  normalizeResearchDocumentContent,
  type ResearchDocumentContent,
  type TextAnnotationPosition,
} from '@/lib/research/document'
import {
  type AnnotationVersionLike,
} from '@/lib/research/annotation-versioning'
import { getPublishedAtForStatusChange } from '@/lib/research/publication'
import { researchHasPublishablePdf } from '@/lib/research/publication'
import {
  canTeacherEditPublishedResearch,
  isResearchReviewer,
} from '@/lib/research/permissions'
import { revalidateResearchDetailPaths } from '@/lib/research/cache'
import {
  saveStudentWorkspaceDraftRecord,
  saveTeacherWorkspaceVersionRecord,
  submitStudentWorkspaceVersionRecord,
} from '@/lib/research/workspace'
import {
  createAnnotationRecord,
  createAnnotationReplyRecord,
  removeAnnotationRecord,
  setAnnotationResolvedState,
} from '@/lib/research/annotations'

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

  if (!isResearchReviewer(context.role)) {
    throw new Error('Only reviewers can perform this action.')
  }

  return context
}

async function requireTeacherWorkspaceEditor(researchId: string) {
  const context = await requireReviewer()
  const { data: research } = await context.supabase
    .from('research')
    .select('user_id, adviser_id, subject_code, status')
    .eq('id', researchId)
    .single()

  if (!research) {
    throw new Error('Research record not found.')
  }

  if (research.status === 'Published') {
    const canEditPublished = await canTeacherEditPublishedResearch(
      context.supabase,
      context.user.id,
      research
    )

    if (!canEditPublished) {
      throw new Error(
        'Only the teacher who published this research or its connected advisers can edit the published workspace.'
      )
    }
  }

  return { ...context, research }
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

  if (isResearchReviewer(context.role)) {
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
  const data = await createAnnotationRecord(supabase, {
    researchId,
    userId: user.id,
    activeVersion,
    highlightData: {
      ...highlightData,
      commentText,
    },
  })
  revalidateResearchDetailPaths(researchId)

  return data
}

export async function updateReviewDecision(
  researchId: string,
  nextStatus: QuickReviewStatus
) {
  const { supabase } = await requireReviewer()

  if (nextStatus === 'Published') {
    const hasPublishablePdf = await researchHasPublishablePdf(supabase, researchId)

    if (!hasPublishablePdf) {
      throw new Error('A PDF manuscript is required before this research can be published.')
    }
  }

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

  revalidateResearchDetailPaths(researchId)

  return data?.status ?? nextStatus
}

export async function saveStudentWorkspaceDraft(
  researchId: string,
  content: ResearchDocumentContent,
  changeSummary?: string | null
) {
  const { supabase, user } = await requireStudentAuthor(researchId)
  const data = await saveStudentWorkspaceDraftRecord(supabase, {
    researchId,
    userId: user.id,
    content,
    changeSummary,
  })

  revalidateResearchDetailPaths(researchId)

  return data
}

export async function submitStudentWorkspaceVersion(
  researchId: string,
  content: ResearchDocumentContent,
  changeSummary?: string | null
) {
  const { supabase, user } = await requireStudentAuthor(researchId)
  const result = await submitStudentWorkspaceVersionRecord(supabase, {
    researchId,
    userId: user.id,
    content,
    changeSummary,
  })

  revalidateResearchDetailPaths(researchId)

  return result
}

export async function saveTeacherWorkspaceVersion(
  researchId: string,
  content: ResearchDocumentContent,
  changeSummary?: string | null
) {
  const { supabase, user } = await requireTeacherWorkspaceEditor(researchId)
  const result = await saveTeacherWorkspaceVersionRecord(supabase, {
    researchId,
    userId: user.id,
    content,
    changeSummary,
  })

  revalidateResearchDetailPaths(researchId)

  return result
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

  const data = await setAnnotationResolvedState(supabase, {
    annotationId,
    userId: user.id,
    newStatus,
  })
  revalidateResearchDetailPaths(data.research_id)

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

  const result = await removeAnnotationRecord(supabase, {
    annotationId,
    researchId: annotation.research_id,
    userId: user.id,
  })
  revalidateResearchDetailPaths(annotation.research_id)

  return result
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
  return createAnnotationReplyRecord(supabase, {
    annotationId,
    userId: user.id,
    message,
  })
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
