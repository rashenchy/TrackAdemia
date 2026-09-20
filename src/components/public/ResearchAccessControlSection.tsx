'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock, Clock, XCircle, ShieldCheck, KeyRound, LogIn, UserPlus } from 'lucide-react'
import { PublicDownloadButton } from './PublicDownloadButton'
import { RequestAccessModal } from './RequestAccessModal'
import type { UserResearchAccessState } from '@/lib/research/access-requests/types'

interface ResearchAccessControlSectionProps {
  researchId: string
  researchTitle: string
  leaderName: string
  fileUrl: string | null
  fileName: string | null
  accessState: UserResearchAccessState
  currentUser: {
    id: string
    name: string
    email: string
  } | null
  guestToken?: string | null
}

export function ResearchAccessControlSection({
  researchId,
  researchTitle,
  leaderName,
  fileUrl,
  fileName,
  accessState,
  currentUser,
  guestToken,
}: ResearchAccessControlSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 1. Full Access Granted (Author, Faculty, or Approved Request)
  if (accessState.hasFullAccess && fileUrl) {
    return (
      <div className="rounded-3xl border border-green-200 bg-gradient-to-br from-green-50/80 to-emerald-50/30 p-8 dark:border-green-900/40 dark:bg-green-950/20">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800 dark:bg-green-900/40 dark:text-green-300">
              <ShieldCheck size={14} />
              <span>
                {accessState.accessReason === 'author'
                  ? 'Author Access'
                  : accessState.accessReason === 'faculty'
                    ? 'Faculty Access'
                    : 'Authorized Access Granted'}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Full Manuscript Available
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              You have full authorization to view and download this academic research manuscript.
            </p>
            {fileName && (
              <p className="pt-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                File: {fileName}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <PublicDownloadButton
              fileUrl={fileUrl}
              researchId={researchId}
              downloadFileName={fileName}
              guestToken={guestToken}
            />

            {(accessState.accessReason === 'author' || accessState.accessReason === 'faculty') && (
              <Link
                href={`/dashboard/research/${researchId}`}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-gray-800 dark:text-slate-300 dark:border-gray-700 dark:hover:bg-gray-700 rounded-xl font-bold transition-all text-sm shadow-xs w-full sm:w-auto"
              >
                Dashboard View
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 2. Pending Request
  if (accessState.activeRequestStatus === 'pending') {
    return (
      <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/30 p-8 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              <Clock size={14} />
              <span>Access Request Pending</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Awaiting Review by Research Leader
            </h3>
            <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              Your request to access the full manuscript has been submitted to{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{leaderName}</span>.
              You will receive an update as soon as it is reviewed.
            </p>
          </div>

          <div className="shrink-0 rounded-2xl border border-amber-200 bg-white px-4 py-2.5 text-xs font-bold text-amber-800 shadow-sm dark:border-amber-900/60 dark:bg-gray-900 dark:text-amber-300">
            Status: In Review
          </div>
        </div>
      </div>
    )
  }

  // 3. Rejected Request
  if (accessState.activeRequestStatus === 'rejected') {
    return (
      <div className="rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50/80 to-red-50/30 p-8 dark:border-rose-900/40 dark:bg-rose-950/20">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
              <XCircle size={14} />
              <span>Request Declined</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Access Request Was Not Approved
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              The Research Leader was unable to grant access based on your previous request. You may submit a new request clarifying your research purpose.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700"
          >
            <KeyRound size={16} />
            Submit New Request
          </button>
        </div>

        <RequestAccessModal
          researchId={researchId}
          researchTitle={researchTitle}
          leaderName={leaderName}
          currentUser={currentUser}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    )
  }

  // 4. Default: No Access Yet (Public abstract view)
  return (
    <div className="space-y-3">
      {guestToken && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          <span className="font-bold">Notice:</span> The provided guest access token is either invalid, expired, or awaiting approval. You can request new access below.
        </div>
      )}

      <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-white p-8 shadow-sm dark:border-blue-900/30 dark:bg-blue-950/10">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              <Lock size={14} />
              <span>Restricted Full Document</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {currentUser ? 'Request Full Manuscript Access' : 'Unlock the Full Manuscript'}
            </h3>
            <p className="max-w-xl text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              Metadata and abstracts are publicly accessible. Full manuscript viewing and downloading
              requires approval from Research Leader{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{leaderName}</span>.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-blue-700"
            >
              <KeyRound size={16} />
              Request Access
            </button>

            {!currentUser && (
              <Link
                href={`/login?next=${encodeURIComponent(`/repository/${researchId}`)}`}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50 dark:border-gray-800 dark:bg-gray-900 dark:text-blue-400 dark:hover:bg-gray-800"
              >
                <LogIn size={16} />
                Log In
              </Link>
            )}
          </div>
        </div>

        <RequestAccessModal
          researchId={researchId}
          researchTitle={researchTitle}
          leaderName={leaderName}
          currentUser={currentUser}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </div>
  )
}
