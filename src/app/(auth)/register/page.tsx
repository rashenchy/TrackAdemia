import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle2, GraduationCap, Sparkles, Users } from 'lucide-react'
import { signup } from '../login/actions'
import { PasswordField } from '@/components/auth/PasswordField'
import { RegistrationIdentityFields } from '@/components/auth/RegistrationIdentityFields'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { ALLOWED_COURSE_PROGRAMS } from '@/lib/core/course-programs'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const resolvedSearchParams = await searchParams

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eef6ff_0%,#fff7d6_46%,#ffffff_100%)] px-4 py-6 selection:bg-blue-100 md:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 shadow-[0_30px_90px_rgba(37,99,235,0.16)] backdrop-blur md:grid-cols-2">
        <section className="relative hidden min-h-full overflow-hidden md:block">
          <Image
            src="/students.jpg"
            alt="Students collaborating"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(30,64,175,0.30)_0%,rgba(29,78,216,0.70)_55%,rgba(250,204,21,0.52)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.24),transparent_26%)]" />

          <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white animate-[fade_up_700ms_ease-out]">
            <div className="inline-flex w-fit items-center gap-3 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles size={16} />
              Join TrackAdemia
            </div>

            <div className="max-w-lg">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-100">
                Start strong
              </p>
              <h1 className="mt-4 text-5xl font-black leading-tight">
                Create a space where your research work feels organized from day one.
              </h1>
              <p className="mt-5 text-lg leading-8 text-blue-50/95">
                Register once and move through submissions, revisions, sections, and approvals with a cleaner workflow.
              </p>

              <div className="mt-8 grid gap-3">
                {[
                  'Students can manage drafts, feedback, and status updates',
                  'Advisers can review manuscripts and guide revisions clearly',
                  'Admins can oversee approvals and institutional activity',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur"
                  >
                    <CheckCircle2 size={18} className="text-yellow-200" />
                    <span className="text-sm font-medium text-white/95">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[1.5rem] border border-white/15 bg-slate-950/25 p-5 backdrop-blur">
                <GraduationCap size={20} className="text-yellow-200" />
                <p className="mt-3 text-sm font-bold uppercase tracking-[0.24em] text-blue-100">
                  Students
                </p>
                <p className="mt-2 text-sm leading-7 text-white/90">
                  Submit, revise, and track progress.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-white/15 bg-slate-950/25 p-5 backdrop-blur">
                <Users size={20} className="text-yellow-200" />
                <p className="mt-3 text-sm font-bold uppercase tracking-[0.24em] text-blue-100">
                  Advisers
                </p>
                <p className="mt-2 text-sm leading-7 text-white/90">
                  Review, comment, and guide each cycle.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
          <form
            action={signup}
            className="w-full max-w-xl space-y-6 animate-[fade_up_700ms_ease-out]"
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
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(29,78,216,0.18)_0%,rgba(15,23,42,0.58)_100%)]" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-100">
                    TrackAdemia
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Create your account</h2>
                </div>
              </div>
            </div>

            <div>
              <Link href="/" className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-900">
                Back to home
              </Link>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
                Create your account
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                Set up your role and profile to access the research workflow that fits you.
              </p>
            </div>

            {resolvedSearchParams.error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {resolvedSearchParams.error}
              </div>
            )}

            <div className="grid gap-5">
              <RegistrationIdentityFields />

              <div className="grid gap-5 md:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">First Name</label>
                  <input
                    name="firstName"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Middle Name</label>
                  <input
                    name="middleName"
                    placeholder="Optional"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Last Name</label>
                  <input
                    name="lastName"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Email</label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="name@university.edu"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-700">Course / Program</label>
                  <select
                    name="course"
                    required
                    defaultValue=""
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="" disabled>
                      Select course program
                    </option>
                    {ALLOWED_COURSE_PROGRAMS.map((program) => (
                      <option key={program} value={program}>
                        {program}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <PasswordField
                name="password"
                label="Password"
                placeholder="Create a strong password"
              />
            </div>

            <div className="space-y-4 pt-2">
              <SubmitButton className="w-full rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-[0_18px_35px_rgba(37,99,235,0.22)] transition-all hover:-translate-y-0.5 hover:bg-blue-700">
                Register
              </SubmitButton>

              <p className="text-center text-sm text-slate-600">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-blue-700 hover:text-blue-900 hover:underline">
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
