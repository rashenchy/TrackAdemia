'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { sendRegistrationVerificationEmail } from '@/lib/core/email'
import { isRegistrationEmailVerificationEnabled } from '@/lib/core/registration-config'
import { rethrowIfRedirectError } from '@/lib/core/redirect-error'
import { createClient } from '@/lib/supabase/server'
import { isAllowedCourseProgram } from '@/lib/core/course-programs'
import { isValidStudentNumber, normalizeStudentNumber } from '@/lib/core/student-number'
import { getProfileAccessState } from '@/lib/users/access'
import {
  clearPendingRegistration,
  createPendingRegistrationSession,
} from '@/lib/users/pending-registration'
import { createAdminClient } from '@/lib/supabase/admin'


export async function login(formData: FormData) {

  // Initialize Supabase server client
  const supabase = await createClient()


  // Extract login credentials from the submitted form
  const email = formData.get('email') as string
  const password = formData.get('password') as string


  // Attempt authentication using Supabase email/password login
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })


  // If authentication fails, redirect back to login with error message
  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message))
  }
  const user = data.user

  let redirectPath = '/dashboard'

  if (user) {
    const profile = await getProfileAccessState(supabase, user.id)

    if (!profile?.is_active) {
      await supabase.auth.signOut()
      redirect('/login?error=' + encodeURIComponent('This account has been deactivated. Please contact an administrator.'))
    }

    if (profile.role === 'admin') {
      redirectPath = '/admin'
    }
  }

  // Refresh cached layout data and redirect user to the correct dashboard
  revalidatePath('/', 'layout')
  redirect(redirectPath)
}



export async function signup(formData: FormData) {
  // Extract user registration data from the submitted form
  const email = (formData.get('email') as string).trim().toLowerCase()
  const password = formData.get('password') as string
  const firstName = (formData.get('firstName') as string).trim()
  const middleName = (formData.get('middleName') as string).trim()
  const lastName = (formData.get('lastName') as string).trim()
  const course = (formData.get('course') as string).trim()
  const role = ((formData.get('role') as string) || 'student') as 'student' | 'mentor'
  const rawStudentNumber = (formData.get('studentNumber') as string | null) ?? ''
  const studentNumber = normalizeStudentNumber(rawStudentNumber)

  if (role === 'student' && !isValidStudentNumber(studentNumber)) {
    redirect(
      '/register?error=' +
        encodeURIComponent(
          'Student number must follow the format ATC2023-12345.'
        )
    )
  }

  if (!email || !password || !firstName || !lastName || !course) {
    redirect('/register?error=' + encodeURIComponent('Please complete all required fields.'))
  }

  if (!isAllowedCourseProgram(course)) {
    redirect(
      '/register?error=' +
        encodeURIComponent('Course program must be one of the allowed options: BSIT, BSBA, or BSENTREP.')
    )
  }

  try {
    if (!isRegistrationEmailVerificationEnabled()) {
      const outcome = await finalizeVerifiedSignup({
        email,
        password,
        firstName,
        middleName,
        lastName,
        course,
        role,
        studentNumber: role === 'student' ? studentNumber : null,
      })

      redirect(outcome.redirectPath)
    }

    const { code, expiresAt, flowToken, maskedEmail } = await createPendingRegistrationSession({
      email,
      password,
      firstName,
      middleName,
      lastName,
      course,
      role,
      studentNumber: role === 'student' ? studentNumber : null,
    })

    try {
      await sendRegistrationVerificationEmail({
        email,
        code,
        expiresAt,
      })
    } catch (error) {
      await clearPendingRegistration()
      throw error
    }

    redirect(
      '/verify-email?success=' +
        encodeURIComponent(`We sent a verification code to ${maskedEmail}.`) +
        `&flow=${encodeURIComponent(flowToken)}`
    )
  } catch (error) {
    rethrowIfRedirectError(error)

    const message =
      error instanceof Error
        ? error.message
        : 'Unable to start email verification. Please try again.'

    redirect('/register?error=' + encodeURIComponent(message))
  }
}

export async function finalizeVerifiedSignup({
  email,
  password,
  firstName,
  middleName,
  lastName,
  course,
  role,
  studentNumber,
}: {
  email: string
  password: string
  firstName: string
  middleName: string
  lastName: string
  course: string
  role: 'student' | 'mentor'
  studentNumber: string | null
}) {
  const metadata = {
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    course_program: course,
    role,
    is_verified: false,
    student_number: role === 'student' ? studentNumber : null,
  }

  const adminSupabase = createAdminClient()

  if (adminSupabase) {
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    })

    if (error) {
      throw error
    }

    const supabase = await createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      return {
        redirectPath:
          '/login?success=' +
          encodeURIComponent(
            role === 'mentor'
              ? 'Email confirmed and account created. Faculty accounts still require admin verification before full access.'
              : 'Email confirmed and account created. Student accounts still require admin approval before full access.'
          ),
      }
    }

    return {
      redirectPath: '/dashboard',
      userId: data.user?.id ?? null,
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  })

  if (error) {
    throw error
  }

  if (!data.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      return {
        redirectPath:
          '/login?success=' +
          encodeURIComponent(
            role === 'mentor'
              ? 'Email confirmed and account created. Faculty accounts still require admin verification before full access.'
              : 'Email confirmed and account created. Student accounts still require admin approval before full access.'
          ),
      }
    }
  }

  return {
    redirectPath: '/dashboard',
    userId: data.user?.id ?? null,
  }
}
