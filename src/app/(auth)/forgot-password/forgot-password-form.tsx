'use client'

import Link from 'next/link'
import { ArrowLeft, Info } from 'lucide-react'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { recoverPassword } from './actions'

export function ForgotPasswordForm() {
  return (
    <form action={recoverPassword} className="space-y-6">
      <div>
        <label className="text-sm font-semibold text-slate-700">Registered Email Address</label>
        <input
          name="email"
          type="email"
          required
          placeholder="name@university.edu"
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-4 text-sm text-slate-700">
        <div className="flex items-start gap-3">
          <Info size={18} className="mt-0.5 shrink-0 text-blue-600" />
          <p>
            If the email is registered, we will send a verification code through Gmail SMTP so you
            can continue the reset securely on the next page.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <SubmitButton className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-[0_18px_35px_rgba(37,99,235,0.22)] transition-all hover:-translate-y-0.5 hover:bg-blue-700">
          Send Verification Code
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
