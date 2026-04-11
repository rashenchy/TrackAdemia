import { diffWords } from 'diff'
import {
  getPlainTextFromRichText,
  getResearchDocumentSections,
  normalizeResearchDocumentContent,
} from '@/lib/research/document'

export type VersionDiffPart = {
  value: string
  kind: 'unchanged' | 'added' | 'removed'
}

export type VersionSectionDiff = {
  key: string
  label: string
  oldText: string
  newText: string
  changed: boolean
  oldParts: VersionDiffPart[]
  newParts: VersionDiffPart[]
  changedPartCount: number
}

function normalizeDiffText(value: string) {
  return value.replace(/\r\n/g, '\n')
}

function createSectionParts(
  oldText: string,
  newText: string
): Pick<VersionSectionDiff, 'oldParts' | 'newParts' | 'changedPartCount'> {
  const oldParts: VersionDiffPart[] = []
  const newParts: VersionDiffPart[] = []
  let changedPartCount = 0

  for (const part of diffWords(normalizeDiffText(oldText), normalizeDiffText(newText))) {
    if (part.added) {
      newParts.push({ value: part.value, kind: 'added' })
      changedPartCount += 1
      continue
    }

    if (part.removed) {
      oldParts.push({ value: part.value, kind: 'removed' })
      changedPartCount += 1
      continue
    }

    oldParts.push({ value: part.value, kind: 'unchanged' })
    newParts.push({ value: part.value, kind: 'unchanged' })
  }

  return {
    oldParts,
    newParts,
    changedPartCount,
  }
}

export function buildResearchVersionDiff(
  oldContent: unknown,
  newContent: unknown,
  stage: string | null | undefined
): VersionSectionDiff[] {
  void stage
  const previous = normalizeResearchDocumentContent(oldContent)
  const next = normalizeResearchDocumentContent(newContent)
  const previousSections = getResearchDocumentSections(previous)
  const nextSections = getResearchDocumentSections(next)
  const orderedSections = [
    ...nextSections.map((section) => ({
      key: section.id,
      label: section.title,
      oldSection: previousSections.find((candidate) => candidate.id === section.id) ?? null,
      newSection: section,
    })),
    ...previousSections
      .filter((section) => !nextSections.some((candidate) => candidate.id === section.id))
      .map((section) => ({
        key: section.id,
        label: section.title,
        oldSection: section,
        newSection: null,
      })),
  ]

  return orderedSections.map((section) => {
    const oldText = getPlainTextFromRichText(section.oldSection?.content ?? '')
    const newText = getPlainTextFromRichText(section.newSection?.content ?? '')
    const sectionParts = createSectionParts(oldText, newText)

    return {
      key: section.key,
      label: section.label,
      oldText,
      newText,
      changed: sectionParts.changedPartCount > 0,
      oldParts: sectionParts.oldParts,
      newParts: sectionParts.newParts,
      changedPartCount: sectionParts.changedPartCount,
    }
  })
}
