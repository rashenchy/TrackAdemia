'use server'

import { createClient } from '@/lib/supabase/server'
import {
  uploadResearchDocument,
  uploadResearchDiagram,
  uploadSourceCodeArchive,
} from '@/lib/research/files'
import { type ResearchDiagramItem, type ResearchDiagramType } from '@/lib/research/diagrams/types'
import { getPublishedAtForStatusChange } from '@/lib/research/publication'
import {
  extractResearchDocumentContentFromFormData,
  hasResearchTextContent,
  resolveResearchSubmissionFormat,
} from '@/lib/research/document'
import { getNextStudentVersion } from '@/lib/research/versioning'
import { notifyTeachersForResearchSubmission } from '@/lib/research/workflow'
import { redirect } from 'next/navigation'
import { isFacultyRole } from '@/lib/users/access'

type FormState = {
  error?: string
}

const MINIMUM_KEYWORDS = 5
const ACADEMIC_YEAR_PATTERN = /^\d{4}-\d{4}$/

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage
}

export async function submitResearch(prevState: FormState | null, formData: FormData) {
  const supabase = await createClient()

  // Ensure user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check if submission is a draft
  const isDraft = formData.get('isDraft') === 'true'

  // Fetch user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isTeacher = isFacultyRole(profile?.role)
  const isIndependentResearch = formData.get('isIndependentResearch') === 'true'

  // Determine research status
  const status = isDraft
    ? 'Draft'
    : (isTeacher ? 'Published' : 'Pending Review')

  // Identity fields
  const title = (formData.get('title') as string)?.trim()
  const type = (formData.get('type') as string)?.trim()
  const abstract = (formData.get('abstract') as string)?.trim()
  const academicYear = (formData.get('academicYear') as string)?.trim()

  const keywords = formData
    .getAll('keywords')
    .map(k => (k as string).trim())
    .filter(k => k !== '')

  // Validate title only for real submissions
  if (!isDraft && (!title || title.length < 5)) {
    return { error: 'A valid title is required for submission.' }
  }

  if (!isDraft && !abstract) {
    return { error: 'An abstract or description is required for submission.' }
  }

  if (!isDraft && !ACADEMIC_YEAR_PATTERN.test(academicYear || '')) {
    return { error: 'Academic year must follow the YYYY-YYYY format.' }
  }

  if (!isDraft && keywords.length < MINIMUM_KEYWORDS) {
    return { error: `Please provide at least ${MINIMUM_KEYWORDS} keywords.` }
  }

  if (!isDraft) {
    const submittedKeywordFields = formData
      .getAll('keywords')
      .map((keyword) => (keyword as string).trim())

    if (submittedKeywordFields.some((keyword) => keyword === '')) {
      return { error: 'Please fill in every keyword field before submitting.' }
    }
  }

  // Academic fields
  const subjectCode = (formData.get('subjectCode') as string)?.trim() || ''
  const adviser = (formData.get('adviser') as string)?.trim() || null
  const proofreaderId = (formData.get('proofreaderId') as string)?.trim() || null
  const researchArea = (formData.get('researchArea') as string)?.trim()

  // Timeline fields
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

  // Collect members and their roles
  const rawMembers: string[] = []
  const rawMemberRoles: string[] = []

  for (const [key, value] of formData.entries()) {
    if (key.startsWith('member-')) rawMembers.push((value as string).trim())
    if (key.startsWith('role-')) rawMemberRoles.push((value as string).trim())
  }

  const members: string[] = []
  const memberRoles: string[] = []

  for (let i = 0; i < rawMembers.length; i++) {
    const memberId = rawMembers[i]
    if (memberId && memberId !== user.id && !members.includes(memberId)) {
      members.push(memberId)
      memberRoles.push(rawMemberRoles[i] || 'Member')
    }
  }

  // Secure file upload
  const initialDocument = formData.get('initialDocument') as File | null
  let fileUrl = null
  let originalFileName = null

  if (initialDocument && initialDocument.size > 0) {
    try {
      const uploadedFile = await uploadResearchDocument(supabase, user.id, initialDocument)
      fileUrl = uploadedFile.filePath
      originalFileName = uploadedFile.originalFileName
    } catch (error: unknown) {
      console.error('Storage Upload Error:', error)
      return { error: getErrorMessage(error, 'Failed to securely upload the document. Please try again.') }
    }
  }

  const submissionFormat = isTeacher
    ? 'pdf'
    : resolveResearchSubmissionFormat(requestedSubmissionFormat, {
        hasPdf: Boolean(fileUrl),
        hasText: hasTextContent,
        stage: currentStage,
      })

  if (!isDraft) {
    const needsPdf = isTeacher || submissionFormat === 'pdf' || submissionFormat === 'both'
    const needsText = !isTeacher && (submissionFormat === 'text' || submissionFormat === 'both')

    if (needsPdf && !fileUrl) {
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

  // Technical Artifacts & Source Code
  const repositoryUrl = (formData.get('repositoryUrl') as string)?.trim() || null
  const demoUrl = (formData.get('demoUrl') as string)?.trim() || null

  const sourceCodeZip = formData.get('sourceCodeZip') as File | null
  let sourceCodeUrl: string | null = null
  let sourceCodeFilename: string | null = null

  if (sourceCodeZip && sourceCodeZip.size > 0) {
    try {
      const uploadedZip = await uploadSourceCodeArchive(supabase, user.id, sourceCodeZip)
      sourceCodeUrl = uploadedZip.filePath
      sourceCodeFilename = uploadedZip.originalFileName
    } catch (err: unknown) {
      console.error('Source Code Upload Error:', err)
      return { error: getErrorMessage(err, 'Failed to upload source code archive.') }
    }
  }

  // Technical Diagrams (DFD, ERD, Architecture, Mockups)
  const rawExistingDiagrams = formData.get('existingDiagramsJson') as string | null
  let diagrams: ResearchDiagramItem[] = []
  if (rawExistingDiagrams) {
    try {
      diagrams = JSON.parse(rawExistingDiagrams)
    } catch {
      diagrams = []
    }
  }

  const diagramCount = Number(formData.get('diagramCount') || 0)
  for (let i = 0; i < diagramCount; i++) {
    const diagramFile = formData.get(`diagram_file_${i}`) as File | null
    const diagramType = (formData.get(`diagram_type_${i}`) as ResearchDiagramType) || 'other'
    const diagramTitle = (formData.get(`diagram_title_${i}`) as string)?.trim() || 'Technical Diagram'

    if (diagramFile && diagramFile.size > 0) {
      try {
        const uploadedDiagram = await uploadResearchDiagram(supabase, user.id, diagramFile)
        diagrams.push({
          id: crypto.randomUUID(),
          file_url: uploadedDiagram.filePath,
          title: diagramTitle,
          diagram_type: diagramType,
          original_file_name: uploadedDiagram.originalFileName,
          created_at: new Date().toISOString(),
        })
      } catch (err: unknown) {
        console.error('Diagram Upload Error:', err)
        return { error: getErrorMessage(err, `Failed to upload diagram "${diagramTitle}".`) }
      }
    }
  }

  // Insert research record
  const { data: newResearch, error } = await supabase
    .from('research')
    .insert({
      user_id: user.id,
      title,
      type,
      abstract,
      academic_year: academicYear || null,
      keywords,
      subject_code: normalizedSubjectCode,
      adviser_id: normalizedAdviser,
      proofreader_id: proofreaderId,
      research_area: researchArea,
      start_date: normalizedStartDate,
      target_defense_date: normalizedTargetDefenseDate,
      current_stage: currentStage,
      status,
      published_at: getPublishedAtForStatusChange(null, status, null),
      members,
      member_roles: memberRoles,
      file_url: fileUrl,
      original_file_name: originalFileName,
      submission_format: submissionFormat,
      content_json: !isTeacher && hasTextContent ? documentContent : null,
      repository_url: repositoryUrl,
      demo_url: demoUrl,
      source_code_url: sourceCodeUrl,
      source_code_filename: sourceCodeFilename,
      diagrams,
    })
    .select()
    .single()

  if (error) {
    console.error('Database Error:', error)
    return { error: error.message }
  }

  // Save version history if file exists and it's not a draft
  if (!isDraft && newResearch && (fileUrl || (!isTeacher && hasTextContent))) {
    const versionInfo = getNextStudentVersion([])

    const { error: versionError } = await supabase
      .from('research_versions')
      .insert({
        research_id: newResearch.id,
        uploaded_by: user.id,
        file_url: fileUrl,
        original_file_name: originalFileName,
        content_json: !isTeacher && hasTextContent ? documentContent : null,
        version_number: 1,
        version_major: versionInfo.version_major,
        version_minor: versionInfo.version_minor,
        version_label: versionInfo.version_label,
        created_by_role: isTeacher ? 'teacher' : 'student',
        change_type: isTeacher ? 'teacher_submit' : 'student_submit',
      })

    if (versionError) {
      console.error('Version Insert Error:', versionError)
    }
  }

  // Redirect after submission
  if (!isDraft) {
    if (!isTeacher) {
      await notifyTeachersForResearchSubmission(supabase, {
        actorId: user.id,
        researchId: newResearch.id,
        researchTitle: title,
        subjectCode: normalizedSubjectCode,
        adviserId: normalizedAdviser,
        proofreaderId,
        status: 'Pending Review',
        eventKeySuffix: 'initial-submission',
      })

      redirect('/dashboard?success=Research submitted for review')
    }

    redirect('/dashboard?success=Research published successfully')
  }

  return {
    success: 'Draft saved successfully',
    id: newResearch.id
  }
}
