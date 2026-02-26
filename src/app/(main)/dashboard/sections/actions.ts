'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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
  if (!joinCode || joinCode.length !== 6) {
    return { error: 'Please enter a valid 6-character code.' }
  }

  // 1. Find section with explicit type casting to fix property access errors
  const { data: section, error: sectionError } = await supabase
    .rpc('find_section_by_code', { code: joinCode })
    .single() as { data: { id: string, name: string } | null, error: any }

  if (sectionError || !section) {
    return { error: 'Section not found. Ask your teacher for the correct code.' }
  }

  // 2. Check membership using the typed section ID
  const { data: existing } = await supabase
    .from('section_members')
    .select('id')
    .eq('section_id', section.id)
    .eq('user_id', user.id)
    .maybeSingle() // Using maybeSingle to handle "not found" gracefully

  if (existing) {
    return { error: `You are already in ${section.name}.` }
  }

  // 3. Insert membership
  const { error: joinError } = await supabase
    .from('section_members')
    .insert({
      section_id: section.id,
      user_id: user.id,
      role: 'student'
    })

  if (joinError) {
    console.error('Join Error:', joinError)
    // Common cause: RLS policies or unique constraint violations
    return { error: 'Failed to join section. Please check your connection or permissions.' }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/sections')
  
  return { success: `Successfully joined ${section.name}!` }
}

// Add this to src/app/(main)/dashboard/sections/actions.ts

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