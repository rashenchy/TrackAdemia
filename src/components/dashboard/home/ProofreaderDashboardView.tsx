import Link from 'next/link'
import {
  SpellCheck,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Building2,
  Calendar,
  Sparkles,
} from 'lucide-react'

export type ProofreaderManuscript = {
  id: string
  title: string
  type: string | null
  status: string
  current_stage: string | null
  academic_year: string | null
  created_at: string
  updated_at: string
  submission_format: string | null
  file_url: string | null
  author_name: string
  author_email?: string | null
}

export type ProofreaderDebugInfo = {
  proofreaderUserId: string
  usingAdminDb: boolean
  matchedCount: number
  queryError?: string | null
  recentPapers: Array<{
    id: string
    title: string
    proofreader_id: string | null
    isMatch: boolean
    status: string
  }>
}

interface ProofreaderDashboardViewProps {
  userFirstName: string
  userLastName?: string
  userEmail: string
  department?: string | null
  institution?: string | null
  manuscripts: ProofreaderManuscript[]
  debugInfo?: ProofreaderDebugInfo
}

export function ProofreaderDashboardView({
  userFirstName,
  userLastName,
  userEmail,
  department,
  institution,
  manuscripts,
  debugInfo,
}: ProofreaderDashboardViewProps) {
  const inReviewCount = manuscripts.filter(
    (m) => m.status === 'Pending Review' || m.status === 'Resubmitted' || m.status === 'Needs Revision'
  ).length
  const publishedCount = manuscripts.filter((m) => m.status === 'Published' || m.status === 'Approved').length
  const totalCount = manuscripts.length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Published':
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 size={13} />
            {status}
          </span>
        )
      case 'Needs Revision':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertCircle size={13} />
            Needs Revision
          </span>
        )
      case 'Resubmitted':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
            <Clock size={13} />
            Resubmitted
          </span>
        )
      case 'Pending Review':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            <Clock size={13} />
            {status || 'Pending Review'}
          </span>
        )
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-200/70 bg-[linear-gradient(135deg,#f5f3ff_0%,#ede9fe_45%,#e0e7ff_100%)] p-6 shadow-sm dark:border-indigo-900/40 dark:bg-slate-900/60 sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/50 bg-indigo-100/80 px-3 py-1 text-xs font-bold text-indigo-900 dark:border-indigo-700/50 dark:bg-indigo-950/60 dark:text-indigo-200">
              <SpellCheck size={14} className="text-indigo-600 dark:text-indigo-400" />
              Language Editor & Proofreader Workspace
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Welcome back, {userFirstName} {userLastName}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Review assigned academic manuscripts, provide language & grammar critiques, and collaborate with student authors.
            </p>

            {(department || institution) && (
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500 dark:text-slate-400">
                {department && (
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen size={13} />
                    {department}
                  </span>
                )}
                {institution && (
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 size={13} />
                    {institution}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0">
            <Link
              href="/repository"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
            >
              <BookOpen size={16} />
              Browse Repository
            </Link>
          </div>
        </div>
      </section>

      {/* Metrics Row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Assigned
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <FileText size={18} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{totalCount}</p>
          <p className="mt-1 text-xs text-slate-500">Manuscripts under language review</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active / In Review
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <Clock size={18} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{inReviewCount}</p>
          <p className="mt-1 text-xs text-slate-500">Awaiting feedback or revision</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Published / Done
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{publishedCount}</p>
          <p className="mt-1 text-xs text-slate-500">Finished manuscripts</p>
        </div>
      </section>

      {/* Manuscripts Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Manuscripts Assigned for Language Review
            </h2>
            <p className="text-xs text-slate-500">
              Click &quot;Review &amp; Annotate&quot; to open the manuscript workspace and leave text or PDF comments.
            </p>
          </div>
        </div>

        {manuscripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <SpellCheck size={28} />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              No manuscripts assigned yet
            </h3>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500">
              When student authors or mentors assign you as the proofreader during research submission, the manuscript will appear here for your editorial review.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {manuscripts.map((m) => (
              <div
                key={m.id}
                className="group flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-indigo-800 sm:flex-row sm:items-center"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {m.type || 'Research'}
                    </span>
                    {m.current_stage && (
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        {m.current_stage}
                      </span>
                    )}
                    {getStatusBadge(m.status)}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {m.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                    <span>
                      Author: <strong className="font-semibold text-slate-700 dark:text-slate-200">{m.author_name}</strong>
                    </span>
                    {m.academic_year && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        AY {m.academic_year}
                      </span>
                    )}
                    <span>
                      Submitted: {new Date(m.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 pt-2 sm:pt-0">
                  <Link
                    href={`/dashboard/research/${m.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    View Details
                  </Link>

                  <Link
                    href={`/dashboard/research/${m.id}/annotate`}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-all"
                  >
                    <SpellCheck size={15} />
                    Review &amp; Annotate
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
