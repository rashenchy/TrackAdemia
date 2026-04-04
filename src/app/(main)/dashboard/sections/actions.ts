'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createNotification } from '@/lib/notification-service'

// Create a new class section (Teacher)
export async function createSection(
  _prevState: { error?: string } | null,
  formData: FormData
) {
  const supabase = await createClient()

  // Ensure user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = formData.get('name') as string
  const courseCode = formData.get('courseCode') as string
  
  // Generate a random 6-character join code
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase()

  const { error } = await supabase.from('sections').insert({
    name,
    course_code: courseCode,
    teacher_id: user.id,
    join_code: joinCode 
  })

  if (error) return { error: 'Failed to create section.' }

  // Refresh section list
  revalidatePath('/dashboard/sections')

  // Redirect after successful creation
  redirect('/dashboard/sections?success=Section created successfully!')
}


// Join an existing section using a join code
export async function joinSection(
  _prevState: {
    error?: string
    previewSection?: { id: string; name: string; is_frozen: boolean }
  } | null,
  formData: FormData
) {
  const supabase = await createClient()

  // Ensure user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be logged in.' }

  const joinCode = (formData.get('joinCode') as string)?.toUpperCase().trim()

  // Rate limiting: maximum of 5 failed attempts
  const cookieStore = await cookies()
  const attempts = parseInt(cookieStore.get('join_attempts')?.value || '0')

  if (attempts >= 5) {
    return { error: 'Too many failed attempts. Please try again later.' }
  }

  // Find the section by join code
  const { data: section, error: sectionError } = await supabase
    .from('sections')
    .select('id, name, is_frozen')
    .eq('join_code', joinCode)
    .single()

  // Invalid join code
  if (sectionError || !section) {
    cookieStore.set('join_attempts', (attempts + 1).toString(), { maxAge: 300 }) // lock for 5 minutes
    return { error: `Invalid code. (${4 - attempts} attempts remaining)` }
  }

  // Check if the section is currently frozen by the teacher
  if (section.is_frozen) {
    return { error: 'This section is currently frozen by the teacher. No new joins allowed.' }
  }

  // Check if the user already exists in the section
  const { data: existing } = await supabase
    .from('section_members')
    .select('id, status')
    .eq('section_id', section.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'banned') {
      return { error: 'You have been banned from this section.' }
    }
    return { error: `You are already in ${section.name}.` }
  }

  // Preview mode (optional UX step before confirming join)
  if (formData.get('action') === 'preview') {
    return { previewSection: section }
  }

  // Insert student into the section
  const { error: joinError } = await supabase.from('section_members').insert({
    section_id: section.id,
    user_id: user.id,
    role: 'student',
    status: 'active'
  })

  if (joinError) return { error: 'Failed to join section.' }

  // Reset rate limit after successful join
  cookieStore.delete('join_attempts')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  const { data: teacherSection } = await supabase
    .from('sections')
    .select('teacher_id')
    .eq('id', section.id)
    .single()

  if (teacherSection?.teacher_id) {
    const studentName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'A student'

    await createNotification(supabase, {
      user_id: teacherSection.teacher_id,
      actor_id: user.id,
      title: 'Student joined your section',
      message: `${studentName} joined ${section.name}.`,
      notification_type: 'section_joined',
      reference_id: section.id,
      section_id: section.id,
      event_key: `section-joined:${section.id}:${user.id}`,
    })
  }

  revalidatePath('/dashboard/sections')

  return { success: `Successfully joined ${section.name}!` }
}


// Allow a student to leave a section
export async function leaveSection(sectionId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to leave a section.' }
  }

  const { error } = await supabase
    .from('section_members')
    .delete()
    .eq('section_id', sectionId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Leave Section Error:', error)
    return { error: 'Failed to leave the section. Please try again.' }
  }

  revalidatePath('/dashboard/sections')

  return { success: 'Successfully left the section.' }
}


// Generate a new join code for a section
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


// Freeze or unfreeze a section (prevent new students from joining)
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


// Permanently remove a student from the section
export async function removeStudent(sectionId: string, studentId: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to remove a student.' }
  }

  const trimmedReason = reason.trim()

  if (!trimmedReason) {
    return { error: 'A removal reason is required.' }
  }

  const { data: section } = await supabase
    .from('sections')
    .select('id, name, teacher_id')
    .eq('id', sectionId)
    .maybeSingle()

  if (!section || section.teacher_id !== user.id) {
    return { error: 'You are not allowed to remove students from this section.' }
  }

  const { error } = await supabase
    .from('section_members')
    .delete()
    .eq('section_id', sectionId)
    .eq('user_id', studentId)
    .eq('role', 'student')

  if (error) return { error: 'Failed to remove student.' }

  await createNotification(supabase, {
      user_id: studentId,
      actor_id: user.id,
      section_id: sectionId,
      notification_type: 'section_removal',
      title: `Removed from ${section.name}`,
      message: `You were removed from ${section.name}. Reason: ${trimmedReason}`,
      reason: trimmedReason,
      reference_id: sectionId,
      event_key: `section-removal:${sectionId}:${studentId}:${trimmedReason}`,
    })

  revalidatePath('/dashboard/sections')
  revalidatePath('/dashboard')

  return { success: 'Student completely removed from section.' }
}
