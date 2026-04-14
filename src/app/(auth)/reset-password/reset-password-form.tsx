'use client'

import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, Info } from 'lucide-react'
import { useState } from 'react'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { completePasswordReset } from './actions'

export function ResetPasswordForm({ flowToken }: { flowToken?: string | null }) {
  return (
    <form action={completePasswordReset} className="space-y-6">
      {flowToken ? <input type="hidden" name="flowToken" value={flowToken} /> : null}
      <div className="space-y-5">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Verification Code</span>
          <input
            name="code"
            required
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="ABC123"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center text-2xl font-bold uppercase tracking-[0.45em] text-slate-900 outline-none transition-all placeholder:tracking-[0.2em] placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          <span className="mt-2 block text-xs text-slate-500">
            Enter the 6-character reset code sent to your email.
          </span>
        </label>

        <PasswordInput
          label="New Password"
          name="newPassword"
          autoComplete="new-password"
          helper="Use at least 8 characters with uppercase, lowercase, and a number."
        />
        <PasswordInput
          label="Confirm New Password"
          name="confirmPassword"
          autoComplete="new-password"
        />
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-4 text-sm text-slate-700">
        <div className="flex items-start gap-3">
          <Info size={18} className="mt-0.5 shrink-0 text-blue-600" />
          <p>
            This secure reset page checks the Gmail verification code first, then saves your new
            password. Once updated, use it the next time you sign in.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <SubmitButton className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-[0_18px_35px_rgba(37,99,235,0.22)] transition-all hover:-translate-y-0.5 hover:bg-blue-700">
          Update Password
        </SubmitButton>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition-colors hover:text-blue-900"
        >
          <ArrowLeft size={16} />
          Back to sign in
        </Link>
      </div>
    </form>
  )
}

function PasswordInput({
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
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="relative mt-2">
        <input
          type={showPassword ? 'text' : 'password'}
          name={name}
          autoComplete={autoComplete}
          required
          minLength={8}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 pr-11 text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {helper && <span className="mt-2 block text-xs text-slate-500">{helper}</span>}
    </label>
  )
}
