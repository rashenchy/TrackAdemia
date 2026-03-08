'use server'

import { createClient } from '@/lib/supabase/server'
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

  if (initialDocument && initialDocument.size > 0) {

    const allowedTypes = ['application/pdf']
    const MAX_FILE_SIZE = 20 * 1024 * 1024

    // Validate file type
    if (!allowedTypes.includes(initialDocument.type)) {
      return { error: 'Only PDF files are allowed.' }
    }

    // Validate file size
    if (initialDocument.size > MAX_FILE_SIZE) {
      return { error: 'File must be under 20MB.' }
    }

    // Generate unique filename
    const fileExt = initialDocument.name.split('.').pop() || 'pdf'
    const uniqueFilename = `${Date.now()}_${crypto.randomUUID()}.${fileExt}`
    const filePath = `${user.id}/${uniqueFilename}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('trackademiaPapers')
      .upload(filePath, initialDocument, {
        cacheControl: '3600',
        upsert: false,
        contentType: initialDocument.type
      })

    if (uploadError) {
      console.error('Storage Upload Error:', uploadError)
      return { error: 'Failed to securely upload the document. Please try again.' }
    }

    fileUrl = uploadData.path
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
      members,
      member_roles: memberRoles,
      file_url: fileUrl
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
        version_number: 1
      })

    if (versionError) {
      console.error('Version Insert Error:', versionError)
    }
  }

  // Redirect after submission
  if (!isDraft) {
    redirect('/dashboard?success=Research submitted for review')
  }

  return {
    success: 'Draft saved successfully',
    id: newResearch.id
  }
}