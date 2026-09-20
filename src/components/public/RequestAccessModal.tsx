'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  X,
  Lock,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserPlus,
  LogIn,
  ShieldCheck,
  Building2,
} from 'lucide-react'
import { submitAccessRequestAction } from '@/app/repository/[id]/actions'
import { usePopup } from '@/components/ui/PopupProvider'

interface RequestAccessModalProps {
  researchId: string
  researchTitle: string
  leaderName: string
  currentUser?: {
    id: string
    name: string
    email: string
  } | null
  isOpen: boolean
  onClose: () => void
}

export function RequestAccessModal({
  researchId,
  researchTitle,
  leaderName,
  currentUser,
  isOpen,
  onClose,
}: RequestAccessModalProps) {
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { notify } = usePopup()

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!currentUser) {
      setErrorMessage('Please sign in or create a guest account to submit a request.')
      return
    }

    if (!message.trim() || message.trim().length < 10) {
      setErrorMessage('Please provide a reason of at least 10 characters explaining your request.')
      return
    }

    startTransition(async () => {
      const res = await submitAccessRequestAction({
        researchId,
        message: message.trim(),
      })

      if (res.error) {
        setErrorMessage(res.error)
        notify({
          title: 'Request Failed',
          message: res.error,
          variant: 'error',
        })
      } else {
        setIsSuccess(true)
        notify({
          title: 'Request Submitted',
          message: 'Your access request has been sent to the research leader.',
          variant: 'success',
        })
      }
    })
  }

  const handleClose = () => {
    if (!isPending) {
      setErrorMessage(null)
      setIsSuccess(false)
      setMessage('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl transition-all dark:border-gray-800 dark:bg-gray-900 sm:p-8">
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isPending}
          className="absolute right-5 top-5 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        {!currentUser ? (
          /* Unauthenticated Visitor Prompt */
          <div className="space-y-6 py-2 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
              <ShieldCheck size={36} />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
                <Building2 size={13} />
                Guest Account Required
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100">
                Sign In to Request Access
              </h3>
              <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                Access to the full PDF manuscript for &ldquo;{researchTitle}&rdquo; requires authorization from Research Leader {leaderName}.
              </p>
              <p className="text-xs text-gray-500">
                To protect student intellectual property, access requests must be submitted from a verified account.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link
                href={`/register/guest?redirect=${encodeURIComponent(`/repository/${researchId}`)}`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-teal-700 hover:shadow-lg"
              >
                <UserPlus size={17} />
                <span>Create a Free Guest Account</span>
              </Link>

              <Link
                href={`/login?redirect=${encodeURIComponent(`/repository/${researchId}`)}`}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <LogIn size={16} />
                <span>Sign in with existing account</span>
              </Link>
            </div>

            <p className="text-xs text-gray-500 pt-1">
              Enrolled university student?{' '}
              <Link
                href={`/register?redirect=${encodeURIComponent(`/repository/${researchId}`)}`}
                className="font-semibold text-blue-600 hover:underline"
              >
                Register as Student
              </Link>
            </p>
          </div>
        ) : isSuccess ? (
          /* Success View */
          <div className="space-y-6 py-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Access Request Submitted!
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your request to view the full manuscript of &ldquo;{researchTitle}&rdquo; has been sent to Research Leader {leaderName}.
              </p>
            </div>

            <div className="rounded-2xl border border-green-200 bg-green-50/50 p-4 text-left text-xs text-green-800 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300">
              <span className="font-bold">What happens next:</span>
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                <li>The Research Leader will evaluate your stated purpose.</li>
                <li>You can monitor the status of this request in your personal dashboard.</li>
                <li>Once approved, you will have immediate full-text reading and download access.</li>
              </ul>
            </div>

            <button
              onClick={handleClose}
              className="w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        ) : (
          /* Request Form View for Authenticated User */
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Header */}
            <div className="space-y-1.5 pr-6">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Lock size={20} />
                <span className="text-xs font-bold uppercase tracking-wider">Restricted Manuscript</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight text-gray-900 dark:text-gray-100">
                Request Research Access
              </h3>
              <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                Access to the full PDF manuscript requires authorization from the Research Leader (
                <span className="font-semibold text-slate-700 dark:text-slate-200">{leaderName}</span>).
              </p>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle size={16} className="shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Requester Identity */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm shadow-sm">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-blue-900 dark:text-blue-200">
                    Requesting as {currentUser.name}
                  </p>
                  <p className="truncate text-[11px] text-blue-700/80 dark:text-blue-300/80">
                    {currentUser.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Reason / Purpose */}
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Reason / Purpose of Request <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain why you are requesting access (e.g., conducting academic research in a related field, thesis citation, comparative study)..."
                disabled={isPending}
                required
                className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-900/30"
              />
              <span className="text-[11px] text-gray-400">
                Minimum 10 characters.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
