'use server'

import { redirect } from 'next/navigation'
import { sendPasswordRecoveryEmail } from '@/lib/core/email'
import { rethrowIfRedirectError } from '@/lib/core/redirect-error'
import { findAuthUserByEmail } from '@/lib/supabase/admin'
import {
  createPasswordResetSession,
  passwordResetConfig,
  readPasswordResetSession,
  resendPasswordResetCode,
} from '@/lib/users/password-reset-session'
import { maskEmailAddress } from '@/lib/users/pending-registration'

function redirectToResetPassword(messageType: 'error' | 'success', message: string) {
  redirect(`/reset-password?${messageType}=${encodeURIComponent(message)}`)
}

export async function recoverPassword(formData: FormData) {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase() || ''

  if (!email) {
    redirect('/forgot-password?error=' + encodeURIComponent('Please enter your registered email address.'))
  }

  try {
    const authUser = await findAuthUserByEmail(email)

    if (!authUser?.id) {
      redirect('/forgot-password?error=' + encodeURIComponent('No account was found for that email address.'))
    }

    const { code, expiresAt } = await createPasswordResetSession(email)

    await sendPasswordRecoveryEmail({
      email,
      code,
      expiresAt,
    })

    redirectToResetPassword(
      'success',
      `We sent a ${passwordResetConfig.codeLength}-character reset code to ${maskEmailAddress(email)}.`
    )
  } catch (error) {
    rethrowIfRedirectError(error)

    const message =
      error instanceof Error
        ? error.message
        : 'Unable to process your password recovery request right now.'

    redirect('/forgot-password?error=' + encodeURIComponent(message))
  }
}

export async function resendRecoveryCode() {
  const session = await readPasswordResetSession()

  if (!session) {
    redirect(
      '/forgot-password?error=' +
        encodeURIComponent('Your password reset session expired. Request a new reset code.')
    )
  }

  const resendResult = await resendPasswordResetCode(session)

  if (!resendResult.ok) {
    switch (resendResult.reason) {
      case 'session-expired':
        redirect(
          '/forgot-password?error=' +
            encodeURIComponent('Your password reset session expired. Request a new reset code.')
        )
      case 'cooldown':
        redirectToResetPassword(
          'error',
          `Please wait ${resendResult.retryAfterSeconds} seconds before requesting another reset code.`
        )
      case 'too-many-resends':
        redirectToResetPassword(
          'error',
          'Too many resend requests for this password reset. Start over to get a fresh code.'
        )
    }

    return
  }

  try {
    await sendPasswordRecoveryEmail({
      email: session.email,
      code: resendResult.code,
      expiresAt: resendResult.expiresAt,
    })

    redirectToResetPassword(
      'success',
      `A new reset code was sent to ${maskEmailAddress(session.email)}.`
    )
  } catch (error) {
    rethrowIfRedirectError(error)

    const message =
      error instanceof Error ? error.message : 'Unable to resend the reset code.'

    redirectToResetPassword('error', message)
  }
}
