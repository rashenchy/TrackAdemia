'use server'

import { redirect } from 'next/navigation'
import { finalizeVerifiedSignup } from '../login/actions'
import { sendRegistrationVerificationEmail } from '@/lib/core/email'
import {
  clearPendingRegistration,
  maskEmailAddress,
  readPendingRegistrationFromToken,
  resendPendingRegistrationCode,
  verificationConfig,
  verifyPendingRegistrationCode,
} from '@/lib/users/pending-registration'
import { rethrowIfRedirectError } from '@/lib/core/redirect-error'

function buildVerifyEmailUrl(
  messageType: 'error' | 'success',
  message: string,
  flowToken?: string | null
) {
  const params = new URLSearchParams({
    [messageType]: message,
  })

  if (flowToken) {
    params.set('flow', flowToken)
  }

  return `/verify-email?${params.toString()}`
}

function redirectToVerifyEmail(
  messageType: 'error' | 'success',
  message: string,
  flowToken?: string | null
) {
  redirect(buildVerifyEmailUrl(messageType, message, flowToken))
}

export async function verifyEmailCode(formData: FormData) {
  const code = (formData.get('code') as string | null)?.trim().toUpperCase() ?? ''
  const flowToken = (formData.get('flowToken') as string | null)?.trim() || null

  if (!code) {
    redirectToVerifyEmail('error', 'Enter the 6-character verification code from your email.', flowToken)
  }

  const result = await verifyPendingRegistrationCode(code, flowToken)

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
          `This verification code expired. Request a new code to continue.`,
          flowToken
        )
      case 'too-many-attempts':
        redirectToVerifyEmail(
          'error',
          `Too many failed attempts. Request a new code to continue.`,
          flowToken
        )
      case 'invalid-code':
        redirectToVerifyEmail(
          'error',
          `That code does not match. You have ${verificationConfig.maxVerifyAttempts} attempts total before a new code is required.`,
          flowToken
        )
    }

    throw new Error('Unable to verify the registration code.')
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

export async function resendVerificationCode(formData: FormData) {
  const flowToken = (formData.get('flowToken') as string | null)?.trim() || null
  const session = await readPendingRegistrationFromToken(flowToken)

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
          `Please wait ${resendResult.retryAfterSeconds} seconds before requesting another code.`,
          flowToken
        )
      case 'too-many-resends':
        redirectToVerifyEmail(
          'error',
          'Too many resend requests for this registration. Start over to get a fresh session.',
          flowToken
        )
    }

    throw new Error('Unable to resend the verification code.')
  }

  try {
    await sendRegistrationVerificationEmail({
      email: session.payload.email,
      code: resendResult.code,
      expiresAt: resendResult.expiresAt,
    })

    redirectToVerifyEmail(
      'success',
      `A new verification code was sent to ${maskEmailAddress(session.payload.email)}.`,
      resendResult.flowToken
    )
  } catch (error) {
    rethrowIfRedirectError(error)

    const message =
      error instanceof Error ? error.message : 'Unable to resend the verification code.'

    redirectToVerifyEmail('error', message, flowToken)
  }
}
