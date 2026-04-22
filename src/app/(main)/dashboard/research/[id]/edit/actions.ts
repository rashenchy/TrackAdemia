'use server'

import { createClient } from '@/lib/supabase/server'
import { uploadResearchDocument } from '@/lib/research/files'
import { canTeacherEditPublishedResearch } from '@/lib/research/permissions'
import { getPublishedAtForStatusChange } from '@/lib/research/publication'
import {
  extractResearchDocumentContentFromFormData,
  hasResearchTextContent,
  resolveResearchSubmissionFormat,
} from '@/lib/research/document'
import { getNextStudentVersion } from '@/lib/research/versioning'
import {
  getUnresolvedAnnotationCount,
  notifyTeachersForResearchSubmission,
  notifyTeachersForResearchVersionUpload,
} from '@/lib/research/workflow'
import { redirect } from 'next/navigation'
import { isFacultyRole } from '@/lib/users/access'

type FormState = {
  error?: string
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage
}

export async function updateResearch(editId: string, prevState: FormState | null, formData: FormData) {
  const supabase = await createClient()

  // AUTHENTICATION & PERMISSIONS

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isDraft = formData.get('isDraft') === 'true'
  const isIndependentResearch = formData.get('isIndependentResearch') === 'true'
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isTeacher = isFacultyRole(profile?.role)

  // Fetch current record for security validation
  const { data: current } = await supabase
    .from('research')
    .select('status, published_at, user_id, members, file_url, original_file_name, title, subject_code, adviser_id, content_json, submission_format')
    .eq('id', editId)
    .single()

  // Authorization check (Owner or Member)
  const isAuthor = current?.user_id === user.id || (current?.members || []).includes(user.id)
  const canTeacherEditPublished =
    isTeacher && current?.status === 'Published'
      ? await canTeacherEditPublishedResearch(supabase, user.id, current)
      : false

  if (!current || (!isAuthor && !canTeacherEditPublished)) return { error: 'Unauthorized' }

  // WORKFLOW LOGIC

  let nextStatus = current.status

  // Logic to determine new status based on role and draft state
  if (isDraft) {
    nextStatus = 'Draft'
  } else {
    if (isTeacher) {
      nextStatus = 'Published'
    } else if (current.status === 'Draft') {
      nextStatus = 'Pending Review'
    } else {
      const unresolvedCount = await getUnresolvedAnnotationCount(supabase, editId)
      if (unresolvedCount > 0) {
        return { error: 'All feedback must be resolved before you can resubmit.' }
      }

      nextStatus = 'Resubmitted'
    }
  }


  // DATA EXTRACTION

  const title = (formData.get('title') as string)?.trim()
  const type = (formData.get('type') as string)?.trim()
  const abstract = (formData.get('abstract') as string)?.trim()
  const keywords = formData.getAll('keywords')
    .map(k => (k as string).trim())
    .filter(k => k !== '')

  const subjectCode = (formData.get('subjectCode') as string)?.trim() || ''
  const adviser = (formData.get('adviser') as string)?.trim() || null
  const researchArea = (formData.get('researchArea') as string)?.trim()

  const startDate = ((formData.get('startDate') as string) || '').trim()
  const targetDefenseDate = (formData.get('targetDefenseDate') as string) || null
  const currentStage = (formData.get('currentStage') as string)?.trim()
  const requestedSubmissionFormat = (formData.get('submissionFormat') as string)?.trim()
  const documentContent = extractResearchDocumentContentFromFormData(formData, currentStage, type)
  const hasTextContent = hasResearchTextContent(documentContent, currentStage)
  const normalizedSubjectCode =
    isTeacher && isIndependentResearch ? null : subjectCode || null
  const normalizedAdviser =
    isTeacher && isIndependentResearch ? null : adviser
  const normalizedStartDate = isTeacher ? startDate || null : startDate || null
  const normalizedTargetDefenseDate = targetDefenseDate || null

  if (!isDraft && !isTeacher && !subjectCode) {
    return { error: 'Please select a section before submitting.' }
  }

  if (!isDraft && !isTeacher && !startDate) {
    return { error: 'Please provide a project start date before submitting.' }
  }

  // Collect member assignments
  const members: string[] = []
  const memberRoles: string[] = []
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('member-')) members.push((value as string).trim())
    if (key.startsWith('role-')) memberRoles.push((value as string).trim())
  }


  // SECURE FILE UPLOAD

  const initialDocument = formData.get('initialDocument') as File | null
  let fileUrl: string | null = null
  let originalFileName: string | null = null

  if (initialDocument && initialDocument.size > 0) {
    try {
      const uploadedFile = await uploadResearchDocument(supabase, user.id, initialDocument)
      fileUrl = uploadedFile.filePath
      originalFileName = uploadedFile.originalFileName
    } catch (error: unknown) {
      console.error('Storage Upload Error:', error)
      return { error: getErrorMessage(error, 'Failed to securely upload the new document.') }
    }
  }

  const effectiveFileUrl = fileUrl || current.file_url || null
  const submissionFormat = isTeacher
    ? 'pdf'
    : resolveResearchSubmissionFormat(requestedSubmissionFormat, {
        hasPdf: Boolean(effectiveFileUrl),
        hasText: hasTextContent,
        stage: currentStage,
      })

  if (!isDraft) {
    const needsPdf = isTeacher || submissionFormat === 'pdf' || submissionFormat === 'both'
    const needsText = !isTeacher && (submissionFormat === 'text' || submissionFormat === 'both')

    if (needsPdf && !effectiveFileUrl) {
      return {
        error: isTeacher
          ? 'Faculty submissions require a PDF manuscript.'
          : 'Please upload a PDF manuscript for the selected submission format.',
      }
    }

    if (needsText && !hasTextContent) {
      return { error: 'Please complete at least one manuscript section in the editor before submitting.' }
    }
  }


  // DATABASE UPDATE

  const updatePayload: Record<string, unknown> = {
    title, type, abstract, keywords,
    subject_code: normalizedSubjectCode,
    adviser_id: normalizedAdviser,
    research_area: researchArea,
    start_date: normalizedStartDate,
    target_defense_date: normalizedTargetDefenseDate,
    current_stage: currentStage,
    status: nextStatus,
    published_at: getPublishedAtForStatusChange(
      current.status,
      nextStatus,
      current.published_at
    ),
    submission_format: submissionFormat,
    content_json: !isTeacher && hasTextContent ? documentContent : null,
    members: members.filter(id => id !== ''),
    member_roles: memberRoles,
    ...(fileUrl && { file_url: fileUrl, original_file_name: originalFileName })
  }

  const { data: updatedResearch, error } = await supabase
    .from('research')
    .update(updatePayload)
    .eq('id', editId)
    .select()
    .single()

  if (error) {
    console.error('Database Error:', error)
    return { error: 'Failed to update research entry.' }
  }


  // VERSIONING & ANNOTATION MANAGEMENT
  let versionNotificationSuffix: string | null = null

  if (updatedResearch && !isDraft) {
    // Fetch latest version number
    const { data: existingVersions } = await supabase
      .from('research_versions')
      .select('version_number, version_major, version_minor, version_label, file_url, content_json')
      .eq('research_id', editId)
      .order('version_number', { ascending: false })

    const versionRows = existingVersions || []
    const latestVersionNumber =
      versionRows.length > 0 ? versionRows[0].version_number : 0

    // If a draft had an attached file before any formal version history existed,
    // preserve that original manuscript as Version 1 before adding newer uploads.
    if (
      versionRows.length === 0 &&
      current.file_url &&
      (!fileUrl || current.file_url !== fileUrl)
    ) {
      const { error: seedVersionError } = await supabase
        .from('research_versions')
        .insert({
          research_id: editId,
          uploaded_by: user.id,
          file_url: current.file_url,
          original_file_name: current.original_file_name,
          content_json: current.content_json,
          version_number: 1,
          version_major: 1,
          version_minor: 0,
          version_label: '1',
          created_by_role: isTeacher ? 'teacher' : 'student',
          change_type: isTeacher ? 'teacher_submit' : 'student_submit',
        })

      if (seedVersionError) console.error('Seed Version Insert Error:', seedVersionError)
    }

    if (fileUrl || (!isTeacher && hasTextContent)) {
      const versionInfo = getNextStudentVersion(versionRows)
      const nextVersion =
        versionRows.length === 0
          ? current.file_url && current.file_url !== fileUrl
            ? 2
            : 1
          : latestVersionNumber + 1

      const { error: versionError } = await supabase
        .from('research_versions')
        .insert({
          research_id: editId,
          uploaded_by: user.id,
          file_url: fileUrl,
          original_file_name: originalFileName,
          content_json: !isTeacher && hasTextContent ? documentContent : null,
          version_number: nextVersion,
          version_major: versionInfo.version_major,
          version_minor: versionInfo.version_minor,
          version_label: versionInfo.version_label,
          created_by_role: isTeacher ? 'teacher' : 'student',
          change_type: isTeacher ? 'teacher_submit' : 'student_submit',
        })

      if (versionError) console.error('Version Insert Error:', versionError)

      versionNotificationSuffix = `version-${nextVersion}`

      if (!isTeacher) {
        await notifyTeachersForResearchVersionUpload(supabase, {
          actorId: user.id,
          researchId: editId,
          researchTitle: title || current.title,
          subjectCode: normalizedSubjectCode || current.subject_code,
          adviserId: normalizedAdviser || current.adviser_id,
          originalFileName,
          versionNumber: nextVersion,
        })
      }
    }
  }


  // FINALIZATION

  if (!isDraft) {
    if (!isTeacher) {
      await notifyTeachersForResearchSubmission(supabase, {
        actorId: user.id,
        researchId: editId,
        researchTitle: title || current.title,
        subjectCode: normalizedSubjectCode || current.subject_code,
        adviserId: normalizedAdviser || current.adviser_id,
        status: nextStatus === 'Pending Review' ? 'Pending Review' : 'Resubmitted',
        eventKeySuffix:
          nextStatus === 'Pending Review'
            ? 'initial-from-draft'
            : versionNotificationSuffix || `resubmission-${Date.now()}`,
      })

      const successMessage =
        nextStatus === 'Pending Review' ? 'Submitted for review' : 'Resubmitted for review'

      redirect(`/dashboard/research/${editId}?success=${encodeURIComponent(successMessage)}`)
    }

    redirect(`/dashboard/research/${editId}?success=${encodeURIComponent('Research published successfully')}`)
  }

  return { success: 'Draft updated successfully' }
}
