import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'
import { login } from './actions'
import { PasswordField } from '@/components/auth/PasswordField'
import { SubmitButton } from '@/components/auth/SubmitButton'

const ALLOWED_LOGIN_SUCCESS_MESSAGES = new Set([
  'Registration submitted successfully. Please verify your email with the code we sent.',
  'Email verified successfully. You can now sign in.',
])

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const successMessage = resolvedSearchParams.success
  const safeSuccessMessage =
    successMessage && ALLOWED_LOGIN_SUCCESS_MESSAGES.has(successMessage)
      ? successMessage
      : null

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
              <Sparkles size={16} />
              TrackAdemia
            </div>

            <div className="max-w-lg">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-100">
                Welcome back
              </p>
              <h1 className="mt-3 text-4xl font-black leading-tight lg:text-5xl">
                Keep your research work moving with less friction.
              </h1>
              <p className="mt-4 text-base leading-7 text-blue-50/95 lg:text-lg">
                Review status, submissions, revisions, and adviser feedback from one clean workspace.
              </p>

              <div className="mt-6 grid gap-2.5">
                {[
                  'Follow submission progress in one place',
                  'Review annotated comments and pending revisions',
                  'Stay aligned with advisers, students, and admins',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 backdrop-blur"
                  >
                    <CheckCircle2 size={18} className="text-yellow-200" />
                    <span className="text-sm font-medium text-white/95">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-white/15 bg-slate-950/25 p-3 backdrop-blur">
              <div className="flex items-start gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
                  <ShieldCheck size={18} className="text-yellow-200" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">
                    Secure access
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-white/90">
                    Built for academic workflows with role-based access for students, advisers, and administrators.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
          <form
            action={login}
            className="w-full max-w-md space-y-6 animate-[fade_up_700ms_ease-out]"
          >
            <div className="md:hidden">
              <div className="relative mb-6 overflow-hidden rounded-[1.75rem]">
                <div className="relative h-48">
                  <Image
                    src="/students.jpg"
                    alt="Students collaborating"
                    fill
                    priority
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(29,78,216,0.20)_0%,rgba(15,23,42,0.56)_100%)]" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">
                    TrackAdemia
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Sign in and continue your work</h2>
                </div>
              </div>
            </div>

            <div>
              <Link href="/" className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-900">
                Back to home
              </Link>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
                Sign in to your account
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Access submissions, tasks, sections, and adviser feedback from your dashboard.
              </p>
            </div>

            {safeSuccessMessage && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {safeSuccessMessage}
              </div>
            )}

            {resolvedSearchParams.error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {resolvedSearchParams.error}
              </div>
            )}

            <div className="space-y-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Email Address</label>
                <input
                  name="email"
                  type="email"
                  placeholder="student@university.edu"
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <PasswordField name="password" label="Password" placeholder="Enter your password" />
            </div>

            <div className="space-y-4 pt-2">
              <SubmitButton className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-[0_18px_35px_rgba(37,99,235,0.22)] transition-all hover:-translate-y-0.5 hover:bg-blue-700">
                Sign In
              </SubmitButton>

              <p className="text-center text-sm text-slate-600">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-semibold text-blue-700 hover:text-blue-900 hover:underline">
                  Create one here
                </Link>
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              <ArrowRight size={16} className="shrink-0" />
              Sign in to continue where your last submission or review cycle left off.
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
