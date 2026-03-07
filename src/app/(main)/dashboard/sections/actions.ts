'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function createSection(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = formData.get('name') as string
  const courseCode = formData.get('courseCode') as string
  
  // Generate a unique 6-character code
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()

  const { error } = await supabase.from('sections').insert({
    name,
    course_code: courseCode,
    teacher_id: user.id,
    join_code: joinCode 
  })

  if (error) return { error: 'Failed to create section.' }

  revalidatePath('/dashboard/sections')
  redirect('/dashboard/sections?success=Section created successfully!')
}

export async function joinSection(prevState: any, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be logged in.' }

  const joinCode = (formData.get('joinCode') as string)?.toUpperCase().trim()

  // 1. Rate Limiting (Max 5 attempts)
  const cookieStore = await cookies()
  const attempts = parseInt(cookieStore.get('join_attempts')?.value || '0')
  if (attempts >= 5) {
    return { error: 'Too many failed attempts. Please try again later.' }
  }

  const { data: section, error: sectionError } = await supabase
    .from('sections')
    .select('id, name, is_frozen')
    .eq('join_code', joinCode)
    .single()

  if (sectionError || !section) {
    cookieStore.set('join_attempts', (attempts + 1).toString(), { maxAge: 300 }) // 5 min lockout
    return { error: `Invalid code. (${4 - attempts} attempts remaining)` }
  }

  // 2. Freeze Check
  if (section.is_frozen) {
    return { error: 'This section is currently frozen by the teacher. No new joins allowed.' }
  }

  // 3. Ban Check
  const { data: existing } = await supabase
    .from('section_members')
    .select('id, status')
    .eq('section_id', section.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'banned') return { error: 'You have been banned from this section.' }
    return { error: `You are already in ${section.name}.` }
  }

  // If this was just a "Preview/Confirm" step (UX Improvement)
  if (formData.get('action') === 'preview') {
    return { previewSection: section }
  }

  // 4. Actual Insert
  const { error: joinError } = await supabase.from('section_members').insert({
    section_id: section.id, user_id: user.id, role: 'student', status: 'active'
  })

  if (joinError) return { error: 'Failed to join section.' }

  // Reset rate limit on success
  cookieStore.delete('join_attempts')
  revalidatePath('/dashboard/sections')
  return { success: `Successfully joined ${section.name}!` }
}

export async function leaveSection(sectionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to leave a section.' };
  }

  const { error } = await supabase
    .from('section_members')
    .delete()
    .eq('section_id', sectionId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Leave Section Error:', error);
    return { error: 'Failed to leave the section. Please try again.' };
  }

  revalidatePath('/dashboard/sections');
  return { success: 'Successfully left the section.' };
}

export async function regenerateJoinCode(sectionId: string) {
  const supabase = await createClient()
  const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()

  const { error } = await supabase
    .from('sections')
    .update({ join_code: newCode })
    .eq('id', sectionId)

  if (error) return { error: 'Failed to regenerate code.' }
  revalidatePath('/dashboard/sections')
  return { success: 'New join code generated!' }
}

export async function toggleSectionFreeze(sectionId: string, currentStatus: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('sections')
    .update({ is_frozen: !currentStatus })
    .eq('id', sectionId)

  if (error) return { error: 'Failed to update section status.' }
  revalidatePath('/dashboard/sections')
  return { success: `Section ${!currentStatus ? 'frozen' : 'unlocked'}.` }
}

export async function updateStudentStatus(sectionId: string, studentId: string, status: 'banned' | 'active') {
  const supabase = await createClient()
  const { error } = await supabase
    .from('section_members')
    .update({ status: status })
    .eq('section_id', sectionId)
    .eq('user_id', studentId)

  if (error) return { error: `Failed to ${status === 'banned' ? 'ban' : 'unban'} student.` }
  revalidatePath('/dashboard/sections')
  return { success: `Student ${status}.` }
}

export async function removeStudent(sectionId: string, studentId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('section_members')
    .delete()
    .eq('section_id', sectionId)
    .eq('user_id', studentId)

  if (error) return { error: 'Failed to remove student.' }
  revalidatePath('/dashboard/sections')
  return { success: 'Student completely removed from section.' }
}

