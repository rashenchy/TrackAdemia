'use client'

import { Eye, GraduationCap, ShieldAlert, UserRound } from 'lucide-react'
import type { AdminViewMode } from '@/lib/users/admin-view-mode'

interface ViewAsUserClientProps {
  beginViewAsUser: (mode: AdminViewMode) => Promise<void>
}

const previewOptions: Array<{
  mode: AdminViewMode
  title: string
  description: string
  icon: typeof UserRound
  accent: string
  note: string
}> = [
  {
    mode: 'mentor',
    title: 'Teacher / Adviser View',
    description:
      'Open the dashboard the way a verified faculty account sees it, including teacher navigation and section-focused tools.',
    icon: GraduationCap,
    accent:
      'from-emerald-50 to-teal-100 border-emerald-200 text-emerald-700 dark:from-emerald-900/20 dark:to-teal-900/10 dark:border-emerald-900/40 dark:text-emerald-300',
    note: 'Best for checking teacher-only navigation and submission review flow.',
  },
  {
    mode: 'student',
    title: 'Approved Student View',
    description:
      'Jump into the regular student dashboard experience with the standard sidebar, profile access, and research workflow shell.',
    icon: UserRound,
    accent:
      'from-blue-50 to-cyan-100 border-blue-200 text-blue-700 dark:from-blue-900/20 dark:to-cyan-900/10 dark:border-blue-900/40 dark:text-blue-300',
    note: 'Useful for validating the normal student-facing interface and layout.',
  },
  {
    mode: 'student-pending',
    title: 'Unapproved Student View',
    description:
      'Preview the pending-approval experience, including the access restriction banner and repository-only hold state.',
    icon: ShieldAlert,
    accent:
      'from-amber-50 to-orange-100 border-amber-200 text-amber-700 dark:from-amber-900/20 dark:to-orange-900/10 dark:border-amber-900/40 dark:text-amber-300',
    note: 'Useful for checking the approval-hold messaging and restricted student state.',
  },
]

export default function ViewAsUserClient({
  beginViewAsUser,
}: ViewAsUserClientProps) {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="rounded-[2rem] border border-purple-200 bg-[linear-gradient(135deg,#faf5ff_0%,#ffffff_45%,#eef2ff_100%)] p-8 shadow-sm dark:border-purple-900/40 dark:bg-[linear-gradient(135deg,rgba(88,28,135,0.22)_0%,rgba(17,24,39,0.96)_48%,rgba(30,41,59,0.95)_100%)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.25em] text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
              <Eye size={14} />
              View As User
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Choose the account view you want to open
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Pick a role first, then you&apos;ll jump directly into the main dashboard shell for
              that user state. A return button will stay visible in the top bar so you can come
              back to the admin area anytime.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {previewOptions.map((option) => {
          const Icon = option.icon

          return (
            <form key={option.mode} action={beginViewAsUser.bind(null, option.mode)}>
              <button
                type="submit"
                className={`group h-full w-full rounded-[1.75rem] border bg-gradient-to-br p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg ${option.accent}`}
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 shadow-sm dark:bg-slate-950/40">
                      <Icon size={28} />
                    </div>
                    <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
                      Open Preview
                    </span>
                  </div>

                  <div className="mt-6 flex-1">
                    <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
                      {option.title}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
                      {option.description}
                    </p>
                  </div>

                  <div className="mt-6 rounded-2xl bg-white/70 p-4 text-sm font-medium text-slate-700 shadow-sm dark:bg-slate-950/35 dark:text-slate-200">
                    {option.note}
                  </div>
                </div>
              </button>
            </form>
          )
        })}
      </section>
    </div>
  )
}
