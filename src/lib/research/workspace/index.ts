import { createClient } from '@/lib/supabase/server'
import {
  hasResearchTextContent,
  type ResearchDocumentContent,
} from '@/lib/research/document'
import { getPublishedAtForStatusChange } from '@/lib/research/publication'
import { getNextStudentVersion, getNextTeacherVersion } from '@/lib/research/versioning'
import {
  getUnresolvedAnnotationCount,
  notifyTeachersForResearchSubmission,
} from '@/lib/research/workflow'

type SupabaseClientLike = Awaited<ReturnType<typeof createClient>>

type WorkspaceResearchRecord = {
  title: string
  status: string
  published_at?: string | null
  subject_code?: string | null
  adviser_id?: string | null
  file_url?: string | null
  original_file_name?: string | null
  current_stage?: string | null
}

type WorkspaceVersionRow = {
  id?: string | null
  version_number?: number | null
  version_major?: number | null
  version_minor?: number | null
  version_label?: string | null
}

async function getWorkspaceResearchRecord<T extends WorkspaceResearchRecord>(
  supabase: SupabaseClientLike,
  researchId: string,
  columns: string
): Promise<T> {
  const { data, error } = await supabase
    .from('research')
    .select(columns)
    .eq('id', researchId)
    .single()

  if (error || !data) {
    throw new Error('Research record not found.')
  }

  return data as unknown as T
}

async function getWorkspaceVersions(
  supabase: SupabaseClientLike,
  researchId: string,
  columns = 'id, version_number, version_major, version_minor, version_label'
) {
  const { data } = await supabase
    .from('research_versions')
    .select(columns)
    .eq('research_id', researchId)
    .order('version_number', { ascending: false })

  return (data || []) as WorkspaceVersionRow[]
}

async function upsertWorkspaceDraft(
  supabase: SupabaseClientLike,
  {
    researchId,
    ownerRole,
    ownerUserId,
    content,
    changeSummary,
    baseVersionId,
  }: {
    researchId: string
    ownerRole: 'student' | 'teacher'
    ownerUserId: string
    content: ResearchDocumentContent
    changeSummary?: string | null
    baseVersionId?: string | null
  }
) {
  await supabase
    .from('research_drafts')
    .upsert({
      research_id: researchId,
      owner_role: ownerRole,
      owner_user_id: ownerUserId,
      base_version_id: baseVersionId ?? null,
      content_json: content,
      change_summary: changeSummary || null,
      is_active: true,
    }, { onConflict: 'research_id,owner_role,owner_user_id' })
}

export async function saveStudentWorkspaceDraftRecord(
  supabase: SupabaseClientLike,
  {
    researchId,
    userId,
    content,
    changeSummary,
  }: {
    researchId: string
    userId: string
    content: ResearchDocumentContent
    changeSummary?: string | null
  }
) {
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

  await upsertWorkspaceDraft(supabase, {
    researchId,
    ownerRole: 'student',
    ownerUserId: userId,
    content,
    changeSummary,
  })

  return data
}

export async function submitStudentWorkspaceVersionRecord(
  supabase: SupabaseClientLike,
  {
    researchId,
    userId,
    content,
    changeSummary,
  }: {
    researchId: string
    userId: string
    content: ResearchDocumentContent
    changeSummary?: string | null
  }
) {
  const currentResearch = await getWorkspaceResearchRecord<WorkspaceResearchRecord>(
    supabase,
    researchId,
    'title, status, published_at, subject_code, adviser_id, file_url, original_file_name, current_stage'
  )

  if (!hasResearchTextContent(content, currentResearch.current_stage)) {
    throw new Error('Please add manuscript content before submitting.')
  }

  if (currentResearch.status !== 'Draft') {
    const unresolvedCount = await getUnresolvedAnnotationCount(supabase, researchId)
    if (unresolvedCount > 0) {
      throw new Error('All feedback must be resolved before you can resubmit.')
    }
  }

  const versionRows = await getWorkspaceVersions(supabase, researchId)
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
      uploaded_by: userId,
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

  await upsertWorkspaceDraft(supabase, {
    researchId,
    ownerRole: 'student',
    ownerUserId: userId,
    content,
    changeSummary,
  })

  await notifyTeachersForResearchSubmission(supabase, {
    actorId: userId,
    researchId,
    researchTitle: currentResearch.title,
    subjectCode: currentResearch.subject_code,
    adviserId: currentResearch.adviser_id,
    status: nextStatus === 'Pending Review' ? 'Pending Review' : 'Resubmitted',
    eventKeySuffix: `workspace-${versionInfo.version_label}`,
  })

  return { versionLabel: versionInfo.version_label, status: nextStatus }
}

export async function saveTeacherWorkspaceVersionRecord(
  supabase: SupabaseClientLike,
  {
    researchId,
    userId,
    content,
    changeSummary,
  }: {
    researchId: string
    userId: string
    content: ResearchDocumentContent
    changeSummary?: string | null
  }
) {
  const currentResearch = await getWorkspaceResearchRecord<WorkspaceResearchRecord>(
    supabase,
    researchId,
    'file_url, original_file_name, current_stage'
  )

  if (!hasResearchTextContent(content, currentResearch.current_stage)) {
    throw new Error('Please add manuscript content before saving a review edit.')
  }

  const versionRows = await getWorkspaceVersions(supabase, researchId)
  const versionInfo = getNextTeacherVersion(versionRows)
  const nextVersionNumber =
    versionRows.length > 0 ? (versionRows[0].version_number ?? 0) + 1 : 1

  const { data: insertedVersion, error: versionError } = await supabase
    .from('research_versions')
    .insert({
      research_id: researchId,
      uploaded_by: userId,
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

  await upsertWorkspaceDraft(supabase, {
    researchId,
    ownerRole: 'teacher',
    ownerUserId: userId,
    content,
    changeSummary,
    baseVersionId: insertedVersion?.id ?? null,
  })

  return { versionLabel: versionInfo.version_label }
}
