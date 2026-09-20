'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SpellCheck, CheckCircle, XCircle, Loader2, AlertCircle, Building2 } from 'lucide-react'
import { getPendingProofreaders, verifyProofreader, rejectProofreader, type PendingProofreader } from './actions'
import PaginationControl from '@/components/ui/PaginationControl'

interface ProofreaderVerificationClientProps {
  initialProofreaders: PendingProofreader[]
}

export default function ProofreaderVerificationClient({
  initialProofreaders,
}: ProofreaderVerificationClientProps) {
  const router = useRouter()
  const [proofreaders, setProofreaders] = useState<PendingProofreader[]>(initialProofreaders)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const pagedProofreaders = proofreaders.slice((page - 1) * pageSize, page * pageSize)

  const loadPendingProofreaders = async () => {
    setLoading(true)
    setError(null)
    const result = await getPendingProofreaders()
    setProofreaders(result)
    setLoading(false)
  }

  const handleVerify = async (userId: string, firstName: string, lastName: string) => {
    setProcessing(userId)
    const result = await verifyProofreader(userId)

    if (result.success) {
      setSuccessMessage(`${firstName} ${lastName} has been approved as a Language Editor / Proofreader!`)
      setProofreaders((current) => current.filter((p) => p.id !== userId))
      window.dispatchEvent(new CustomEvent('faculty-pending-approvals-changed'))
      router.refresh()
      setTimeout(() => setSuccessMessage(null), 4000)
    } else {
      setError(result.error || 'Failed to verify proofreader')
    }

    setProcessing(null)
  }

  const handleReject = async (userId: string, firstName: string, lastName: string) => {
    if (!confirm(`Are you sure you want to decline ${firstName} ${lastName}'s registration?`)) {
      return
    }

    setProcessing(userId)
    const result = await rejectProofreader(userId)

    if (result.success) {
      setSuccessMessage(`${firstName} ${lastName}'s registration has been declined.`)
      setProofreaders((current) => current.filter((p) => p.id !== userId))
      window.dispatchEvent(new CustomEvent('faculty-pending-approvals-changed'))
      router.refresh()
      setTimeout(() => setSuccessMessage(null), 4000)
    } else {
      setError(result.error || 'Failed to decline registration')
    }

    setProcessing(null)
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <SpellCheck className="text-purple-600 dark:text-purple-400" size={26} />
            Proofreader Verification
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review and approve registered Language Editors and Proofreaders before they are assigned to student manuscripts.
          </p>
        </div>

        <button
          onClick={loadPendingProofreaders}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
          Refresh
        </button>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm font-medium text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300 animate-[fade_up_300ms_ease-out]">
          {successMessage}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          <AlertCircle size={18} className="shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Proofreaders List */}
      {proofreaders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-300">
            <CheckCircle size={28} />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
            No pending proofreader registrations
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            All registered Language Editors and Proofreaders have been reviewed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
                <tr>
                  <th className="px-6 py-4">Editor Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Department / Specialization</th>
                  <th className="px-6 py-4">Registered Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pagedProofreaders.map((p) => {
                  const isBusy = processing === p.id
                  const formattedDate = new Date(p.updated_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })

                  return (
                    <tr key={p.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold text-xs dark:bg-purple-950 dark:text-purple-300">
                            {p.first_name.charAt(0)}{p.last_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {p.first_name} {p.last_name}
                            </p>
                            <span className="inline-block rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              Language Critic
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono text-xs">
                        {p.email}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {p.course_program || 'General Education'}
                        </p>
                        {p.institution && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Building2 size={12} />
                            {p.institution}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {formattedDate}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleVerify(p.id, p.first_name, p.last_name)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-purple-700 disabled:opacity-50"
                          >
                            {isBusy ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <CheckCircle size={13} />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(p.id, p.first_name, p.last_name)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/20 disabled:opacity-50 transition"
                          >
                            <XCircle size={13} />
                            Decline
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <PaginationControl
            page={page}
            totalCount={proofreaders.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}
