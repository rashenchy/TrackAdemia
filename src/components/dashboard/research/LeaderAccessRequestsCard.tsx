'use client'

import { useState, useTransition } from 'react'
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Mail,
  MessageSquare,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { reviewAccessRequestAction } from '@/app/(main)/dashboard/research/[id]/actions'
import { usePopup } from '@/components/ui/PopupProvider'
import type { ResearchAccessRequest } from '@/lib/research/access-requests/types'

interface LeaderAccessRequestsCardProps {
  researchId: string
  requests: ResearchAccessRequest[]
}

export function LeaderAccessRequestsCard({
  researchId,
  requests: initialRequests,
}: LeaderAccessRequestsCardProps) {
  const [requests, setRequests] = useState<ResearchAccessRequest[]>(initialRequests)
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewerNote, setReviewerNote] = useState('')
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { notify } = usePopup()

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  const filteredRequests = requests.filter((r) => {
    if (activeFilter === 'all') return true
    return r.status === activeFilter
  })

  const handleReview = (requestId: string, status: 'approved' | 'rejected') => {
    startTransition(async () => {
      const res = await reviewAccessRequestAction({
        researchId,
        requestId,
        status,
        reviewerNotes: reviewerNote.trim() || undefined,
      })

      if (res.error) {
        notify({
          title: 'Review Failed',
          message: res.error,
          variant: 'error',
        })
      } else {
        setRequests((prev) =>
          prev.map((req) =>
            req.id === requestId
              ? {
                  ...req,
                  status,
                  reviewer_notes: reviewerNote.trim() || null,
                  reviewed_at: new Date().toISOString(),
                }
              : req
          )
        )
        setReviewingId(null)
        setReviewerNote('')
        notify({
          title: status === 'approved' ? 'Access Granted' : 'Request Declined',
          message: `The access request has been marked as ${status}.`,
          variant: 'success',
        })
      }
    })
  }

  const handleCopyGuestLink = (req: ResearchAccessRequest) => {
    if (!req.access_token) return
    const url = `${window.location.origin}/repository/${researchId}?token=${req.access_token}`
    navigator.clipboard.writeText(url)
    setCopiedTokenId(req.id)
    setTimeout(() => setCopiedTokenId(null), 2500)
    notify({
      title: 'Link Copied',
      message: 'Direct guest access link copied to clipboard.',
      variant: 'success',
    })
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-[var(--background)] p-6 shadow-sm dark:border-gray-800">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <KeyRound className="text-blue-600" size={20} />
            <h2 className="text-lg font-bold text-[var(--foreground)]">Access Requests</h2>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            0 requests
          </span>
        </div>
        <p className="py-6 text-center text-sm text-gray-500">
          No access requests have been submitted for this published paper yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-[var(--background)] p-6 shadow-sm dark:border-gray-800">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <KeyRound className="text-blue-600" size={22} />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[var(--foreground)]">Research Access Requests</h2>
              {pendingCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white shadow-xs">
                  {pendingCount} new
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Manage permissions to view and download your published manuscript.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`rounded-lg px-3 py-1 text-xs font-bold capitalize transition-colors ${
                activeFilter === filter
                  ? 'bg-white text-blue-700 shadow-xs dark:bg-gray-700 dark:text-blue-300'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3.5">
        {filteredRequests.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-400">
            No {activeFilter} access requests found.
          </p>
        ) : (
          filteredRequests.map((req) => {
            const isGuest = !req.user_id
            const requesterName = isGuest
              ? req.guest_name || 'Anonymous Guest'
              : req.user_profile
                ? `${req.user_profile.first_name} ${req.user_profile.last_name}`
                : 'Registered User'
            const requesterRole = isGuest
              ? 'Guest Requester'
              : req.user_profile?.course_program || req.user_profile?.role || 'Student'
            const isReviewing = reviewingId === req.id

            return (
              <div
                key={req.id}
                className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 transition-all dark:border-gray-800/80 dark:bg-gray-900/40"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  {/* Requester Identity */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[var(--foreground)]">{requesterName}</span>
                      <span className="rounded-md bg-gray-200/80 px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {requesterRole}
                      </span>
                      {req.guest_email && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Mail size={12} /> {req.guest_email}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Submitted on {new Date(req.created_at).toLocaleDateString()} at{' '}
                      {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {req.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        <Clock size={12} /> Pending Review
                      </span>
                    ) : req.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800 dark:bg-green-900/40 dark:text-green-300">
                        <CheckCircle2 size={12} /> Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                        <XCircle size={12} /> Declined
                      </span>
                    )}
                  </div>
                </div>

                {/* Stated Purpose */}
                <div className="mt-3 rounded-lg border border-gray-200/60 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    <MessageSquare size={12} /> Stated Purpose:
                  </div>
                  <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                    &ldquo;{req.message}&rdquo;
                  </p>
                </div>

                {/* Reviewer Note (if any) */}
                {req.reviewer_notes && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Reviewer Note:</span> {req.reviewer_notes}
                  </div>
                )}

                {/* Guest Direct Access Link (if approved) */}
                {req.status === 'approved' && isGuest && req.access_token && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-green-200 bg-green-50/50 p-2.5 dark:border-green-900/40 dark:bg-green-950/20">
                    <div className="text-xs text-green-900 dark:text-green-200">
                      <span className="font-bold">Guest Direct Access Link:</span> Active
                    </div>
                    <button
                      onClick={() => handleCopyGuestLink(req)}
                      className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-bold text-green-700 shadow-xs transition hover:bg-green-100 dark:bg-gray-800 dark:text-green-300"
                    >
                      {copiedTokenId === req.id ? (
                        <>
                          <Check size={12} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copy Link
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Pending Actions */}
                {req.status === 'pending' && (
                  <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                    {isReviewing ? (
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={reviewerNote}
                          onChange={(e) => setReviewerNote(e.target.value)}
                          placeholder="Add an optional note to the requester..."
                          disabled={isPending}
                          className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-xs text-gray-900 outline-none focus:border-blue-500 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setReviewingId(null)
                              setReviewerNote('')
                            }}
                            disabled={isPending}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReview(req.id, 'rejected')}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-50"
                          >
                            {isPending ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReview(req.id, 'approved')}
                            disabled={isPending}
                            className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                          >
                            {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                            Grant Access
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setReviewingId(req.id)
                            setReviewerNote('')
                          }}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        >
                          Review with Note...
                        </button>
                        <button
                          onClick={() => handleReview(req.id, 'rejected')}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-300"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleReview(req.id, 'approved')}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-green-700 disabled:opacity-50"
                        >
                          Grant Access
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
