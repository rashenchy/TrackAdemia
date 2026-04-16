import { getResearchSectionLabel, isTextAnnotationPosition } from '@/lib/research/document'
import { type AnnotationRecord } from '../types'

export function summarizeQuote(text: string, maxLength = 120) {
  if (!text) return ''
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, maxLength)}...`
}

export function getAnnotationLocationLabel(annotation: AnnotationRecord) {
  if (isTextAnnotationPosition(annotation.position_data)) {
    return (
      annotation.position_data.sectionTitle ||
      getResearchSectionLabel(annotation.position_data.sectionKey)
    )
  }

  if (Array.isArray(annotation.position_data)) {
    const pageIndex =
      annotation.position_data[0] &&
      typeof annotation.position_data[0] === 'object' &&
      annotation.position_data[0] !== null &&
      'pageIndex' in annotation.position_data[0]
        ? Number((annotation.position_data[0] as { pageIndex?: number }).pageIndex)
        : 0

    return `Page ${pageIndex + 1}`
  }

  return 'Document'
}
