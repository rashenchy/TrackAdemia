'use server'

import { redirect } from 'next/navigation'
import { sendRegistrationVerificationEmail } from '@/lib/core/email'
import { isRegistrationEmailVerificationEnabled } from '@/lib/core/registration-config'
import { rethrowIfRedirectError } from '@/lib/core/redirect-error'
import {
  clearPendingRegistration,
  createPendingRegistrationSession,
} from '@/lib/users/pending-registration'
import { finalizeVerifiedSignup } from '@/app/(auth)/login/actions'

export async function signupProofreader(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const firstName = (formData.get('firstName') as string)?.trim()
  const middleName = (formData.get('middleName') as string)?.trim() || ''
  const lastName = (formData.get('lastName') as string)?.trim()
  const department = (formData.get('department') as string)?.trim() || ''
  const institution = (formData.get('institution') as string)?.trim() || ''
  const role = 'proofreader' as const

  if (!email || !password || !firstName || !lastName || !department) {
    redirect(
      '/register/proofreader?error=' +
        encodeURIComponent('Please complete all required fields including your department / language specialization.')
    )
  }

  if (password.length < 6) {
    redirect(
      '/register/proofreader?error=' +
        encodeURIComponent('Password must be at least 6 characters long.')
    )
  }

  if (confirmPassword && password !== confirmPassword) {
    redirect(
      '/register/proofreader?error=' + encodeURIComponent('Passwords do not match.')
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
        course: department,
        role,
        studentNumber: null,
        institution,
      })

      redirect(outcome.redirectPath)
    }

    const { code, expiresAt, flowToken, maskedEmail } = await createPendingRegistrationSession({
      email,
      password,
      firstName,
      middleName,
      lastName,
      course: department,
      role,
      studentNumber: null,
      institution,
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

    redirect('/register/proofreader?error=' + encodeURIComponent(message))
  }
}
