'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Eye, EyeOff, Info, KeyRound } from 'lucide-react'
import { SubmitButton } from '@/components/auth/SubmitButton'
import {
  changePassword,
  type ChangePasswordState,
} from '@/app/(main)/dashboard/profile/actions'

const initialPasswordState: ChangePasswordState = {}

type ChangePasswordCardProps = {
  disabled?: boolean
  className?: string
}

export function ChangePasswordCard({
  disabled = false,
  className = '',
}: ChangePasswordCardProps) {
  const [passwordState, passwordFormAction] = useActionState(
    changePassword,
    initialPasswordState
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (passwordState.success) {
      formRef.current?.reset()
    }
  }, [passwordState.success])

  if (disabled) {
    return (
      <div
        className={`rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200 ${className}`}
      >
        Password changes are disabled while admin preview mode is active.
      </div>
    )
  }

  return (
    <form
      ref={formRef}
      action={passwordFormAction}
      className={`space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:h-11 sm:w-11 sm:rounded-2xl dark:bg-blue-900/30 dark:text-blue-400">
          <KeyRound size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-950 dark:text-white">
            Change password
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Enter your current password to verify your identity before setting a new one.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PasswordInputField
          label="Current Password"
          name="currentPassword"
          autoComplete="current-password"
        />
        <div className="hidden md:block" />
        <PasswordInputField
          label="New Password"
          name="newPassword"
          autoComplete="new-password"
          helper="Use at least 8 characters with uppercase, lowercase, and a number."
        />
        <PasswordInputField
          label="Confirm New Password"
          name="confirmPassword"
          autoComplete="new-password"
        />
      </div>

      {passwordState.error && (
        <div className="inline-flex w-full items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <Info size={16} className="shrink-0" aria-hidden="true" />
          <span>{passwordState.error}</span>
        </div>
      )}

      {passwordState.success && (
        <div className="inline-flex w-full items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />
          <span>{passwordState.success}</span>
        </div>
      )}

      <SubmitButton className="min-h-11 w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto">
        Update Password
      </SubmitButton>
    </form>
  )
}

function PasswordInputField({
  label,
  name,
  autoComplete,
  helper,
}: {
  label: string
  name: string
  autoComplete: string
  helper?: string
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <div className="relative mt-2">
        <input
          type={showPassword ? 'text' : 'password'}
          name={name}
          autoComplete={autoComplete}
          required
          minLength={8}
          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {helper && (
        <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
          {helper}
        </span>
      )}
    </label>
  )
}

