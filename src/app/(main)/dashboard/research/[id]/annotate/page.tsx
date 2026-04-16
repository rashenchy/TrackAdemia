'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { use, useMemo, useState } from 'react'
import { Viewer, Worker } from '@react-pdf-viewer/core'
import {
  highlightPlugin,
  type RenderHighlightTargetProps,
  type RenderHighlightsProps,
} from '@react-pdf-viewer/highlight'

import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/highlight/lib/styles/index.css'

import {
  Edit3,
  Eye,
  GitCompareArrows,
  Loader2,
  MessageSquare,
  Save,
  Send,
} from 'lucide-react'
import Link from 'next/link'
import { usePopup } from '@/components/ui/PopupProvider'

import { ResearchDocumentStructureEditor } from '@/components/dashboard/research/ResearchDocumentStructureEditor'
import { getVersionLabel } from '@/lib/research/versioning'
import { BackButton } from '@/components/navigation/BackButton'
import { appendFromParam, buildPathWithSearch } from '@/lib/navigation'
import {
  type PdfHighlightArea,
} from './types'
import { AnnotationSidebar } from './components/AnnotationSidebar'
import { CommentComposer } from './components/CommentComposer'
import { useAnnotateResearchData } from './hooks/useAnnotateResearchData'
import { useAnnotateThread } from './hooks/useAnnotateThread'
import { useAnnotateWorkspace } from './hooks/useAnnotateWorkspace'
import { useAnnotateAnnotations, denormalizeArea } from './hooks/useAnnotateAnnotations'
import { useAnnotateHighlights } from './hooks/useAnnotateHighlights'
import { useAnnotateVersionState } from './hooks/useAnnotateVersionState'
import { useAnnotationViewModel } from './hooks/useAnnotationViewModel'


