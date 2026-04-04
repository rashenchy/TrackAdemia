'use server'

import { createClient } from '@/lib/supabase/server'
import { uploadResearchDocument } from '@/lib/research/files'
import { getPublishedAtForStatusChange } from '@/lib/research/publication'
import { notifyTeachersForResearchSubmission } from '@/lib/research/workflow'
import { redirect } from 'next/navigation'

export async function submitResearch(prevState: any, formData: FormData) {
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

  const isTeacher = profile?.role === 'mentor'

  // Determine research status
  const status = isDraft
    ? 'Draft'
    : (isTeacher ? 'Published' : 'Pending Review')

  // Identity fields
  const title = (formData.get('title') as string)?.trim()
  const type = (formData.get('type') as string)?.trim()
  const abstract = (formData.get('abstract') as string)?.trim()

  const keywords = formData
    .getAll('keywords')
    .map(k => (k as string).trim())
    .filter(k => k !== '')

  // Validate title only for real submissions
  if (!isDraft && (!title || title.length < 5)) {
    return { error: 'A valid title is required for submission.' }
  }

  // Academic fields
  const subjectCode = (formData.get('subjectCode') as string)?.trim()
  const adviser = (formData.get('adviser') as string)?.trim() || null
  const researchArea = (formData.get('researchArea') as string)?.trim()

  // Timeline fields
  const startDate = formData.get('startDate') as string
  const targetDefenseDate = (formData.get('targetDefenseDate') as string) || null
  const currentStage = (formData.get('currentStage') as string)?.trim()

  // Collect members and their roles
  const members: string[] = []
  const memberRoles: string[] = []

  for (const [key, value] of formData.entries()) {
    if (key.startsWith('member-')) members.push((value as string).trim())
    if (key.startsWith('role-')) memberRoles.push((value as string).trim())
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
    } catch (error: any) {
      console.error('Storage Upload Error:', error)
      return { error: error?.message || 'Failed to securely upload the document. Please try again.' }
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
      keywords,
      subject_code: subjectCode,
      adviser_id: adviser,
      research_area: researchArea,
      start_date: startDate,
      target_defense_date: targetDefenseDate,
      current_stage: currentStage,
      status,
      published_at: getPublishedAtForStatusChange(null, status, null),
      members,
      member_roles: memberRoles,
      file_url: fileUrl,
      original_file_name: originalFileName
    })
    .select()
    .single()

  if (error) {
    console.error('Database Error:', error)
    return { error: error.message }
  }

  // Save version history if file exists and it's not a draft
  if (!isDraft && fileUrl && newResearch) {

    const { error: versionError } = await supabase
      .from('research_versions')
      .insert({
        research_id: newResearch.id,
        uploaded_by: user.id,
        file_url: fileUrl,
        original_file_name: originalFileName,
        version_number: 1
      })

    if (versionError) {
      console.error('Version Insert Error:', versionError)
    }
  }

  // Redirect after submission
  if (!isDraft) {
    await notifyTeachersForResearchSubmission(supabase, {
      actorId: user.id,
      researchId: newResearch.id,
      researchTitle: title,
      subjectCode,
      adviserId: adviser,
      status: 'Pending Review',
      eventKeySuffix: 'initial-submission',
    })
    redirect('/dashboard?success=Research submitted for review')
  }

  return {
    success: 'Draft saved successfully',
    id: newResearch.id
  }
}
