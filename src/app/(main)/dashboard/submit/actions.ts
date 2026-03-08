'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function submitResearch(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  /* ------------------ Draft Detection ------------------ */

  const isDraft = formData.get('isDraft') === 'true'

  /* ------------------ Fetch Role ------------------ */

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isTeacher = profile?.role === 'mentor'

  const status = isDraft
    ? 'Draft'
    : (isTeacher ? 'Published' : 'Pending Review')

  /* ------------------ Identity ------------------ */

  const title = (formData.get('title') as string)?.trim()
  const type = (formData.get('type') as string)?.trim()
  const abstract = (formData.get('abstract') as string)?.trim()

  const keywords = formData
    .getAll('keywords')
    .map(k => (k as string).trim())
    .filter(k => k !== '')

  /* Draft validation: only enforce for real submission */

  if (!isDraft && (!title || title.length < 5)) {
    return { error: 'A valid title is required for submission.' }
  }

  /* ------------------ Academic ------------------ */

  const subjectCode = (formData.get('subjectCode') as string)?.trim()
  const adviser = (formData.get('adviser') as string)?.trim() || null
  const researchArea = (formData.get('researchArea') as string)?.trim()

  /* ------------------ Timeline ------------------ */

  const startDate = formData.get('startDate') as string
  const targetDefenseDate = (formData.get('targetDefenseDate') as string) || null
  const currentStage = (formData.get('currentStage') as string)?.trim()

  /* ------------------ Members ------------------ */

  const members: string[] = []
  const memberRoles: string[] = []

  for (const [key, value] of formData.entries()) {
    if (key.startsWith('member-')) members.push((value as string).trim())
    if (key.startsWith('role-')) memberRoles.push((value as string).trim())
  }

  /* ------------------ Secure File Upload ------------------ */

  const initialDocument = formData.get('initialDocument') as File | null
  let fileUrl = null

  if (initialDocument && initialDocument.size > 0) {

    const allowedTypes = ['application/pdf']
    const MAX_FILE_SIZE = 20 * 1024 * 1024

    if (!allowedTypes.includes(initialDocument.type)) {
      return { error: 'Only PDF files are allowed.' }
    }

    if (initialDocument.size > MAX_FILE_SIZE) {
      return { error: 'File must be under 20MB.' }
    }

    const fileExt = initialDocument.name.split('.').pop() || 'pdf'
    const uniqueFilename = `${Date.now()}_${crypto.randomUUID()}.${fileExt}`
    const filePath = `${user.id}/${uniqueFilename}`

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

  /* ------------------ Insert Research ------------------ */

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

  /* ------------------ Save Version 1 (only if file exists AND not draft) ------------------ */

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

  /* ------------------ Response Handling ------------------ */

  if (!isDraft) {
    redirect('/dashboard?success=Research submitted for review')
  }

  return {
    success: 'Draft saved successfully',
    id: newResearch.id
  }
}