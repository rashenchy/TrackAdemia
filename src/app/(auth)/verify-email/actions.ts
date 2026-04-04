'use server'

import { redirect } from 'next/navigation'
import { finalizeVerifiedSignup } from '../login/actions'
import { sendRegistrationVerificationEmail } from '@/lib/core/email'
import {
  clearPendingRegistration,
  maskEmailAddress,
  readPendingRegistration,
  resendPendingRegistrationCode,
  verificationConfig,
  verifyPendingRegistrationCode,
} from '@/lib/users/pending-registration'
import { rethrowIfRedirectError } from '@/lib/core/redirect-error'

function redirectToVerifyEmail(messageType: 'error' | 'success', message: string) {
  redirect(`/verify-email?${messageType}=${encodeURIComponent(message)}`)
}

export async function verifyEmailCode(formData: FormData) {
  const code = (formData.get('code') as string | null)?.trim().toUpperCase() ?? ''

  if (!code) {
    redirectToVerifyEmail('error', 'Enter the 6-character verification code from your email.')
  }

  const result = await verifyPendingRegistrationCode(code)

  if (!result.ok) {
    switch (result.reason) {
      case 'missing-session':
      case 'session-expired':
        await clearPendingRegistration()
        redirect(
          '/register?error=' +
            encodeURIComponent('Your verification session expired. Please register again.')
        )
      case 'expired-code':
        redirectToVerifyEmail(
          'error',
          `This verification code expired. Request a new code to continue.`
        )
      case 'too-many-attempts':
        redirectToVerifyEmail(
          'error',
          `Too many failed attempts. Request a new code to continue.`
        )
      case 'invalid-code':
        redirectToVerifyEmail(
          'error',
          `That code does not match. You have ${verificationConfig.maxVerifyAttempts} attempts total before a new code is required.`
        )
    }
  }

  try {
    const outcome = await finalizeVerifiedSignup(result.payload)
    await clearPendingRegistration()
    redirect(outcome.redirectPath)
  } catch (error) {
    rethrowIfRedirectError(error)

    const message =
      error instanceof Error
        ? error.message
        : 'Unable to complete registration right now.'

    redirect(
      '/register?error=' +
        encodeURIComponent(
          `Email confirmed, but account creation could not be completed: ${message}`
        )
    )
  }
}

export async function resendVerificationCode() {
  const session = await readPendingRegistration()

  if (!session) {
    redirect(
      '/register?error=' +
        encodeURIComponent('Your verification session expired. Please register again.')
    )
  }

  const resendResult = await resendPendingRegistrationCode(session)

  if (!resendResult.ok) {
    switch (resendResult.reason) {
      case 'session-expired':
        redirect(
          '/register?error=' +
            encodeURIComponent('Your verification session expired. Please register again.')
        )
      case 'cooldown':
        redirectToVerifyEmail(
          'error',
          `Please wait ${resendResult.retryAfterSeconds} seconds before requesting another code.`
        )
      case 'too-many-resends':
        redirectToVerifyEmail(
          'error',
          'Too many resend requests for this registration. Start over to get a fresh session.'
        )
    }
  }

  try {
    await sendRegistrationVerificationEmail({
      email: session.payload.email,
      code: resendResult.code,
      expiresAt: resendResult.expiresAt,
    })

    redirectToVerifyEmail(
      'success',
      `A new verification code was sent to ${maskEmailAddress(session.payload.email)}.`
    )
  } catch (error) {
    rethrowIfRedirectError(error)

    const message =
      error instanceof Error ? error.message : 'Unable to resend the verification code.'

    redirectToVerifyEmail('error', message)
  }
}
