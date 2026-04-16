import { useMemo } from 'react'
import { getAnnotationSourceType } from '@/lib/research/annotation-versioning'
import { isTextAnnotationPosition } from '@/lib/research/document'
import { type AnnotateFilter, type AnnotationRecord } from '../types'

export function useAnnotationViewModel({
  annotations,
  filter,
}: {
  annotations: AnnotationRecord[]
  filter: AnnotateFilter
}) {
  const unresolvedAnnotations = useMemo(
    () => annotations.filter((annotation) => !annotation.is_resolved),
    [annotations]
  )
  const resolvedAnnotations = useMemo(
    () => annotations.filter((annotation) => annotation.is_resolved),
    [annotations]
  )

  const displayedAnnotations = useMemo(() => {
    let filtered = annotations

    if (filter === 'unresolved') {
      filtered = unresolvedAnnotations
    } else if (filter === 'resolved') {
      filtered = resolvedAnnotations
    }

    return [...filtered].sort((first, second) => {
      if (first.is_resolved !== second.is_resolved) {
        return first.is_resolved ? 1 : -1
      }

      const firstSource = getAnnotationSourceType(first)
      const secondSource = getAnnotationSourceType(second)

      if (firstSource === 'text' && secondSource === 'text') {
        const firstOffset = isTextAnnotationPosition(first.position_data)
          ? first.position_data.startOffset
          : 0
        const secondOffset = isTextAnnotationPosition(second.position_data)
          ? second.position_data.startOffset
          : 0
        return firstOffset - secondOffset
      }

      if (firstSource === 'pdf' && secondSource === 'pdf') {
        const pageA = Array.isArray(first.position_data)
          ? Number(
              (first.position_data[0] as { pageIndex?: number } | undefined)?.pageIndex ?? 0
            )
          : 0
        const pageB = Array.isArray(second.position_data)
          ? Number(
              (second.position_data[0] as { pageIndex?: number } | undefined)?.pageIndex ?? 0
            )
          : 0

        return pageA - pageB
      }

      return new Date(first.created_at).getTime() - new Date(second.created_at).getTime()
    })
  }, [annotations, filter, resolvedAnnotations, unresolvedAnnotations])

  const textFeedbackBySection = useMemo(() => {
    return annotations.reduce<
      Record<string, Array<{ id: string; commentText: string; isResolved: boolean }>>
    >((accumulator, annotation) => {
      if (!isTextAnnotationPosition(annotation.position_data)) {
        return accumulator
      }

      const sectionKey = annotation.position_data.sectionKey

      if (!accumulator[sectionKey]) {
        accumulator[sectionKey] = []
      }

      accumulator[sectionKey].push({
        id: annotation.id,
        commentText: annotation.comment_text,
        isResolved: annotation.is_resolved,
      })

      return accumulator
    }, {})
  }, [annotations])

  return {
    unresolvedAnnotations,
    resolvedAnnotations,
    displayedAnnotations,
    textFeedbackBySection,
  }
}
