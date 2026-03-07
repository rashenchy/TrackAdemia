'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function submitResearch(prevState: any, formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Identity
  const title = formData.get('title') as string
  const type = formData.get('type') as string
  const abstract = formData.get('abstract') as string

  // Academic
  const subjectCode = formData.get('subjectCode') as string
  const adviser = formData.get('adviser') as string
  const researchArea = formData.get('researchArea') as string

  // Timeline
  const startDate = formData.get('startDate') as string
  const targetDefenseDate = formData.get('targetDefenseDate') as string || null
  const currentStage = formData.get('currentStage') as string

  // Extract Group Members and Roles
  const members: string[] = []
  const memberRoles: string[] = []

  for (const [key, value] of formData.entries()) {
    if (key.startsWith('member-')) members.push(value as string)
    if (key.startsWith('role-')) memberRoles.push(value as string)
  }

  // --- SECURE FILE UPLOAD LOGIC ---
  const initialDocument = formData.get('initialDocument') as File | null;
  let fileUrl = null;

  if (initialDocument && initialDocument.size > 0) {
    // Generate a secure, unique file path: userId/timestamp_random.ext
    const fileExt = initialDocument.name.split('.').pop() || 'pdf';
    const uniqueFilename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${user.id}/${uniqueFilename}`;

    // UPDATED: Using 'trackademiaPapers'
    // UPDATED: Using 'trackademiaPapers'
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('trackademiaPapers')
      .upload(filePath, initialDocument, {
        cacheControl: '3600',
        upsert: false,
        contentType: initialDocument.type // <-- ADD THIS LINE
      });

    if (uploadError) {
      console.error('Storage Upload Error:', uploadError);
      return { error: 'Failed to securely upload the document. Please try again.' };
    }

    // Store the internal bucket path
    fileUrl = uploadData.path; 
  }

  // Add .select().single() to get the newly created ID back
  const { data: newResearch, error } = await supabase.from('research').insert({
    user_id: user.id,
    title,
    type,
    abstract,
    subject_code: subjectCode,
    adviser_id: adviser || null,
    research_area: researchArea,
    start_date: startDate,
    target_defense_date: targetDefenseDate,
    current_stage: currentStage,
    status: 'Pending Review',
    members: members,
    member_roles: memberRoles,
    file_url: fileUrl 
  }).select().single()

  if (error) {
    console.error('Database Error:', error)
    return { error: 'Failed to submit research entry.' }
  }

  // NEW: If a file was uploaded, save it as Version 1
  if (fileUrl && newResearch) {
    await supabase.from('research_versions').insert({
      research_id: newResearch.id,
      uploaded_by: user.id,
      file_url: fileUrl,
      version_number: 1
    })
  }

  redirect('/dashboard?success=Research submitted successfully')
}