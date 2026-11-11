import { Loader2, X } from 'lucide-react'
import { summarizeQuote } from '../utils/annotation-display'

type CommentComposerProps = {
  open: boolean
  previewText: string
  commentText: string
  isSubmitting: boolean
  onCommentTextChange: (value: string) => void
  onClose: () => void
  onCancel: () => void
  onSave: () => void
}

export function CommentComposer({
  open,
  previewText,
  commentText,
  isSubmitting,
  onCommentTextChange,
  onClose,
  onCancel,
  onSave,
}: CommentComposerProps) {
  if (!open) return null

  return (
    <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-3 sm:bottom-6 sm:px-4">
      <div className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
              New Feedback
            </p>
            <p className="mt-2 text-sm font-medium text-gray-700">
              {summarizeQuote(previewText, 180)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close feedback composer"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <textarea
          value={commentText}
          onChange={(event) => onCommentTextChange(event.target.value)}
          rows={4}
          placeholder="Describe the issue or give revision guidance..."
          className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || !commentText.trim()}
            onClick={onSave}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
            Save feedback
          </button>
        </div>
      </div>
    </div>
  )
}
