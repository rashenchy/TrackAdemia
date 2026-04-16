import { useState } from 'react'
import { type RenderHighlightTargetProps } from '@react-pdf-viewer/highlight'
import {
  addAnnotation,
  deleteAnnotation,
  toggleAnnotationResolved,
} from '../actions'
import {
  type AnnotationRecord,
  type PdfHighlightArea,
  type ReplyRecord,
  type TextSelectionDraft,
  type VersionSnapshot,
} from '../types'

type ConfirmFn = (options: {
  title: string
  message: string
  confirmLabel: string
  variant?: 'danger'
}) => Promise<boolean>

type NotifyFn = (options: {
  title: string
  message: string
  variant: 'success' | 'error'
}) => void

function normalizeAreas(areas: PdfHighlightArea[]) {
  return areas.map((area) => ({
    pageIndex: area.pageIndex,
    top: area.top / 100,
    left: area.left / 100,
    width: area.width / 100,
    height: area.height / 100,
  }))
}

export function denormalizeArea(area: PdfHighlightArea) {
  return {
    ...area,
    top: area.top * 100,
    left: area.left * 100,
    width: area.width * 100,
    height: area.height * 100,
  }
}

export function useAnnotateAnnotations({
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
}: {
  canReview: boolean
  canParticipate: boolean
  researchId: string
  effectiveVersion: VersionSnapshot | null
  activeFormat: 'pdf' | 'text'
  annotations: AnnotationRecord[]
  setAnnotations: React.Dispatch<React.SetStateAction<AnnotationRecord[]>>
  selectedAnnotation: AnnotationRecord | null
  setSelectedAnnotation: React.Dispatch<React.SetStateAction<AnnotationRecord | null>>
  threadReplies: ReplyRecord[]
  setThreadReplies: React.Dispatch<React.SetStateAction<ReplyRecord[]>>
  setViewMode: React.Dispatch<React.SetStateAction<'list' | 'thread'>>
  setFilter: React.Dispatch<React.SetStateAction<'all' | 'unresolved' | 'resolved'>>
  confirm: ConfirmFn
  notify: NotifyFn
}) {
  const [showCommentBox, setShowCommentBox] = useState(false)
  const [activePdfHighlight, setActivePdfHighlight] = useState<RenderHighlightTargetProps | null>(
    null
  )
  const [activeTextSelection, setActiveTextSelection] = useState<TextSelectionDraft | null>(null)
  const [commentText, setCommentText] = useState('')
  const [isSubmittingAnnotation, setIsSubmittingAnnotation] = useState(false)
  const [deletingAnnotationId, setDeletingAnnotationId] = useState<string | null>(null)

  const closeCommentComposer = () => {
    setShowCommentBox(false)
    setCommentText('')
    setActivePdfHighlight(null)
    setActiveTextSelection(null)
  }

  const cancelCommentComposer = () => {
    setShowCommentBox(false)
    setCommentText('')
  }

  const handleAddAnnotation = async () => {
    if (!canReview || !commentText.trim()) return

    setIsSubmittingAnnotation(true)

    try {
      if (activeFormat === 'pdf') {
        if (!activePdfHighlight?.selectedText || !activePdfHighlight.highlightAreas.length) return

        const saved = await addAnnotation(
          researchId,
          effectiveVersion,
          {
            selectedText: activePdfHighlight.selectedText,
            highlightAreas: normalizeAreas(activePdfHighlight.highlightAreas as PdfHighlightArea[]),
          },
          commentText
        )

        setAnnotations((current) => [...current, saved as AnnotationRecord])
      } else {
        if (!activeTextSelection?.selectedText) return

        const saved = await addAnnotation(
          researchId,
          effectiveVersion,
          {
            selectedText: activeTextSelection.selectedText,
            highlightAreas: {
              type: 'text',
              sectionKey: activeTextSelection.sectionKey,
              selectedText: activeTextSelection.selectedText,
              prefixText: activeTextSelection.prefixText,
              suffixText: activeTextSelection.suffixText,
              startOffset: activeTextSelection.startOffset,
              endOffset: activeTextSelection.endOffset,
            },
          },
          commentText
        )

        setAnnotations((current) => [...current, saved as AnnotationRecord])
      }

      closeCommentComposer()
      setFilter('unresolved')
    } finally {
      setIsSubmittingAnnotation(false)
    }
  }

  const handleToggleResolve = async (annotationId: string, currentStatus: boolean) => {
    if (!canParticipate) return

    if (!currentStatus) {
      const confirmed = await confirm({
        title: 'Mark feedback as resolved?',
        message: 'This feedback thread will move to resolved once you confirm.',
        confirmLabel: 'Resolve feedback',
      })

      if (!confirmed) return
    }

    setAnnotations((current) =>
      current.map((annotation) =>
        annotation.id === annotationId
          ? { ...annotation, is_resolved: !currentStatus }
          : annotation
      )
    )

    if (selectedAnnotation?.id === annotationId) {
      setSelectedAnnotation((current) =>
        current ? { ...current, is_resolved: !currentStatus } : current
      )
    }

    try {
      await toggleAnnotationResolved(annotationId, !currentStatus)
    } catch (error) {
      setAnnotations((current) =>
        current.map((annotation) =>
          annotation.id === annotationId
            ? { ...annotation, is_resolved: currentStatus }
            : annotation
        )
      )

      if (selectedAnnotation?.id === annotationId) {
        setSelectedAnnotation((current) =>
          current ? { ...current, is_resolved: currentStatus } : current
        )
      }

      notify({
        title: 'Update failed',
        message:
          error instanceof Error
            ? error.message
            : 'We could not update this feedback item right now. Please try again.',
        variant: 'error',
      })
    }
  }

  const handleDeleteAnnotation = async (annotationId: string) => {
    if (!canReview || deletingAnnotationId) return

    const confirmed = await confirm({
      title: 'Delete this feedback?',
      message:
        'This will permanently remove the annotation and its replies. Use this only for feedback that was added by mistake.',
      confirmLabel: 'Delete feedback',
      variant: 'danger',
    })

    if (!confirmed) return

    const previousAnnotations = annotations
    const previousSelectedAnnotation = selectedAnnotation
    const previousReplies = threadReplies

    setDeletingAnnotationId(annotationId)
    setAnnotations((current) => current.filter((annotation) => annotation.id !== annotationId))

    if (selectedAnnotation?.id === annotationId) {
      setSelectedAnnotation(null)
      setThreadReplies([])
      setViewMode('list')
    }

    try {
      await deleteAnnotation(annotationId)
      notify({
        title: 'Feedback deleted',
        message: 'The annotation has been removed.',
        variant: 'success',
      })
    } catch {
      setAnnotations(previousAnnotations)
      setSelectedAnnotation(previousSelectedAnnotation)
      setThreadReplies(previousReplies)
      if (previousSelectedAnnotation?.id === annotationId) {
        setViewMode('thread')
      }
      notify({
        title: 'Delete failed',
        message: 'We could not delete this feedback item right now. Please try again.',
        variant: 'error',
      })
    } finally {
      setDeletingAnnotationId(null)
    }
  }

  return {
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
  }
}
