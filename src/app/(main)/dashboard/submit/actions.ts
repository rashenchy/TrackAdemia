'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function submitResearch(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  /* ------------------ Fetch Role ------------------ */

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isTeacher = profile?.role === 'mentor'
  const initialStatus = isTeacher ? 'Published' : 'Pending Review'

  /* ------------------ Identity ------------------ */

  const title = (formData.get('title') as string)?.trim()
  const type = (formData.get('type') as string)?.trim()
  const abstract = (formData.get('abstract') as string)?.trim()
  const keywords = formData.getAll('keywords').map(k => (k as string).trim()).filter(k => k !== '')

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
      status: initialStatus, // Role-based status
      members,
      member_roles: memberRoles,
      file_url: fileUrl
    })
    .select()
    .single()

  if (error) {
    console.error('Database Error:', error)
    return { error: 'Failed to submit research entry.' }
  }

  /* ------------------ Save Version 1 ------------------ */

  if (fileUrl && newResearch) {

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

  redirect('/dashboard?success=Research submitted successfully')
}