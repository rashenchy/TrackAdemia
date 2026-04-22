'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isAllowedCourseProgram } from '@/lib/core/course-programs'
import { getProfileAccessState } from '@/lib/users/access'

type CreateFacultyAccountResult = {
  success: boolean
  error?: string
}

function normalizeNamePart(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function createFacultyAccount(
  formData: FormData
): Promise<CreateFacultyAccountResult> {
  const supabase = await createClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  if (!currentUser) {
    return { success: false, error: 'Not authenticated.' }
  }

  const adminProfile = await getProfileAccessState(supabase, currentUser.id)

  if (!adminProfile?.is_active || adminProfile.role !== 'admin') {
    return { success: false, error: 'Only administrators can create faculty accounts.' }
  }

  const adminSupabase = createAdminClient()

  if (!adminSupabase) {
    return {
      success: false,
      error: 'Admin Supabase client is not configured. Faculty account creation is unavailable.',
    }
  }

  const firstName = normalizeNamePart(formData.get('firstName'))
  const middleName = normalizeNamePart(formData.get('middleName'))
  const lastName = normalizeNamePart(formData.get('lastName'))
  const email = normalizeNamePart(formData.get('email')).toLowerCase()
  const course = normalizeNamePart(formData.get('course'))
  const password = typeof formData.get('password') === 'string' ? String(formData.get('password')) : ''

  if (!firstName || !lastName || !email || !course || !password) {
    return { success: false, error: 'Please complete all required faculty account fields.' }
  }

  if (!isAllowedCourseProgram(course)) {
    return {
      success: false,
      error: 'Course program must be one of the allowed options: BSIT, BSBA, or BSENTREP.',
    }
  }

  if (password.length < 8) {
    return {
      success: false,
      error: 'Faculty passwords must contain at least 8 characters.',
    }
  }

  const metadata = {
    first_name: firstName,
    middle_name: middleName || null,
    last_name: lastName,
    course_program: course,
    role: 'mentor' as const,
    is_verified: true,
    student_number: null,
  }

  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  if (!data.user?.id) {
    return { success: false, error: 'Faculty account was created without a user ID.' }
  }

  const { error: profileError } = await adminSupabase.from('profiles').upsert(
    {
      id: data.user.id,
      ...metadata,
      is_active: true,
      deleted_at: null,
      deleted_by: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  )

  if (profileError) {
    return { success: false, error: profileError.message }
  }

  revalidatePath('/admin/faculty-approval')
  revalidatePath('/admin/users')
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/settings/faculty-approval')
  revalidatePath('/dashboard/settings/users')

  return { success: true }
}
