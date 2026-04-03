'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isValidStudentNumber, normalizeStudentNumber } from '@/lib/student-number'

export type UpdateProfileState = {
  error?: string
  success?: string
}

export async function updateProfile(
  _previousState: UpdateProfileState,
  formData: FormData
): Promise<UpdateProfileState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to update your profile.' }
  }

  const firstName = (formData.get('firstName') as string | null)?.trim() || ''
  const middleName = (formData.get('middleName') as string | null)?.trim() || ''
  const lastName = (formData.get('lastName') as string | null)?.trim() || ''
  const courseProgram = (formData.get('courseProgram') as string | null)?.trim() || ''
  const rawStudentNumber = (formData.get('studentNumber') as string | null) ?? ''
  const studentNumber = normalizeStudentNumber(rawStudentNumber)

  if (!firstName || !lastName) {
    return { error: 'First name and last name are required.' }
  }

  if (!courseProgram) {
    return { error: 'Course / Program is required.' }
  }

  if (studentNumber && !isValidStudentNumber(studentNumber)) {
    return { error: 'Student number must follow the format ATC2023-00014.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      middle_name: middleName || null,
      last_name: lastName,
      course_program: courseProgram,
      student_number: studentNumber || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard', 'layout')

  return { success: 'Profile updated successfully.' }
}
