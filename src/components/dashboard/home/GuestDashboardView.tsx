import Link from 'next/link'
import {
  BookOpen,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  FileText,
  Search,
} from 'lucide-react'

type AccessRequestItem = {
  id: string
  researchId: string
  researchTitle: string
  status: 'pending' | 'approved' | 'rejected'
  message: string
  rejectionReason?: string | null
  createdAt: string
  reviewedAt?: string | null
}

interface GuestDashboardViewProps {
  userFirstName: string
  userLastName?: string
  userEmail: string
  institution?: string | null
  requests: AccessRequestItem[]
}

export function GuestDashboardView({
  userFirstName,
  userLastName,
  userEmail,
  institution,
  requests,
}: GuestDashboardViewProps) {
  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const approvedCount = requests.filter((r) => r.status === 'approved').length

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Welcome Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-teal-200/60 bg-[linear-gradient(135deg,#f0fdf4_0%,#e6fffa_45%,#e0f2fe_100%)] p-6 shadow-sm dark:border-teal-900/40 dark:bg-slate-900/60 sm:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/50 bg-teal-100/80 px-3 py-1 text-xs font-bold text-teal-900 dark:border-teal-700/50 dark:bg-teal-950/60 dark:text-teal-200">
              <Sparkles size={14} className="text-teal-600 dark:text-teal-400" />
              Guest Researcher Portal
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Welcome back, {userFirstName}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Browse published academic works and manage your manuscript access permissions.
            </p>

            {institution && (
              <div className="inline-flex items-center gap-2 pt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Building2 size={15} className="text-teal-600 dark:text-teal-400" />
                <span>Affiliation: {institution}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/repository"
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-teal-700 hover:shadow"
            >
              <BookOpen size={17} />
              <span>Browse Repository</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Requests
            </span>
            <FileText size={18} className="text-slate-400" />
          </div>
          <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            {requests.length}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Approved & Active
            </span>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-400">
            {approvedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm dark:border-amber-900/40 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Pending Review
            </span>
            <Clock size={18} className="text-amber-600" />
          </div>
          <p className="mt-2 text-3xl font-black text-amber-700 dark:text-amber-400">
            {pendingCount}
          </p>
        </div>
      </div>

      {/* Access Requests Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
              My Manuscript Access Requests
            </h2>
            <p className="text-xs text-slate-500">
              Status of manuscripts you requested from research author groups.
            </p>
          </div>

          <Link
            href="/dashboard/repository"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400"
          >
            <span>Search more papers</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/60 p-12 text-center dark:border-slate-800 dark:bg-slate-950">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
              <BookOpen size={26} />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              No manuscript requests yet
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              When you discover papers in the repository that require authorization, you can request full access directly from authors.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard/repository"
                className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-teal-700"
              >
                <Search size={15} />
                <span>Explore Research Repository</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => {
              const formattedDate = new Date(request.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })

              return (
                <div
                  key={request.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {request.status === 'approved' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 size={12} />
                            Access Approved
                          </span>
                        )}
                        {request.status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800">
                            <Clock size={12} />
                            Author Review Pending
                          </span>
                        )}
                        {request.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
                            <XCircle size={12} />
                            Request Declined
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          Requested {formattedDate}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {request.researchTitle}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-1">
                        Purpose: &ldquo;{request.message}&rdquo;
                      </p>

                      {request.status === 'rejected' && request.rejectionReason && (
                        <p className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-1.5 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
                          Author Note: {request.rejectionReason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {request.status === 'approved' ? (
                        <Link
                          href={`/repository/${request.researchId}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700"
                        >
                          <BookOpen size={14} />
                          <span>Read Manuscript</span>
                        </Link>
                      ) : (
                        <Link
                          href={`/repository/${request.researchId}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                        >
                          <span>View Abstract</span>
                          <ArrowRight size={13} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
