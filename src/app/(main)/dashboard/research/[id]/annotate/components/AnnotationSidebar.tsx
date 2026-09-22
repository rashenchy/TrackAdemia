import { GraduationCap, MessageSquare, SpellCheck, User, X } from 'lucide-react'
import { getAnnotationSourceType } from '@/lib/research/annotation-versioning'
import { getVersionLabel } from '@/lib/research/versioning'
import { useState, type FormEvent } from 'react'
import { AnnotationThread } from './AnnotationThread'
import {
  type AnnotateFilter,
  type AnnotationRecord,
  type AnnotateViewMode,
  type ReplyRecord,
} from '../types'
import {
  getAnnotationLocationLabel,
  getAuthorDisplayName,
  getAuthorRoleBadge,
  summarizeQuote,
} from '../utils/annotation-display'

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
  const [reviewerFilter, setReviewerFilter] = useState<'all' | 'mentor' | 'proofreader'>('all')

  const teacherFeedbackCount = annotations.filter(
    (a) => a.profiles?.role === 'mentor'
  ).length
  const proofreaderFeedbackCount = annotations.filter(
    (a) => a.profiles?.role === 'proofreader'
  ).length

  const filteredAnnotations = displayedAnnotations.filter((annotation) => {
    if (reviewerFilter === 'all') return true
    if (reviewerFilter === 'mentor') return annotation.profiles?.role === 'mentor'
    if (reviewerFilter === 'proofreader') return annotation.profiles?.role === 'proofreader'
    return true
  })

  return (
    <aside
      className="relative flex min-h-0 w-full flex-col overflow-hidden border-l border-gray-200 bg-white xl:w-[380px] xl:min-w-[380px] xl:shrink-0"
    >
      <div className="relative h-full w-full overflow-hidden">
        <div
          className="flex h-full w-[200%] transition-transform duration-300 ease-in-out"
          style={{
            transform: selectedAnnotation ? 'translateX(-50%)' : 'translateX(0%)',
          }}
        >
          <div className="flex h-full w-1/2 flex-shrink-0 flex-col">
            <div className="border-b border-gray-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
                <MessageSquare size={18} className="text-blue-600" />
                Feedback &amp; Notes
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

            {/* Status Tabs */}
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

            {/* Reviewer Role Filter Pills */}
            {(teacherFeedbackCount > 0 || proofreaderFeedbackCount > 0) && (
              <div className="flex items-center gap-1.5 overflow-x-auto pt-1 text-[11px]">
                <span className="text-gray-400 font-semibold shrink-0 text-[10px] uppercase tracking-wider">
                  From:
                </span>
                <button
                  type="button"
                  onClick={() => setReviewerFilter('all')}
                  className={`rounded-full px-2 py-0.5 font-bold transition text-[10px] ${
                    reviewerFilter === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All Reviewers
                </button>
                {teacherFeedbackCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setReviewerFilter('mentor')}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold transition text-[10px] ${
                      reviewerFilter === 'mentor'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    <GraduationCap size={11} />
                    Teacher ({teacherFeedbackCount})
                  </button>
                )}
                {proofreaderFeedbackCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setReviewerFilter('proofreader')}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold transition text-[10px] ${
                      reviewerFilter === 'proofreader'
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    <SpellCheck size={11} />
                    English Critique ({proofreaderFeedbackCount})
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {filteredAnnotations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                {reviewerFilter !== 'all'
                  ? `No feedback from ${reviewerFilter === 'mentor' ? 'Teacher' : 'English Critique'} in this filter.`
                  : 'No feedback in this version group yet.'}
              </div>
            ) : (
              filteredAnnotations.map((annotation) => {
                const roleBadge = getAuthorRoleBadge(annotation.profiles?.role)
                const authorName = getAuthorDisplayName(annotation.profiles)

                return (
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Reviewer Role Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${roleBadge.badgeClass}`}
                        title={`Feedback from ${roleBadge.label}`}
                      >
                        {roleBadge.iconType === 'critique' ? (
                          <SpellCheck size={11} className="shrink-0" />
                        ) : roleBadge.iconType === 'teacher' ? (
                          <GraduationCap size={11} className="shrink-0" />
                        ) : (
                          <User size={11} className="shrink-0" />
                        )}
                        {roleBadge.shortLabel}
                      </span>

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

                    {/* Reviewer Name and Timestamp */}
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                      <span className="truncate">
                        By <strong className="font-semibold text-gray-800">{authorName}</strong>
                      </span>
                      <span className="shrink-0 text-[10px] text-gray-400">
                        {new Date(annotation.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <p className="mt-2 text-sm font-medium text-gray-900 leading-snug">
                      {annotation.comment_text}
                    </p>
                    <p className="mt-2 truncate text-xs italic text-gray-500">
                      &ldquo;{summarizeQuote(annotation.quote, 56)}&rdquo;
                    </p>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="flex h-full w-1/2 flex-shrink-0 flex-col bg-white">
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
  </aside>
  )
}
