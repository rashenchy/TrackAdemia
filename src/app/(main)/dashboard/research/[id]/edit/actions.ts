'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updateResearch(editId: string, prevState: any, formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isDraft = formData.get('isDraft') === 'true'

  /* ------------------ Fetch Current Research (Security) ------------------ */

  const { data: current } = await supabase
    .from('research')
    .select('status, user_id, members')
    .eq('id', editId)
    .single()

  // Allow owner OR listed members
  const isAuthor =
    current?.user_id === user.id ||
    (current?.members || []).includes(user.id)

  if (!current || !isAuthor) {
    return { error: 'Unauthorized' }
  }

  /* ------------------ Fetch Role ------------------ */

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isTeacher = profile?.role === 'mentor'

  /* ------------------ Workflow Logic ------------------ */


  let nextStatus = current.status

  // Save Draft → always Draft
  if (isDraft) {
    nextStatus = 'Draft'
  }

  // Submit
  if (!isDraft) {

    // Teacher submissions publish immediately
    if (isTeacher) {
      nextStatus = 'Published'
    }

    // Student submissions
    else {

      // If teacher requested revision → mark as Resubmitted
      if (current.status === 'Revision Requested') {
        nextStatus = 'Resubmitted'
      }

      // Otherwise normal submission
      else {
        nextStatus = 'Pending Review'
      }
    }
  }

  /* ------------------ Identity ------------------ */

  const title = (formData.get('title') as string)?.trim()
  const type = (formData.get('type') as string)?.trim()
  const abstract = (formData.get('abstract') as string)?.trim()

  const keywords = formData
    .getAll('keywords')
    .map(k => (k as string).trim())
    .filter(k => k !== '')

  /* ------------------ Academic ------------------ */

  const subjectCode = (formData.get('subjectCode') as string)?.trim()
  const adviser = (formData.get('adviser') as string)?.trim() || null
  const researchArea = (formData.get('researchArea') as string)?.trim()

  /* ------------------ Timeline ------------------ */

  const startDate = (formData.get('startDate') as string) || null
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
  let fileUrl: string | null = null

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
      return { error: 'Failed to securely upload the new document.' }
    }

    fileUrl = uploadData.path
  }

  /* ------------------ Build Update Payload ------------------ */

  const updatePayload: any = {
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
    status: nextStatus,
    members: members.filter(id => id !== ''),
    member_roles: memberRoles
  }

  if (fileUrl) {
    updatePayload.file_url = fileUrl
  }

  /* ------------------ Update Research ------------------ */

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

  /* ------------------ Save New Version if File Changed ------------------ */

  if (fileUrl && updatedResearch && !isDraft) {

    const { data: latestVersion } = await supabase
      .from('research_versions')
      .select('version_number')
      .eq('research_id', editId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single()

    const nextVersion = (latestVersion?.version_number ?? 0) + 1

    const { error: versionError } = await supabase
      .from('research_versions')
      .insert({
        research_id: editId,
        uploaded_by: user.id,
        file_url: fileUrl,
        version_number: nextVersion
      })

    if (versionError) {
      console.error('Version Insert Error:', versionError)
    }
  }

  /* ------------------ Redirect Logic ------------------ */

  if (!isDraft) {
    redirect(`/dashboard/research/${editId}?success=Resubmitted for review`)
  }

  return { success: 'Draft updated successfully' }
}