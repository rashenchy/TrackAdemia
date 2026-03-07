'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updateResearch(editId: string, prevState: any, formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const title = formData.get('title') as string
  const type = formData.get('type') as string
  const abstract = formData.get('abstract') as string
  const subjectCode = formData.get('subjectCode') as string
  const adviser = formData.get('adviser') as string
  const researchArea = formData.get('researchArea') as string
  const startDate = formData.get('startDate') as string
  const targetDefenseDate = formData.get('targetDefenseDate') as string
  const currentStage = formData.get('currentStage') as string

  const members: string[] = []
  const memberRoles: string[] = []

  for (const [key, value] of formData.entries()) {
    if (key.startsWith('member-')) members.push(value as string)
    if (key.startsWith('role-')) memberRoles.push(value as string)
  }

  const initialDocument = formData.get('initialDocument') as File | null;
  let fileUrl = undefined; 

  if (initialDocument && initialDocument.size > 0) {
    const fileExt = initialDocument.name.split('.').pop() || 'pdf';
    const uniqueFilename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${user.id}/${uniqueFilename}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('trackademiaPapers')
      .upload(filePath, initialDocument, {
        cacheControl: '3600',
        upsert: false,
        contentType: initialDocument.type // <-- ADD THIS LINE
      });

    if (uploadError) {
      console.error('Storage Upload Error:', uploadError);
      return { error: 'Failed to securely upload the new document. Please try again.' };
    }
    fileUrl = uploadData.path; 
  }

  // FIXED: Strictly convert empty strings to null to prevent Postgres type errors
  const updatePayload: any = {
    title,
    type,
    abstract,
    subject_code: subjectCode,
    adviser_id: adviser ? adviser : null,
    research_area: researchArea,
    start_date: startDate ? startDate : null,
    target_defense_date: targetDefenseDate ? targetDefenseDate : null,
    current_stage: currentStage,
    members: members.filter(id => id.trim() !== ''),
    member_roles: memberRoles,
  }

  if (fileUrl) {
    updatePayload.file_url = fileUrl;
  }

  const { data, error } = await supabase
    .from('research')
    .update(updatePayload)
    .eq('id', editId)
    .select();

    console.log('update result', data, error);

  if (error) {
    console.error('Database Error:', error)
    return { error: 'Failed to update research entry.' }
  }

  redirect(`/dashboard/research/${editId}?success=Research updated successfully`)
}