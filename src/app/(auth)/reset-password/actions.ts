'use server'

import { redirect } from 'next/navigation'
import { createAdminClient, findAuthUserByEmail } from '@/lib/supabase/admin'
import {
  clearPasswordResetSession,
  passwordResetConfig,
  verifyPasswordResetCode,
} from '@/lib/users/password-reset-session'

export async function completePasswordReset(formData: FormData) {
  const code = (formData.get('code') as string | null)?.trim().toUpperCase() || ''
  const newPassword = (formData.get('newPassword') as string | null) || ''
  const confirmPassword = (formData.get('confirmPassword') as string | null) || ''

  if (!code) {
    redirect(
      '/reset-password?error=' +
        encodeURIComponent(
          `Enter the ${passwordResetConfig.codeLength}-character verification code from your email.`
        )
    )
  }

  if (!newPassword || !confirmPassword) {
    redirect('/reset-password?error=' + encodeURIComponent('Please complete both password fields.'))
  }

  if (newPassword !== confirmPassword) {
    redirect(
      '/reset-password?error=' +
        encodeURIComponent('New password and confirmation password do not match.')
    )
  }

  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/

  if (newPassword.length < 8 || !passwordPattern.test(newPassword)) {
    redirect(
      '/reset-password?error=' +
        encodeURIComponent(
          'New password must be at least 8 characters and include uppercase, lowercase, and a number.'
        )
    )
  }

  const result = await verifyPasswordResetCode(code)

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
        redirect(
          '/reset-password?error=' +
            encodeURIComponent('This reset code expired. Request a new code to continue.')
        )
      case 'too-many-attempts':
        redirect(
          '/reset-password?error=' +
            encodeURIComponent(
              'Too many failed attempts. Request a new reset code to continue.'
            )
        )
      case 'invalid-code':
        redirect(
          '/reset-password?error=' +
            encodeURIComponent(
              `That code does not match. You have ${passwordResetConfig.maxVerifyAttempts} attempts total before a new code is required.`
            )
        )
    }
  }

  const adminSupabase = createAdminClient()

  if (!adminSupabase) {
    redirect(
      '/reset-password?error=' +
        encodeURIComponent('Password reset is not configured on this server.')
    )
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
    redirect('/reset-password?error=' + encodeURIComponent(error.message))
  }

  await clearPasswordResetSession()

  redirect(
    '/login?success=' +
      encodeURIComponent('Password reset successfully. You can now sign in with your new password.')
  )
}
