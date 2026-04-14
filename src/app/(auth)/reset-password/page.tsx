import Image from 'next/image'
import Link from 'next/link'
import { KeyRound, RefreshCcw, ShieldCheck } from 'lucide-react'
import { ResetPasswordForm } from './reset-password-form'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { resendRecoveryCode } from '@/app/(auth)/forgot-password/actions'
import {
  passwordResetConfig,
  readPasswordResetSessionFromToken,
} from '@/lib/users/password-reset-session'
import { maskEmailAddress } from '@/lib/users/pending-registration'

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; flow?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const flowToken = resolvedSearchParams.flow ?? null
  const session = await readPasswordResetSessionFromToken(flowToken)
  const maskedEmail = session ? maskEmailAddress(session.email) : null

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#fff7d6_46%,#ffffff_100%)] px-4 py-4 selection:bg-blue-100 md:px-6 md:py-3 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 shadow-[0_30px_90px_rgba(37,99,235,0.16)] backdrop-blur md:grid-cols-2">
        <section className="relative hidden min-h-full overflow-hidden md:block">
          <Image
            src="/students.jpg"
            alt="Students collaborating"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.28)_0%,rgba(29,78,216,0.72)_55%,rgba(250,204,21,0.48)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.24),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.22),transparent_28%)]" />

          <div className="relative z-10 flex h-full flex-col justify-between p-8 text-white animate-[fade_up_700ms_ease-out] lg:p-9">
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
              <KeyRound size={16} />
              Secure Reset
            </div>

            <div className="max-w-lg">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-100">
                Choose a new password
              </p>
              <h1 className="mt-3 text-4xl font-black leading-tight lg:text-5xl">
                Finish resetting your TrackAdemia password.
              </h1>
              <p className="mt-4 text-base leading-7 text-blue-50/95 lg:text-lg">
                This page verifies the reset code from your Gmail message, then lets you set your
                new password securely.
              </p>

              <div className="mt-6 grid gap-2.5">
                {[
                  'Your reset code is time-limited',
                  'You enter the code and choose the new password on this page',
                  'Your profile page change-password flow stays separate',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur"
                  >
                    <ShieldCheck size={18} className="text-yellow-200" />
                    <span className="text-sm font-medium text-white/95">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-white/15 bg-slate-950/25 p-4 backdrop-blur">
              <p className="text-sm leading-6 text-white/90">
                If the code has expired, return to the forgot-password page or resend a fresh
                reset email.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="w-full max-w-md space-y-6 animate-[fade_up_700ms_ease-out]">
            <div>
              <Link
                href="/login"
                className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-900"
              >
                Back to sign in
              </Link>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
                Reset your password
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Enter the reset code from your email and choose a new password for your account.
              </p>
            </div>

            {resolvedSearchParams.success && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {resolvedSearchParams.success}
              </div>
            )}

            {resolvedSearchParams.error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {resolvedSearchParams.error}
              </div>
            )}

            {!session ? (
              <div className="space-y-4 rounded-[1.75rem] border border-yellow-200 bg-yellow-50 p-6">
                <div className="text-yellow-900">
                  <h3 className="text-base font-bold">Reset session unavailable</h3>
                  <p className="mt-2 text-sm leading-6">
                    Your password reset session is missing or expired. Request a new reset code to
                    continue.
                  </p>
                </div>

                <Link
                  href="/forgot-password"
                  className="inline-flex rounded-2xl bg-yellow-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-yellow-700"
                >
                  Request a new reset code
                </Link>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  Enter the {passwordResetConfig.codeLength}-character code we sent
                  {maskedEmail ? ` to ${maskedEmail}` : ''}. The code expires after{' '}
                  {passwordResetConfig.codeTtlMinutes} minutes.
                </div>

                <ResetPasswordForm flowToken={flowToken} />

                <form action={resendRecoveryCode}>
                  {flowToken ? <input type="hidden" name="flowToken" value={flowToken} /> : null}
                  <SubmitButton className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50">
                    <RefreshCcw size={16} />
                    Resend Code
                  </SubmitButton>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
