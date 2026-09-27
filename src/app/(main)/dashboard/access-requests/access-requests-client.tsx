'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  FileText,
  Search,
  ExternalLink,
  ShieldCheck,
  Filter,
} from 'lucide-react'
import { reviewAccessRequestAction } from './actions'
import { usePopup } from '@/components/ui/PopupProvider'
import type { ResearchAccessRequestWithDetails } from '@/lib/research/access-requests/types'

interface AccessRequestsClientProps {
  initialRequests: ResearchAccessRequestWithDetails[]
  currentUserId: string
}

export default function AccessRequestsClient({
  initialRequests,
  currentUserId,
}: AccessRequestsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const { notify } = usePopup()
  const [requests, setRequests] = useState<ResearchAccessRequestWithDetails[]>(initialRequests)
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [selectedPaper, setSelectedPaper] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewerNote, setReviewerNote] = useState('')
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Sync state if initialRequests updates from server revalidation
  useEffect(() => {
    setRequests(initialRequests)
  }, [initialRequests])

  // Listen to realtime changes on research_access_requests
  useEffect(() => {
    const channel = supabase
      .channel('access-requests-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'research_access_requests' },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  // Extract unique research papers for dropdown
  const uniquePapers = Array.from(
    new Map(requests.map((r) => [r.research_id, r.research_title || 'Untitled Paper'])).entries()
  ).map(([id, title]) => ({ id, title }))

  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const approvedCount = requests.filter((r) => r.status === 'approved').length
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length

  const filteredRequests = requests.filter((r) => {
    if (activeFilter !== 'all' && r.status !== activeFilter) return false
    if (selectedPaper !== 'all' && r.research_id !== selectedPaper) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const name = (r.requester_name || r.guest_name || '').toLowerCase()
      const email = (r.requester_email || r.guest_email || '').toLowerCase()
      const title = (r.research_title || '').toLowerCase()
      const message = (r.message || '').toLowerCase()
      return name.includes(q) || email.includes(q) || title.includes(q) || message.includes(q)
    }

    return true
  })

  const handleReview = (req: ResearchAccessRequestWithDetails, status: 'approved' | 'rejected') => {
    startTransition(async () => {
      const res = await reviewAccessRequestAction({
        researchId: req.research_id,
        requestId: req.id,
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
          prev.map((item) =>
            item.id === req.id
              ? {
                  ...item,
                  status,
                  reviewer_notes: reviewerNote.trim() || null,
                  reviewed_at: new Date().toISOString(),
                }
              : item
          )
        )
        setReviewingId(null)
        setReviewerNote('')

        // Dispatch custom event so the sidebar counter updates instantly
        window.dispatchEvent(new CustomEvent('access-requests-changed'))

        notify({
          title: status === 'approved' ? 'Access Granted' : 'Request Declined',
          message: `The access request has been marked as ${status}.`,
          variant: 'success',
        })
      }
    })
  }

  const handleCopyGuestLink = (req: ResearchAccessRequestWithDetails) => {
    if (!req.access_token) return
    const url = `${window.location.origin}/repository/${req.research_id}?token=${req.access_token}`
    navigator.clipboard.writeText(url)
    setCopiedTokenId(req.id)
    setTimeout(() => setCopiedTokenId(null), 2500)
    notify({
      title: 'Link Copied',
      message: 'Direct guest access link copied to clipboard.',
      variant: 'success',
    })
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Workspace Header */}
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              <KeyRound size={14} className="text-blue-600" />
              <span>Author & Mentorship Workspace</span>
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Manuscript Access Requests
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Review and manage permissions from guests and institutional peers requesting access to read and download your published research papers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                <Clock size={14} />
                <span>Pending Review</span>
              </div>
              <p className="mt-1 text-2xl font-black">{pendingCount}</p>
            </div>
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-green-900 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-100">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                <CheckCircle2 size={14} />
                <span>Approved</span>
              </div>
              <p className="mt-1 text-2xl font-black">{approvedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Paper Selector, Search */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          {(
            [
              { key: 'all', label: `All (${requests.length})` },
              { key: 'pending', label: `Pending (${pendingCount})` },
              { key: 'approved', label: `Approved (${approvedCount})` },
              { key: 'rejected', label: `Declined (${rejectedCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                activeFilter === tab.key
                  ? 'bg-white text-blue-600 shadow-xs dark:bg-gray-700 dark:text-blue-300'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Paper Filter & Search Bar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {uniquePapers.length > 1 && (
            <div className="relative">
              <select
                value={selectedPaper}
                onChange={(e) => setSelectedPaper(e.target.value)}
                aria-label="Filter by Research Paper"
                className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 py-1.5 pl-3 pr-8 text-xs font-medium text-gray-700 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 sm:w-auto"
              >
                <option value="all">All Research Papers ({uniquePapers.length})</option>
                {uniquePapers.map((paper) => (
                  <option key={paper.id} value={paper.id}>
                    {paper.title.length > 32 ? `${paper.title.slice(0, 32)}...` : paper.title}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>
          )}

          <div className="relative min-w-[200px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search requester or note..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <KeyRound size={36} className="mx-auto text-gray-400" />
            <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-white">
              No access requests found
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-400">
              {searchQuery
                ? 'No requests match your current search criteria.'
                : activeFilter === 'pending'
                  ? 'Great job! You have no pending access requests to review right now.'
                  : `There are currently no ${activeFilter !== 'all' ? activeFilter : ''} access requests for your published research papers.`}
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isGuest = !req.user_id
            const requesterName = isGuest
              ? req.guest_name || 'Anonymous Guest'
              : req.user_profile
                ? `${req.user_profile.first_name} ${req.user_profile.last_name}`
                : req.requester_name || 'Registered User'
            const requesterRole = isGuest
              ? 'Guest Requester'
              : req.user_profile?.course_program || req.user_profile?.role || 'Student'
            const isReviewing = reviewingId === req.id

            return (
              <div
                key={req.id}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
              >
                {/* Paper Banner Header */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-blue-600 shrink-0" />
                    <Link
                      href={`/dashboard/research/${req.research_id}`}
                      className="group inline-flex items-center gap-1 text-sm font-bold text-slate-900 transition-colors hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                    >
                      <span>{req.research_title || 'Research Manuscript'}</span>
                      <ExternalLink size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </div>

                  {/* Status Badge */}
                  <div>
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

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Requester Identity */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-gray-900 dark:text-white">
                        {requesterName}
                      </span>
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {requesterRole}
                      </span>
                      {req.guest_email && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Mail size={12} /> {req.guest_email}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Requested on {new Date(req.created_at).toLocaleDateString()} at{' '}
                      {new Date(req.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Stated Purpose */}
                <div className="mt-3.5 rounded-xl border border-gray-200/70 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <MessageSquare size={13} />
                    <span>Stated Purpose for Access:</span>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-800 dark:text-gray-200">
                    &ldquo;{req.message}&rdquo;
                  </p>
                </div>

                {/* Reviewer Note (if already reviewed) */}
                {req.reviewer_notes && (
                  <div className="mt-3 rounded-lg bg-blue-50/60 p-2.5 text-xs text-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                    <span className="font-semibold">Reviewer Response:</span> {req.reviewer_notes}
                  </div>
                )}

                {/* Guest Direct Access Link (if approved) */}
                {req.status === 'approved' && isGuest && req.access_token && (
                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-green-200 bg-green-50/60 p-3 dark:border-green-900/40 dark:bg-green-950/20">
                    <div className="text-xs text-green-900 dark:text-green-200">
                      <span className="font-bold">Guest Direct Access Link:</span> Active token generated
                    </div>
                    <button
                      onClick={() => handleCopyGuestLink(req)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-green-700 shadow-xs transition hover:bg-green-100 dark:bg-gray-800 dark:text-green-300"
                    >
                      {copiedTokenId === req.id ? (
                        <>
                          <Check size={13} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> Copy Guest URL
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Review Action Controls */}
                {req.status === 'pending' && (
                  <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                    {!isReviewing ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => {
                            setReviewingId(req.id)
                            setReviewerNote('')
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-700"
                        >
                          Review Request
                          <ChevronDown size={14} />
                        </button>
                        <button
                          onClick={() => handleReview(req, 'approved')}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2 text-xs font-bold text-green-700 transition hover:bg-green-100 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300"
                        >
                          <CheckCircle2 size={13} /> Quick Approve
                        </button>
                        <button
                          onClick={() => handleReview(req, 'rejected')}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                        >
                          <XCircle size={13} /> Quick Decline
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-900/30 dark:bg-blue-950/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-900 dark:text-blue-200">
                            Decision for {requesterName}
                          </span>
                          <button
                            onClick={() => setReviewingId(null)}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                        <input
                          type="text"
                          value={reviewerNote}
                          onChange={(e) => setReviewerNote(e.target.value)}
                          placeholder="Add an optional note to the requester..."
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReview(req, 'approved')}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-green-700 disabled:opacity-50"
                          >
                            {isPending ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={13} />
                            )}
                            Grant Access
                          </button>
                          <button
                            onClick={() => handleReview(req, 'rejected')}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700 disabled:opacity-50"
                          >
                            {isPending ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <XCircle size={13} />
                            )}
                            Decline Request
                          </button>
                        </div>
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
