import { diffWordsWithSpace } from 'diff'
import {
  getPlainTextFromRichText,
  getResearchEditorSectionsForStage,
  getResearchSectionLabel,
  normalizeResearchDocumentContent,
  type ResearchDocumentContent,
} from '@/lib/research/document'

export type VersionDiffPart = {
  value: string
  added?: boolean
  removed?: boolean
}

export type VersionSectionDiff = {
  key: keyof ResearchDocumentContent
  label: string
  oldText: string
  newText: string
  changed: boolean
  parts: VersionDiffPart[]
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
    const parts = diffWordsWithSpace(oldText, newText).map((part) => ({
      value: part.value,
      added: part.added,
      removed: part.removed,
    }))

    return {
      key: section.key,
      label: getResearchSectionLabel(section.key),
      oldText,
      newText,
      changed: oldText !== newText,
      parts,
    }
  })
}
