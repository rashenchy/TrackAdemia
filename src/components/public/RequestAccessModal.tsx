'use client'

import { useState, useTransition } from 'react'
import { X, Lock, Send, CheckCircle2, AlertCircle, Loader2, User, Mail, ShieldCheck } from 'lucide-react'
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
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
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
      if (!guestName.trim() || guestName.trim().length < 2) {
        setErrorMessage('Please enter your full name.')
        return
      }
      if (!guestEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
        setErrorMessage('Please enter a valid email address.')
        return
      }
    }

    if (!message.trim() || message.trim().length < 10) {
      setErrorMessage('Please provide a reason of at least 10 characters explaining your request.')
      return
    }

    startTransition(async () => {
      const res = await submitAccessRequestAction({
        researchId,
        guestName: currentUser ? undefined : guestName.trim(),
        guestEmail: currentUser ? undefined : guestEmail.trim().toLowerCase(),
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
      if (!currentUser) {
        setGuestName('')
        setGuestEmail('')
      }
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

        {isSuccess ? (
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
                {currentUser
                  ? `Your request to view the full manuscript of "${researchTitle}" has been sent to Research Leader ${leaderName}. You will receive an in-app notification once reviewed.`
                  : `Your request to view the full manuscript of "${researchTitle}" has been sent to Research Leader ${leaderName}. Once approved, you will receive an access link at ${guestEmail}.`}
              </p>
            </div>

            <div className="rounded-2xl border border-green-200 bg-green-50/50 p-4 text-left text-xs text-green-800 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300">
              <span className="font-bold">Next steps:</span>
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                <li>The Research Leader will evaluate your stated purpose.</li>
                <li>Access is granted on a per-research basis.</li>
                {!currentUser && (
                  <li>Keep an eye on your inbox for your approved direct access link.</li>
                )}
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
          /* Request Form View */
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
            {currentUser ? (
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
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Your Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Dr. Jane Doe"
                      disabled={isPending}
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-900/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="jane.doe@university.edu"
                      disabled={isPending}
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100 dark:focus:ring-blue-900/30"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Your secure access link will be delivered here if approved.
                  </p>
                </div>
              </div>
            )}

            {/* Reason / Purpose */}
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Reason / Purpose of Request <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain why you are requesting access (e.g., conducting academic research in a related field, thesis citation, peer review)..."
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
