import { MessageSquare, X } from 'lucide-react'
import { getAnnotationSourceType } from '@/lib/research/annotation-versioning'
import { getVersionLabel } from '@/lib/research/versioning'
import { type FormEvent } from 'react'
import { AnnotationThread } from './AnnotationThread'
import {
  type AnnotateFilter,
  type AnnotationRecord,
  type AnnotateViewMode,
  type ReplyRecord,
} from '../types'
import { getAnnotationLocationLabel, summarizeQuote } from '../utils/annotation-display'

type AnnotationSidebarProps = {
  viewMode: AnnotateViewMode
  filter: AnnotateFilter
  annotations: AnnotationRecord[]
  unresolvedCount: number
  resolvedCount: number
  displayedAnnotations: AnnotationRecord[]
  selectedAnnotation: AnnotationRecord | null
  canParticipate: boolean
  canReview: boolean
  deletingAnnotationId: string | null
  isLoadingReplies: boolean
  threadReplies: ReplyRecord[]
  replyText: string
  isSubmittingReply: boolean
  onFilterChange: (filter: AnnotateFilter) => void
  onOpenThread: (annotation: AnnotationRecord) => void
  onCloseThread: () => void
  onToggleResolve: (annotationId: string, currentStatus: boolean) => void
  onDeleteAnnotation: (annotationId: string) => void
  onReplyTextChange: (value: string) => void
  onSendReply: (event?: FormEvent) => void
  onDismiss?: () => void
}

export function AnnotationSidebar({
  viewMode,
  filter,
  annotations,
  unresolvedCount,
  resolvedCount,
  displayedAnnotations,
  selectedAnnotation,
  canParticipate,
  canReview,
  deletingAnnotationId,
  isLoadingReplies,
  threadReplies,
  replyText,
  isSubmittingReply,
  onFilterChange,
  onOpenThread,
  onCloseThread,
  onToggleResolve,
  onDeleteAnnotation,
  onReplyTextChange,
  onSendReply,
  onDismiss,
}: AnnotationSidebarProps) {
  return (
    <div className="relative flex min-h-0 w-full flex-col overflow-hidden rounded-l-3xl border-l border-gray-200 bg-white xl:w-[380px] xl:min-w-[380px]">
      <div
        className="absolute inset-0 flex transition-transform duration-300 ease-in-out"
        style={{ transform: viewMode === 'list' ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <div className="flex h-full w-full flex-shrink-0 flex-col">
          <div className="border-b border-gray-100 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <MessageSquare size={18} className="text-blue-600" />
                Feedback
              </h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-500">
                  {annotations.length} total
                </span>
                {onDismiss ? (
                  <button
                    type="button"
                    onClick={onDismiss}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50"
                    aria-label="Close annotations"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1">
              {(['all', 'unresolved', 'resolved'] as const).map((nextFilter) => (
                <button
                  key={nextFilter}
                  type="button"
                  onClick={() => onFilterChange(nextFilter)}
                  className={`rounded-md px-2 py-2 text-xs font-bold capitalize transition ${
                    filter === nextFilter
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {nextFilter === 'all'
                    ? `All (${annotations.length})`
                    : nextFilter === 'unresolved'
                      ? `Open (${unresolvedCount})`
                      : `Done (${resolvedCount})`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {displayedAnnotations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                No feedback in this version group yet.
              </div>
            ) : (
              displayedAnnotations.map((annotation) => (
                <button
                  key={annotation.id}
                  type="button"
                  onClick={() => onOpenThread(annotation)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedAnnotation?.id === annotation.id
                      ? 'border-blue-400 bg-blue-50 shadow-sm ring-2 ring-blue-100'
                      : annotation.is_resolved
                        ? 'border-green-100 bg-green-50/30 hover:bg-green-50'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      {getAnnotationLocationLabel(annotation)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                      {getAnnotationSourceType(annotation) === 'pdf' ? 'PDF' : 'Text'}
                    </span>
                    {annotation.version_major ? (
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-700">
                        Group {annotation.version_major}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                      v{getVersionLabel(annotation)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        annotation.is_resolved
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {annotation.is_resolved ? 'Resolved' : 'Needs review'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-gray-900">
                    {annotation.comment_text}
                  </p>
                  <p className="mt-3 truncate text-xs italic text-gray-500">
                    &ldquo;{summarizeQuote(annotation.quote, 56)}&rdquo;
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex h-full w-full flex-shrink-0 flex-col bg-white">
          {selectedAnnotation ? (
            <AnnotationThread
              selectedAnnotation={selectedAnnotation}
              canParticipate={canParticipate}
              canReview={canReview}
              deletingAnnotationId={deletingAnnotationId}
              isLoadingReplies={isLoadingReplies}
              threadReplies={threadReplies}
              replyText={replyText}
              isSubmittingReply={isSubmittingReply}
              onClose={onCloseThread}
              onToggleResolve={onToggleResolve}
              onDeleteAnnotation={onDeleteAnnotation}
              onReplyTextChange={onReplyTextChange}
              onSendReply={onSendReply}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
