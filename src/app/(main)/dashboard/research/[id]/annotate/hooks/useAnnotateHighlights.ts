import { useCallback, useEffect, useRef, useState } from 'react'
import {
  findScrollableAncestor,
  getEditorRoot,
  getHighlightConstructor,
  getHighlightRegistry,
  getTextSelectionDetails,
  resolveTextAnnotationRange,
  scrollElementIntoContainer,
} from '../utils/text-annotation'
import { getAnnotationSourceType } from '@/lib/research/annotation-versioning'
import { isTextAnnotationPosition } from '@/lib/research/document'
import { type AnnotationRecord, type TextSelectionDraft } from '../types'

export function useAnnotateHighlights({
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
}: {
  activeFormat: 'pdf' | 'text'
  annotations: AnnotationRecord[]
  canReview: boolean
  canEditTextWorkspace: boolean
  selectedVersionContent: unknown
  workspaceContent: unknown
  selectedAnnotation: AnnotationRecord | null
  activeTextAnnotationId: string | null
  setActiveTextAnnotationId: React.Dispatch<React.SetStateAction<string | null>>
  setActiveTextSelection: React.Dispatch<React.SetStateAction<TextSelectionDraft | null>>
}) {
  const [textHighlightRefreshTick, setTextHighlightRefreshTick] = useState(0)
  const highlightRefs = useRef<Record<string, HTMLElement | null>>({})
  const textAnnotationRangesRef = useRef<Record<string, Range>>({})
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const workspaceScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (activeFormat !== 'text') {
      setActiveTextAnnotationId(null)
      return
    }

    const highlightRegistry = getHighlightRegistry()
    const Highlight = getHighlightConstructor()

    if (!highlightRegistry || !Highlight) return

    const openRanges: Range[] = []
    const resolvedRanges: Range[] = []
    let activeRange: Range | null = null
    const nextRanges: Record<string, Range> = {}

    for (const annotation of annotations) {
      if (!isTextAnnotationPosition(annotation.position_data)) continue

      const editorRoot = getEditorRoot(sectionRefs.current[annotation.position_data.sectionKey])
      if (!editorRoot) continue

      const range = resolveTextAnnotationRange(editorRoot, annotation.position_data)
      if (!range) continue

      nextRanges[annotation.id] = range

      if (annotation.id === activeTextAnnotationId) {
        activeRange = range
      } else if (annotation.is_resolved) {
        resolvedRanges.push(range)
      } else {
        openRanges.push(range)
      }
    }

    textAnnotationRangesRef.current = nextRanges

    if (openRanges.length > 0) {
      highlightRegistry.set('trackademia-text-feedback-open', new Highlight(...openRanges))
    } else {
      highlightRegistry.delete('trackademia-text-feedback-open')
    }

    if (resolvedRanges.length > 0) {
      highlightRegistry.set('trackademia-text-feedback-resolved', new Highlight(...resolvedRanges))
    } else {
      highlightRegistry.delete('trackademia-text-feedback-resolved')
    }

    if (activeRange) {
      highlightRegistry.set('trackademia-text-feedback-active', new Highlight(activeRange))
    } else {
      highlightRegistry.delete('trackademia-text-feedback-active')
    }

    return () => {
      highlightRegistry.delete('trackademia-text-feedback-open')
      highlightRegistry.delete('trackademia-text-feedback-resolved')
      highlightRegistry.delete('trackademia-text-feedback-active')
    }
  }, [
    activeFormat,
    activeTextAnnotationId,
    annotations,
    canEditTextWorkspace,
    selectedVersionContent,
    setActiveTextAnnotationId,
    textHighlightRefreshTick,
    workspaceContent,
  ])

  const registerHighlightRef = (annotationId: string, node: HTMLElement | null) => {
    highlightRefs.current[annotationId] = node
  }

  const scrollToAnnotation = useCallback((annotation: AnnotationRecord) => {
    const annotationSource = getAnnotationSourceType(annotation)

    if (annotationSource === 'text' && isTextAnnotationPosition(annotation.position_data)) {
      const sectionContainer = sectionRefs.current[annotation.position_data.sectionKey]
      const editorRoot = getEditorRoot(sectionContainer)
      const range =
        textAnnotationRangesRef.current[annotation.id] ??
        (editorRoot ? resolveTextAnnotationRange(editorRoot, annotation.position_data) : null)

      if (range) {
        const rect = range.getBoundingClientRect()
        const scrollContainer =
          workspaceScrollRef.current ?? findScrollableAncestor(sectionContainer ?? null)

        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect()
          const targetTop =
            scrollContainer.scrollTop +
            (rect.top - containerRect.top) -
            scrollContainer.clientHeight * 0.28

          scrollContainer.scrollTo({
            top: Math.max(0, targetTop),
            behavior: 'smooth',
          })

          return true
        }

        const targetTop = window.scrollY + rect.top - window.innerHeight * 0.28
        window.scrollTo({
          top: Math.max(0, targetTop),
          behavior: 'smooth',
        })
        return true
      }

      const scrollContainer =
        workspaceScrollRef.current ?? findScrollableAncestor(sectionContainer ?? null)

      if (scrollContainer && sectionContainer) {
        scrollElementIntoContainer(scrollContainer, sectionContainer)
        return true
      }

      return false
    }

    if (annotationSource === 'pdf') {
      const highlightNode = highlightRefs.current[annotation.id]
      if (!highlightNode) return false

      highlightNode.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })

      return true
    }

    return false
  }, [])

  const handleSectionRef = useCallback((sectionId: string, node: HTMLElement | null) => {
    sectionRefs.current[sectionId] = node
  }, [])

  useEffect(() => {
    if (!selectedAnnotation) return

    const annotationSource = getAnnotationSourceType(selectedAnnotation)
    if (annotationSource === 'text' && activeFormat !== 'text') return
    if (annotationSource === 'pdf' && activeFormat !== 'pdf') return

    let frameId = 0
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let cancelled = false
    let attempts = 0

    const tryScroll = () => {
      if (cancelled) return

      const didScroll = scrollToAnnotation(selectedAnnotation)
      if (didScroll || attempts >= 8) return

      attempts += 1
      timeoutId = setTimeout(() => {
        frameId = window.requestAnimationFrame(tryScroll)
      }, 80)
    }

    frameId = window.requestAnimationFrame(tryScroll)

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frameId)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [activeFormat, scrollToAnnotation, selectedAnnotation])

  useEffect(() => {
    if (activeFormat !== 'text') return
    if (!selectedAnnotation || getAnnotationSourceType(selectedAnnotation) !== 'text') return

    const timeouts = [
      window.setTimeout(() => setTextHighlightRefreshTick((current) => current + 1), 0),
      window.setTimeout(() => setTextHighlightRefreshTick((current) => current + 1), 120),
      window.setTimeout(() => setTextHighlightRefreshTick((current) => current + 1), 260),
    ]

    return () => {
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [activeFormat, selectedAnnotation, workspaceContent])

  const handleTextSelection = (sectionKey: string) => {
    if (!canReview || !canEditTextWorkspace) return

    const selection = window.getSelection()
    const sectionContainer = sectionRefs.current[sectionKey]
    const editorRoot = getEditorRoot(sectionContainer)

    if (!selection || selection.rangeCount === 0 || !editorRoot) {
      setActiveTextSelection(null)
      return
    }

    const range = selection.getRangeAt(0)
    if (range.collapsed || !editorRoot.contains(range.commonAncestorContainer)) {
      setActiveTextSelection(null)
      return
    }

    setActiveTextSelection(getTextSelectionDetails(range, editorRoot, sectionKey))
  }

  return {
    registerHighlightRef,
    handleSectionRef,
    handleTextSelection,
    workspaceScrollRef,
    scrollToAnnotation,
  }
}
