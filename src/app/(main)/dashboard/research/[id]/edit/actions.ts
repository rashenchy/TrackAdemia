'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updateResearch(editId: string, prevState: any, formData: FormData) {
  const supabase = await createClient()

  // AUTHENTICATION & PERMISSIONS

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isDraft = formData.get('isDraft') === 'true'

  // Fetch current record for security validation
  const { data: current } = await supabase
    .from('research')
    .select('status, user_id, members')
    .eq('id', editId)
    .single()

  // Authorization check (Owner or Member)
  const isAuthor = current?.user_id === user.id || (current?.members || []).includes(user.id)
  if (!current || !isAuthor) return { error: 'Unauthorized' }

  // Check user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isTeacher = profile?.role === 'mentor'


  // WORKFLOW LOGIC

  let nextStatus = current.status

  // Logic to determine new status based on role and draft state
  if (isDraft) {
    nextStatus = 'Draft'
  } else if (isTeacher) {
    nextStatus = 'Published'
  } else {
    nextStatus = (current.status !== 'Draft') ? 'Resubmitted' : 'Pending Review'
  }


  // DATA EXTRACTION

  const title = (formData.get('title') as string)?.trim()
  const type = (formData.get('type') as string)?.trim()
  const abstract = (formData.get('abstract') as string)?.trim()
  const keywords = formData.getAll('keywords')
    .map(k => (k as string).trim())
    .filter(k => k !== '')

  const subjectCode = (formData.get('subjectCode') as string)?.trim()
  const adviser = (formData.get('adviser') as string)?.trim() || null
  const researchArea = (formData.get('researchArea') as string)?.trim()

  const startDate = (formData.get('startDate') as string) || null
  const targetDefenseDate = (formData.get('targetDefenseDate') as string) || null
  const currentStage = (formData.get('currentStage') as string)?.trim()

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

  if (initialDocument && initialDocument.size > 0) {
    const allowedTypes = ['application/pdf']
    const MAX_FILE_SIZE = 20 * 1024 * 1024

    if (!allowedTypes.includes(initialDocument.type)) return { error: 'Only PDF files are allowed.' }
    if (initialDocument.size > MAX_FILE_SIZE) return { error: 'File must be under 20MB.' }

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


  // DATABASE UPDATE

  const updatePayload: any = {
    title, type, abstract, keywords,
    subject_code: subjectCode,
    adviser_id: adviser,
    research_area: researchArea,
    start_date: startDate,
    target_defense_date: targetDefenseDate,
    current_stage: currentStage,
    status: nextStatus,
    members: members.filter(id => id !== ''),
    member_roles: memberRoles,
    ...(fileUrl && { file_url: fileUrl })
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

  if (fileUrl && updatedResearch && !isDraft) {
    // Fetch latest version number
    const { data: existingVersions } = await supabase
      .from('research_versions')
      .select('version_number')
      .eq('research_id', editId)
      .order('version_number', { ascending: false })
      .limit(1)

    const nextVersion = (existingVersions && existingVersions.length > 0) 
      ? existingVersions[0].version_number + 1 
      : 2

    // Log the new version
    const { error: versionError } = await supabase
      .from('research_versions')
      .insert({
        research_id: editId,
        uploaded_by: user.id,
        file_url: fileUrl,
        version_number: nextVersion
      })

    if (versionError) console.error('Version Insert Error:', versionError)

    // Mark existing annotations as resolved
    await supabase
      .from('annotations')
      .update({ is_resolved: true })
      .eq('research_id', editId)
      .eq('is_resolved', false)
  }


  // FINALIZATION

  if (!isDraft) redirect(`/dashboard/research/${editId}?success=Resubmitted for review`)

  return { success: 'Draft updated successfully' }
}