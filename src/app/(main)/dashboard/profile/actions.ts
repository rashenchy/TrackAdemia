'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isValidStudentNumber, normalizeStudentNumber } from '@/lib/core/student-number'

export type UpdateProfileState = {
  error?: string
  success?: string
}

export type ChangePasswordState = {
  error?: string
  success?: string
}

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/

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
    return { error: 'Student number must follow the format ATC2023-12345.' }
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

export async function changePassword(
  _previousState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return { error: 'You must be logged in to change your password.' }
  }

  const currentPassword = (formData.get('currentPassword') as string | null) || ''
  const newPassword = (formData.get('newPassword') as string | null) || ''
  const confirmPassword = (formData.get('confirmPassword') as string | null) || ''

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: 'Please complete all password fields.' }
  }

  if (newPassword !== confirmPassword) {
    return { error: 'New password and confirmation password do not match.' }
  }

  if (newPassword.length < 8 || !PASSWORD_PATTERN.test(newPassword)) {
    return {
      error:
        'New password must be at least 8 characters and include uppercase, lowercase, and a number.',
    }
  }

  if (currentPassword === newPassword) {
    return { error: 'New password must be different from your current password.' }
  }

  const verificationClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const { error: verificationError } = await verificationClient.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })

  if (verificationError) {
    return { error: 'Current password is incorrect.' }
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/dashboard/profile')
  revalidatePath('/dashboard/settings')

  return { success: 'Password updated successfully.' }
}
