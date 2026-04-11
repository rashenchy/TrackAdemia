import { diffWords } from 'diff'
import {
  getPlainTextFromRichText,
  getResearchEditorSectionsForStage,
  getResearchSectionLabel,
  normalizeResearchDocumentContent,
  type ResearchDocumentContent,
} from '@/lib/research/document'

export type VersionDiffPart = {
  value: string
  kind: 'unchanged' | 'added' | 'removed'
}

export type VersionSectionDiff = {
  key: keyof ResearchDocumentContent
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
  const previous = normalizeResearchDocumentContent(oldContent)
  const next = normalizeResearchDocumentContent(newContent)

  return getResearchEditorSectionsForStage(stage).map((section) => {
    const oldText = getPlainTextFromRichText(previous[section.key])
    const newText = getPlainTextFromRichText(next[section.key])
    const sectionParts = createSectionParts(oldText, newText)

    return {
      key: section.key,
      label: getResearchSectionLabel(section.key),
      oldText,
      newText,
      changed: sectionParts.changedPartCount > 0,
      oldParts: sectionParts.oldParts,
      newParts: sectionParts.newParts,
      changedPartCount: sectionParts.changedPartCount,
    }
  })
}
