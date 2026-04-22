import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearHighlightRegistry,
  ensureHighlightStyles,
  findScrollableAncestor,
  getEditorRoot,
  getHighlightConstructorForDocument,
  getHighlightRegistryForDocument,
  getRangeViewportRect,
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
  const selectionFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (activeFormat !== 'text') {
      setActiveTextAnnotationId(null)
      return
    }

    const openRanges: Range[] = []
    const resolvedRanges: Range[] = []
    let activeRange: Range | null = null
    const nextRanges: Record<string, Range> = {}
    const touchedDocuments = new Set<Document>()

    for (const annotation of annotations) {
      if (!isTextAnnotationPosition(annotation.position_data)) continue

      const editorRoot = getEditorRoot(sectionRefs.current[annotation.position_data.sectionKey])
      if (!editorRoot) continue

      const range = resolveTextAnnotationRange(editorRoot, annotation.position_data)
      if (!range) continue

      touchedDocuments.add(range.startContainer.ownerDocument)
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

    for (const doc of touchedDocuments) {
      const highlightRegistry = getHighlightRegistryForDocument(doc)
      const Highlight = getHighlightConstructorForDocument(doc)

      if (!highlightRegistry || !Highlight) {
        continue
      }

      ensureHighlightStyles(doc)
      clearHighlightRegistry(doc)

      const docOpenRanges = openRanges.filter((range) => range.startContainer.ownerDocument === doc)
      const docResolvedRanges = resolvedRanges.filter(
        (range) => range.startContainer.ownerDocument === doc
      )
      const docActiveRange =
        activeRange?.startContainer.ownerDocument === doc ? activeRange : null

      if (docOpenRanges.length > 0) {
        highlightRegistry.set('trackademia-text-feedback-open', new Highlight(...docOpenRanges))
      }

      if (docResolvedRanges.length > 0) {
        highlightRegistry.set(
          'trackademia-text-feedback-resolved',
          new Highlight(...docResolvedRanges)
        )
      }

      if (docActiveRange) {
        highlightRegistry.set('trackademia-text-feedback-active', new Highlight(docActiveRange))
      }
    }

    return () => {
      touchedDocuments.forEach((doc) => clearHighlightRegistry(doc))
    }
  }, [
    activeFormat,
    activeTextAnnotationId,
    annotations,
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
        const rect = getRangeViewportRect(range)
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

  useEffect(() => {
    return () => {
      if (selectionFrameRef.current != null) {
        window.cancelAnimationFrame(selectionFrameRef.current)
      }
    }
  }, [])

  const handleTextSelection = useCallback(
    (sectionKey: string) => {
      if (!canReview) return

      if (selectionFrameRef.current != null) {
        window.cancelAnimationFrame(selectionFrameRef.current)
      }

      selectionFrameRef.current = window.requestAnimationFrame(() => {
        const sectionContainer = sectionRefs.current[sectionKey]
        const editorRoot = getEditorRoot(sectionContainer)
        const selection =
          editorRoot?.ownerDocument.defaultView?.getSelection() ?? window.getSelection()

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
      })
    },
    [canReview, setActiveTextSelection]
  )

  return {
    registerHighlightRef,
    handleSectionRef,
    handleTextSelection,
    workspaceScrollRef,
    scrollToAnnotation,
  }
}
