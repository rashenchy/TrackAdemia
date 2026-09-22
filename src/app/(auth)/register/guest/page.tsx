import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, CheckCircle2, Sparkles, Building2, Globe } from 'lucide-react'
import { signupGuest } from './actions'
import { PasswordField } from '@/components/auth/PasswordField'
import { SubmitButton } from '@/components/auth/SubmitButton'

export default async function GuestRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>
}) {
  const resolvedSearchParams = await searchParams

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f0fdf4_0%,#e0f2fe_50%,#ffffff_100%)] px-4 py-6 selection:bg-teal-100 md:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_30px_90px_rgba(13,148,136,0.16)] backdrop-blur md:grid-cols-2">
        <section className="relative hidden min-h-full overflow-hidden md:block">
          <Image
            src="/students.jpg"
            alt="Academic research collaboration"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.50)_0%,rgba(13,148,136,0.78)_55%,rgba(14,165,233,0.65)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.25),transparent_26%)]" />

          <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white animate-[fade_up_700ms_ease-out]">
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles size={16} />
              TrackAdemia Research Network
            </div>

            <div className="max-w-lg">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-teal-100">
                External Researchers & Guests
              </p>
              <h1 className="mt-4 text-4xl font-black leading-tight lg:text-5xl">
                Explore institutional research and request full manuscript access.
              </h1>
              <p className="mt-5 text-lg leading-8 text-teal-50/95">
                Create a verified guest account to browse published academic papers, collaborate with student authors, and read peer-reviewed manuscripts.
              </p>

              <div className="mt-8 grid gap-3">
                {[
                  'Request access to restricted full-text manuscripts',
                  'Track pending and approved requests in your personal portal',
                  'Seamless email verification for institutional trust',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur"
                  >
                    <CheckCircle2 size={18} className="text-teal-300" />
                    <span className="text-sm font-medium text-white/95">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[1.5rem] border border-white/15 bg-slate-950/25 p-5 backdrop-blur">
                <BookOpen size={20} className="text-teal-300" />
                <p className="mt-3 text-sm font-bold uppercase tracking-[0.24em] text-teal-100">
                  Repository
                </p>
                <p className="mt-2 text-sm leading-7 text-white/90">
                  Search through validated capstone & research publications.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/15 bg-slate-950/25 p-5 backdrop-blur">
                <Globe size={20} className="text-teal-300" />
                <p className="mt-3 text-sm font-bold uppercase tracking-[0.24em] text-teal-100">
                  Affiliation
                </p>
                <p className="mt-2 text-sm leading-7 text-white/90">
                  Connect with authors using your academic or industry background.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
          <form
            action={signupGuest}
            className="w-full max-w-xl space-y-6 animate-[fade_up_700ms_ease-out]"
          >
            <div>
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="text-sm font-semibold text-teal-700 transition-colors hover:text-teal-900"
                >
                  &larr; Back to home
                </Link>
                <Link
                  href="/repository"
                  className="text-sm font-semibold text-slate-500 transition-colors hover:text-slate-800"
                >
                  Browse Repository
                </Link>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
                <Building2 size={13} />
                Guest / External Researcher Registration
              </div>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Create guest account
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Are you an enrolled student?{' '}
                <Link href="/register" className="font-semibold text-teal-700 hover:underline">
                  Register as Student instead
                </Link>
              </p>
            </div>

            {resolvedSearchParams.error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {resolvedSearchParams.error}
              </div>
            )}

            <div className="grid gap-5">
              <div className="grid gap-5 md:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="firstName"
                    required
                    placeholder="Jane"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Middle Name</label>
                  <input
                    name="middleName"
                    placeholder="Optional"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="lastName"
                    required
                    placeholder="Doe"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition-all focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="researcher@university.edu or jane@example.com"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                />
                <p className="text-xs text-slate-500">
                  A 6-digit confirmation code will be sent to this email to verify your identity.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">
                  Affiliation / Institution / Organization <span className="text-red-500">*</span>
                </label>
                <input
                  name="institution"
                  required
                  placeholder="e.g. Technological University, DOST, Independent Researcher"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                />
                <p className="text-xs text-slate-500">
                  This tells student authors who is reviewing their published work.
                </p>
              </div>

              <PasswordField
                name="password"
                label="Password"
                placeholder="Create a strong password"
                validateFormat
                autoComplete="new-password"
              />

              <PasswordField
                name="confirmPassword"
                label="Confirm Password"
                placeholder="Re-enter your password"
                validateFormat
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-4 pt-2">
              <SubmitButton className="w-full rounded-2xl bg-teal-600 py-3.5 text-sm font-bold text-white shadow-[0_18px_35px_rgba(13,148,136,0.22)] transition-all hover:-translate-y-0.5 hover:bg-teal-700">
                Register as Guest Researcher
              </SubmitButton>

              <p className="text-center text-sm text-slate-600">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-teal-700 hover:text-teal-900 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}
