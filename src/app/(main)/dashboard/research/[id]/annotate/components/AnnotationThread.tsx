import { ChevronLeft, Loader2, Send, Trash2 } from 'lucide-react'
import { type FormEvent } from 'react'
import { type AnnotationRecord, type ReplyRecord } from '../types'

type AnnotationThreadProps = {
  selectedAnnotation: AnnotationRecord
  canParticipate: boolean
  canReview: boolean
  deletingAnnotationId: string | null
  isLoadingReplies: boolean
  threadReplies: ReplyRecord[]
  replyText: string
  isSubmittingReply: boolean
  onClose: () => void
  onToggleResolve: (annotationId: string, currentStatus: boolean) => void
  onDeleteAnnotation: (annotationId: string) => void
  onReplyTextChange: (value: string) => void
  onSendReply: (event?: FormEvent) => void
}

export function AnnotationThread({
  selectedAnnotation,
  canParticipate,
  canReview,
  deletingAnnotationId,
  isLoadingReplies,
  threadReplies,
  replyText,
  isSubmittingReply,
  onClose,
  onToggleResolve,
  onDeleteAnnotation,
  onReplyTextChange,
  onSendReply,
}: AnnotationThreadProps) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 p-4">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-gray-900"
        >
          <ChevronLeft size={16} />
          Back to list
        </button>
        {canParticipate ? (
          <div className="flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={() =>
                onToggleResolve(selectedAnnotation.id, selectedAnnotation.is_resolved)
              }
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                selectedAnnotation.is_resolved
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {selectedAnnotation.is_resolved ? 'Resolved' : 'Mark resolved'}
            </button>
            {canReview ? (
              <button
                type="button"
                onClick={() => onDeleteAnnotation(selectedAnnotation.id)}
                disabled={deletingAnnotationId === selectedAnnotation.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingAnnotationId === selectedAnnotation.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
                Delete
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
            Context
          </p>
          <p className="mt-2 text-sm italic leading-relaxed text-gray-700">
            &ldquo;{selectedAnnotation.quote}&rdquo;
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
            Feedback
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-800">
            {selectedAnnotation.comment_text}
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
            Replies
          </p>
          {isLoadingReplies ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" />
              Loading replies...
            </div>
          ) : threadReplies.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-400">
              No replies yet.
            </div>
          ) : (
            threadReplies.map((reply) => (
              <div key={reply.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {reply.profiles?.first_name || 'User'} {reply.profiles?.last_name || ''}
                  </p>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    {reply.profiles?.role || 'participant'}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-gray-700">
                  {reply.message}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <form onSubmit={onSendReply} className="border-t border-gray-100 bg-white p-4">
        <textarea
          value={replyText}
          onChange={(event) => onReplyTextChange(event.target.value)}
          rows={3}
          placeholder="Reply to this feedback..."
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="submit"
            disabled={isSubmittingReply || !replyText.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSubmittingReply ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Send reply
          </button>
        </div>
      </form>
    </>
  )
}
