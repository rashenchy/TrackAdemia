import {
  getPlainTextFromRichText,
  getResearchDocumentSections,
  isTextAnnotationPosition,
  normalizeResearchDocumentContent,
  type ResearchDocumentContent,
} from '@/lib/research/document'

export type StudentChangeInput = {
  changedAt: string
  content: unknown
  source: 'draft' | 'version'
}

export type AnnotationResolveEligibility = {
  canResolve: boolean
  reason: string | null
}

function normalizeComparableText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function getSectionPlainText(
  content: unknown,
  sectionKey: string
) {
  const normalized = normalizeResearchDocumentContent(content)
  const section = getResearchDocumentSections(normalized).find(
    (candidate) => candidate.id === sectionKey
  )

  return normalizeComparableText(getPlainTextFromRichText(section?.content ?? ''))
}

/**
 * Evaluates whether a student author has made qualifying changes after an annotation was created.
 */
export function evaluateStudentAnnotationResolveEligibility({
  annotationCreatedAt,
  positionData,
  annotatedVersionContent,
  studentChanges,
}: {
  annotationCreatedAt: string
  positionData: unknown
  annotatedVersionContent?: unknown
  studentChanges: StudentChangeInput[]
}): AnnotationResolveEligibility {
  const qualifyingChanges = studentChanges.filter(
    (change) => Boolean(change.changedAt) && change.changedAt > annotationCreatedAt
  )

  if (qualifyingChanges.length === 0) {
    return {
      canResolve: false,
      reason:
        'You need to save or submit changes to your manuscript before marking this feedback as resolved.',
    }
  }

  if (!isTextAnnotationPosition(positionData)) {
    const hasNewStudentVersion = qualifyingChanges.some((change) => change.source === 'version')

    if (!hasNewStudentVersion) {
      return {
        canResolve: false,
        reason: 'PDF feedback can only be resolved after you submit a newer student version.',
      }
    }

    return { canResolve: true, reason: null }
  }

  const latestTextChange = [...qualifyingChanges]
    .filter((change) => Boolean(change.content))
    .sort((first, second) => second.changedAt.localeCompare(first.changedAt))[0]

  if (!latestTextChange) {
    return {
      canResolve: false,
      reason: 'Text feedback can only be resolved after you save or submit editor changes.',
    }
  }

  const previousSectionText = getSectionPlainText(
    annotatedVersionContent,
    positionData.sectionKey
  )
  const currentSectionText = getSectionPlainText(
    latestTextChange.content,
    positionData.sectionKey
  )

  if (!currentSectionText || previousSectionText === currentSectionText) {
    return {
      canResolve: false,
      reason:
        'Update the annotated section in the manuscript editor before marking this feedback as resolved.',
    }
  }

  return { canResolve: true, reason: null }
}