export default function AnnotatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: researchId } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const { confirm, notify } = usePopup()
  const versionParam = searchParams.get('version')
  const selectedVersionNumber = versionParam ? Number(versionParam) : null

  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved')

  const {
    research,
    availableVersions,
    workspaceDrafts,
    annotations,
    setAnnotations,
    fileUrl,
    researchStatus,
    setResearchStatus,
    submissionFormat,
    activeFormat,
    setActiveFormat,
    isLoading,
    loadError,
    currentUserId,
    currentUserRole,
    canTeacherEditPublished,
    loadWorkspaceData,
  } = useAnnotateResearchData({
    supabase,
    router,
    researchId,
    selectedVersionNumber,
  })

  const {
    canReview,
    isAuthor,
    canParticipate,
    latestVersion,
    effectiveVersion,
    effectiveVersionNumber,
    effectiveVersionLabel,
    previousVersion,
    selectedVersionContent,
    editableWorkspaceContent,
    hasPdf,
    hasText,
    canEditTextWorkspace,
  } = useAnnotateVersionState({
    research,
    availableVersions,
    workspaceDrafts,
    currentUserId,
    currentUserRole,
    selectedVersionNumber,
    submissionFormat,
    activeFormat,
    setActiveFormat,
    canTeacherEditPublished,
  })

  const currentPageHref = useMemo(
    () =>
      buildPathWithSearch(`/dashboard/research/${researchId}/annotate`, [
        ['version', selectedVersionNumber ? String(selectedVersionNumber) : null],
        ['from', searchParams.get('from')],
      ]),
    [researchId, searchParams, selectedVersionNumber]
  )
  const {
    viewMode,
    setViewMode,
    selectedAnnotation,
    setSelectedAnnotation,
    activeTextAnnotationId,
    setActiveTextAnnotationId,
    threadReplies,
    setThreadReplies,
    replyText,
    setReplyText,
    isSubmittingReply,
    isLoadingReplies,
    openThread,
    closeThread,
    handleSendReply,
  } = useAnnotateThread({
    supabase,
    annotations,
    hasPdf,
    hasText,
    activeFormat,
    setActiveFormat,
    searchParams,
  })

  const {
    workspaceContent,
    setWorkspaceContent,
    actionFeedback,
    changeSummary,
    setChangeSummary,
    isSavingDraft,
    isSubmittingVersion,
    isSavingReviewEdit,
    isUpdatingDecision,
    handleStudentDraftSave,
    handleStudentSubmit,
    handleTeacherSave,
    handleReviewDecision,
  } = useAnnotateWorkspace({
    researchId,
    editableWorkspaceContent,
    setResearchStatus,
    reloadWorkspaceData: loadWorkspaceData,
  })

  const {
    showCommentBox,
    setShowCommentBox,
    activePdfHighlight,
    setActivePdfHighlight,
    activeTextSelection,
    setActiveTextSelection,
    commentText,
    setCommentText,
    isSubmittingAnnotation,
    deletingAnnotationId,
    closeCommentComposer,
    cancelCommentComposer,
    handleAddAnnotation,
    handleToggleResolve,
    handleDeleteAnnotation,
  } = useAnnotateAnnotations({
    canReview,
    canParticipate,
    researchId,
    effectiveVersion,
    activeFormat,
    annotations,
    setAnnotations,
    selectedAnnotation,
    setSelectedAnnotation,
    threadReplies,
    setThreadReplies,
    setViewMode,
    setFilter,
    confirm,
    notify,
  })

  const {
    registerHighlightRef,
    handleSectionRef,
    handleTextSelection,
    workspaceScrollRef,
  } = useAnnotateHighlights({
    activeFormat,
    annotations,
    canReview,
    canEditTextWorkspace,
    selectedVersionContent,
    workspaceContent,
    selectedAnnotation,
    activeTextAnnotationId,
    setActiveTextAnnotationId,
    setActiveTextSelection,
  })

  const {
    unresolvedAnnotations,
    resolvedAnnotations,
    displayedAnnotations,
    textFeedbackBySection,
  } = useAnnotationViewModel({
    annotations,
    filter,
  })

  const jumpToNextUnresolved = () => {
    const currentIndex = unresolvedAnnotations.findIndex(
      (annotation) => annotation.id === selectedAnnotation?.id
    )
    const nextAnnotation =
      currentIndex >= 0
        ? unresolvedAnnotations[currentIndex + 1] || unresolvedAnnotations[0]
        : unresolvedAnnotations[0]

    if (nextAnnotation) {
      void openThread(nextAnnotation)
    }
  }

  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget: (renderProps: RenderHighlightTargetProps) =>
      canReview ? (
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-lg"
          style={{
            left: `${renderProps.selectionRegion.left}%`,
            top: `${renderProps.selectionRegion.top + renderProps.selectionRegion.height}%`,
            position: 'absolute',
            transform: 'translateY(8px)',
            zIndex: 20,
          }}
          onClick={() => {
            setActivePdfHighlight(renderProps)
            setShowCommentBox(true)
            setActiveTextSelection(null)
          }}
        >
          Add feedback
        </button>
      ) : (
        <></>
      ),
    renderHighlights: (renderProps: RenderHighlightsProps) => (
      <div>
        {annotations
          .filter((annotation) => Array.isArray(annotation.position_data))
          .map((annotation) => (
            <React.Fragment key={annotation.id}>
              {(annotation.position_data as PdfHighlightArea[])
                .filter((area) => area.pageIndex === renderProps.pageIndex)
                .map((area, index) => {
                  const highlightArea = denormalizeArea(area)
                  return (
                    <div
                      key={`${annotation.id}-${index}`}
                      ref={(node) => registerHighlightRef(annotation.id, node)}
                      onClick={() => void openThread(annotation)}
                      className="cursor-pointer rounded"
                      style={{
                        ...renderProps.getCssProperties(highlightArea, renderProps.rotation),
                        background:
                          selectedAnnotation?.id === annotation.id
                            ? 'rgba(37, 99, 235, 0.42)'
                            : annotation.is_resolved
                              ? 'rgba(34, 197, 94, 0.28)'
                              : 'rgba(250, 204, 21, 0.35)',
                        boxShadow:
                          selectedAnnotation?.id === annotation.id
                            ? '0 0 0 2px rgba(37, 99, 235, 0.5)'
                            : 'none',
                      }}
                    />
                  )
                })}
            </React.Fragment>
          ))}
      </div>
    ),
  })

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm font-semibold text-gray-700 shadow-sm">
          <Loader2 size={18} className="animate-spin text-blue-600" />
          Loading unified review workspace...
        </div>
      </div>
    )
  }

  if (loadError || !research) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 px-6">
        <div className="max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <p className="text-lg font-bold text-gray-900">Workspace unavailable</p>
          <p className="mt-2 text-sm text-gray-600">{loadError ?? 'Unable to open this research.'}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-col bg-gray-50">
      <style jsx global>{`
        ::highlight(trackademia-text-feedback-open) {
          background: rgba(250, 204, 21, 0.38);
        }

        ::highlight(trackademia-text-feedback-resolved) {
          background: rgba(34, 197, 94, 0.22);
        }

        ::highlight(trackademia-text-feedback-active) {
          background: rgba(59, 130, 246, 0.4);
        }
      `}</style>
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <BackButton className="rounded-full border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                Unified Review Workspace
              </p>
              <h1 className="text-xl font-bold text-gray-900">{research.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {researchStatus}
                </span>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  {unresolvedAnnotations.length} open
                </span>
                <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                  {resolvedAnnotations.length} resolved
                </span>
                <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                  {activeFormat === 'pdf'
                    ? 'PDF review'
                    : canEditTextWorkspace
                      ? 'Edit + comment'
                      : 'Version view'}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Version {effectiveVersionLabel}
                {effectiveVersion?.created_by_role
                  ? ` • ${effectiveVersion.created_by_role === 'teacher' ? 'Teacher edit' : 'Student submission'}`
                  : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {availableVersions.length > 0 ? (
              <select
                value={String(effectiveVersionNumber)}
                onChange={(event) => {
                  const params = new URLSearchParams(searchParams.toString())
                  params.set('version', event.target.value)
                  router.push(`/dashboard/research/${researchId}/annotate?${params.toString()}`)
                }}
                className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 outline-none"
              >
                {availableVersions.map((version) => (
                  <option key={version.id} value={version.version_number}>
                    Version {getVersionLabel(version)}
                    {version.created_by_role
                      ? ` (${version.created_by_role === 'teacher' ? 'Teacher' : 'Student'})`
                      : ''}
                  </option>
                ))}
              </select>
            ) : null}

            {hasPdf && hasText ? (
              <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setActiveFormat('pdf')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    activeFormat === 'pdf'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormat('text')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    activeFormat === 'text'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Text
                </button>
              </div>
            ) : null}

            <Link
              href={appendFromParam(`/dashboard/research/${researchId}`, currentPageHref)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Eye size={16} />
              Details
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-slate-50/80 px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
            {activeFormat === 'text' && previousVersion ? (
              <Link
                href={appendFromParam(
                  buildPathWithSearch(`/dashboard/research/${researchId}/compare`, [
                    ['base', String(previousVersion.version_number)],
                    ['target', String(effectiveVersionNumber)],
                  ]),
                  currentPageHref
                )}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <GitCompareArrows size={16} />
                Compare with v{getVersionLabel(previousVersion)}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={jumpToNextUnresolved}
              disabled={unresolvedAnnotations.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MessageSquare size={16} />
              Next unresolved
            </button>
            {canReview ? (
              <>
                <button
                  type="button"
                  disabled={isUpdatingDecision}
                  onClick={() => void handleReviewDecision('Revision Requested')}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
                >
                  {isUpdatingDecision ? <Loader2 size={16} className="animate-spin" /> : null}
                  Request revision
                </button>
                <button
                  type="button"
                  disabled={isUpdatingDecision || unresolvedAnnotations.length > 0}
                  onClick={() => void handleReviewDecision('Approved')}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUpdatingDecision ? <Loader2 size={16} className="animate-spin" /> : null}
                  Approve
                </button>
              </>
            ) : null}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm xl:h-[86vh] xl:max-h-[1100px] xl:min-h-[700px]">
        <div className="flex h-full min-h-0 flex-col overflow-hidden xl:flex-row">
        <div className="min-h-0 min-w-0 flex-1 border-b border-gray-200 bg-gray-50 xl:border-b-0 xl:border-r">
        <div ref={workspaceScrollRef} className="h-full overflow-y-auto p-5 xl:p-6">
          <div
            className={`mx-auto flex h-full min-h-full max-w-5xl flex-col space-y-4 ${
              canReview &&
              activeFormat === 'text' &&
              canEditTextWorkspace &&
              activeTextSelection &&
              !showCommentBox
                ? 'pb-16'
                : 'pb-6'
            }`}
          >
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {activeFormat === 'pdf'
                      ? effectiveVersion?.original_file_name || research.original_file_name || 'Attached manuscript.pdf'
                      : 'Teachers and students work in the same manuscript editor, while history stays in version snapshots.'}
                  </p>
                </div>
                {!canEditTextWorkspace && activeFormat === 'text' && latestVersion ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {canReview && research.status === 'Published' && !canTeacherEditPublished
                      ? 'Only the teacher who published this research or its connected advisers can edit the published text workspace.'
                      : `You are viewing Version ${effectiveVersionLabel}. Switch back to the latest version to keep editing.`}
                  </div>
                ) : null}
              </div>

              {activeFormat === 'text' && canEditTextWorkspace ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                      Change Summary
                    </label>
                    <input
                      value={changeSummary}
                      onChange={(event) => setChangeSummary(event.target.value)}
                      placeholder={
                        canReview
                          ? 'Summarize the review edits you made...'
                          : 'Summarize what changed in this draft...'
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    />
                    {actionFeedback ? (
                      <p className="text-sm font-medium text-blue-700">{actionFeedback}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {isAuthor && !canReview ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleStudentDraftSave()}
                          disabled={isSavingDraft}
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                        >
                          {isSavingDraft ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          Save draft
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleStudentSubmit()}
                          disabled={isSubmittingVersion}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                          {isSubmittingVersion ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                          {researchStatus === 'Draft' ? 'Submit for review' : 'Resubmit version'}
                        </button>
                      </>
                    ) : null}
                    {canReview ? (
                      <button
                        type="button"
                        onClick={() => void handleTeacherSave()}
                        disabled={isSavingReviewEdit}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        {isSavingReviewEdit ? <Loader2 size={16} className="animate-spin" /> : <Edit3 size={16} />}
                        Save review edit
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : actionFeedback ? (
                <p className="mt-4 text-sm font-medium text-blue-700">{actionFeedback}</p>
              ) : null}
            </div>

            {activeFormat === 'pdf' ? (
              fileUrl ? (
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                  <div className="flex min-h-[72vh] flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm xl:min-h-0">
                    <div className="flex-1 overflow-y-auto">
                      <Viewer fileUrl={fileUrl} plugins={[highlightPluginInstance]} />
                    </div>
                  </div>
                </Worker>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
                  No PDF is available for this version.
                </div>
              )
            ) : (
              <div className="flex-1 min-h-[72vh] xl:min-h-0 [&_.trackademia-editor]:min-h-[360px]">
                <ResearchDocumentStructureEditor
                  value={canEditTextWorkspace ? workspaceContent : selectedVersionContent}
                  onChange={canEditTextWorkspace ? setWorkspaceContent : undefined}
                  editable={canEditTextWorkspace}
                  onSectionMouseUp={handleTextSelection}
                  onSectionRef={handleSectionRef}
                  sectionFeedback={textFeedbackBySection}
                  activeFeedbackId={activeTextAnnotationId}
                  onFeedbackSelect={(annotationId) => {
                    const annotation = annotations.find((item) => item.id === annotationId)
                    if (annotation) {
                      void openThread(annotation)
                    }
                  }}
                />
              </div>
            )}

            {canReview &&
            activeFormat === 'text' &&
            canEditTextWorkspace &&
            activeTextSelection &&
            !showCommentBox ? (
              <button
                type="button"
                onClick={() => {
                  setActivePdfHighlight(null)
                  setShowCommentBox(true)
                }}
                className="sticky bottom-4 z-20 ml-auto rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
              >
                Add feedback
              </button>
            ) : null}
          </div>
        </div>
        </div>

        <AnnotationSidebar
          viewMode={viewMode}
          filter={filter}
          annotations={annotations}
          unresolvedCount={unresolvedAnnotations.length}
          resolvedCount={resolvedAnnotations.length}
          displayedAnnotations={displayedAnnotations}
          selectedAnnotation={selectedAnnotation}
          canParticipate={canParticipate}
          canReview={canReview}
          deletingAnnotationId={deletingAnnotationId}
          isLoadingReplies={isLoadingReplies}
          threadReplies={threadReplies}
          replyText={replyText}
          isSubmittingReply={isSubmittingReply}
          onFilterChange={setFilter}
          onOpenThread={(annotation) => void openThread(annotation)}
          onCloseThread={closeThread}
          onToggleResolve={(annotationId, currentStatus) =>
            void handleToggleResolve(annotationId, currentStatus)
          }
          onDeleteAnnotation={(annotationId) => void handleDeleteAnnotation(annotationId)}
          onReplyTextChange={setReplyText}
          onSendReply={handleSendReply}
        />
      </div>
      </div>

      <CommentComposer
        open={showCommentBox}
        previewText={
          activeFormat === 'pdf'
            ? activePdfHighlight?.selectedText || ''
            : activeTextSelection?.selectedText || ''
        }
        commentText={commentText}
        isSubmitting={isSubmittingAnnotation}
        onCommentTextChange={setCommentText}
        onClose={closeCommentComposer}
        onCancel={cancelCommentComposer}
        onSave={() => void handleAddAnnotation()}
      />

    </div>
  )
}
