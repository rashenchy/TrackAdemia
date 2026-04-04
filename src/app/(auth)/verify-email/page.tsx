import Link from 'next/link'
import { MailCheck, RefreshCcw, ShieldCheck } from 'lucide-react'
import { SubmitButton } from '@/components/auth/SubmitButton'
import {
  maskEmailAddress,
  readPendingRegistration,
  verificationConfig,
} from '@/lib/users/pending-registration'
import { resendVerificationCode, verifyEmailCode } from './actions'

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const session = await readPendingRegistration()
  const maskedEmail = session ? maskEmailAddress(session.payload.email) : null

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#fff7d6_46%,#ffffff_100%)] px-4 py-6 selection:bg-blue-100 md:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl items-center justify-center">
        <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_30px_90px_rgba(37,99,235,0.16)] backdrop-blur sm:p-10">
          <div className="inline-flex items-center gap-3 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
            <MailCheck size={16} />
            Confirm your email
          </div>

          <div className="mt-6">
            <Link href="/register" className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-900">
              Back to registration
            </Link>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
              Finish creating your account
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-600">
              Enter the {verificationConfig.codeLength}-character code we sent
              {maskedEmail ? ` to ${maskedEmail}` : ''}. We only create your account after this step.
            </p>
          </div>

          {resolvedSearchParams.success && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {resolvedSearchParams.success}
            </div>
          )}

          {resolvedSearchParams.error && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {resolvedSearchParams.error}
            </div>
          )}

          {!session && (
            <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-800">
              Your pending registration session is no longer available. Start a new registration to receive another code.
            </div>
          )}

          <form action={verifyEmailCode} className="mt-8 space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">Verification Code</label>
              <input
                name="code"
                required
                maxLength={verificationConfig.codeLength}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                placeholder="ABC123"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center text-2xl font-bold uppercase tracking-[0.45em] text-slate-900 outline-none transition-all placeholder:tracking-[0.2em] placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
              <p className="text-sm leading-6 text-slate-500">
                Codes expire after {verificationConfig.codeTtlMinutes} minutes. Verification checks happen on the server.
              </p>
            </div>

            <SubmitButton className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-[0_18px_35px_rgba(37,99,235,0.22)] transition-all hover:-translate-y-0.5 hover:bg-blue-700">
              Complete Registration
            </SubmitButton>
          </form>

          <form action={resendVerificationCode} className="mt-4">
            <SubmitButton className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50">
              <RefreshCcw size={16} />
              Resend Code
            </SubmitButton>
          </form>

          <div className="mt-8 flex items-start gap-3 rounded-[1.5rem] border border-blue-100 bg-blue-50/70 px-4 py-4 text-sm text-slate-700">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-blue-700" />
            We do not save your account to Supabase until the correct code is confirmed. Admin approval remains separate from this email ownership check.
          </div>
        </section>
      </div>
    </div>
  )
}
