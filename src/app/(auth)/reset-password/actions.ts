'use server'

import { redirect } from 'next/navigation'
import { createAdminClient, findAuthUserByEmail } from '@/lib/supabase/admin'
import {
  clearPasswordResetSession,
  passwordResetConfig,
  verifyPasswordResetCode,
} from '@/lib/users/password-reset-session'

function buildResetPasswordUrl(message: string, flowToken?: string | null) {
  const params = new URLSearchParams({
    error: message,
  })

  if (flowToken) {
    params.set('flow', flowToken)
  }

  return `/reset-password?${params.toString()}`
}

export async function completePasswordReset(formData: FormData) {
  const code = (formData.get('code') as string | null)?.trim().toUpperCase() || ''
  const newPassword = (formData.get('newPassword') as string | null) || ''
  const confirmPassword = (formData.get('confirmPassword') as string | null) || ''
  const flowToken = (formData.get('flowToken') as string | null)?.trim() || null

  if (!code) {
    redirect(
      buildResetPasswordUrl(
        `Enter the ${passwordResetConfig.codeLength}-character verification code from your email.`,
        flowToken
      )
    )
  }

  if (!newPassword || !confirmPassword) {
    redirect(buildResetPasswordUrl('Please complete both password fields.', flowToken))
  }

  if (newPassword !== confirmPassword) {
    redirect(buildResetPasswordUrl('New password and confirmation password do not match.', flowToken))
  }

  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/

  if (newPassword.length < 8 || !passwordPattern.test(newPassword)) {
    redirect(
      buildResetPasswordUrl(
        'New password must be at least 8 characters and include uppercase, lowercase, and a number.',
        flowToken
      )
    )
  }

  const result = await verifyPasswordResetCode(code, flowToken)

  if (!result.ok) {
    switch (result.reason) {
      case 'missing-session':
      case 'session-expired':
        await clearPasswordResetSession()
        redirect(
          '/forgot-password?error=' +
            encodeURIComponent('Your password reset session expired. Request a new reset code.')
        )
      case 'expired-code':
        redirect(buildResetPasswordUrl('This reset code expired. Request a new code to continue.', flowToken))
      case 'too-many-attempts':
        redirect(buildResetPasswordUrl('Too many failed attempts. Request a new reset code to continue.', flowToken))
      case 'invalid-code':
        redirect(
          buildResetPasswordUrl(
            `That code does not match. You have ${passwordResetConfig.maxVerifyAttempts} attempts total before a new code is required.`,
            flowToken
          )
        )
    }
  }

  const adminSupabase = createAdminClient()

  if (!adminSupabase) {
    redirect(buildResetPasswordUrl('Password reset is not configured on this server.', flowToken))
  }

  const authUser = await findAuthUserByEmail(result.email)

  if (!authUser?.id) {
    await clearPasswordResetSession()
    redirect(
      '/forgot-password?error=' +
        encodeURIComponent('This password reset request is no longer valid. Request a new code.')
    )
  }

  const { error } = await adminSupabase.auth.admin.updateUserById(authUser.id, {
    password: newPassword,
  })

  if (error) {
    redirect(buildResetPasswordUrl(error.message, flowToken))
  }

  await clearPasswordResetSession()

  redirect(
    '/login?success=' +
      encodeURIComponent('Password reset successfully. You can now sign in with your new password.')
  )
}
