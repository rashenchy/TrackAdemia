import { diffLines, diffWordsWithSpace } from 'diff'
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

export type VersionDiffLine = {
  key: string
  type: 'unchanged' | 'modified' | 'added' | 'removed'
  oldLineNumber: number | null
  newLineNumber: number | null
  oldText: string
  newText: string
  oldParts: VersionDiffPart[]
  newParts: VersionDiffPart[]
}

export type VersionSectionDiff = {
  key: keyof ResearchDocumentContent
  label: string
  oldText: string
  newText: string
  changed: boolean
  lines: VersionDiffLine[]
  changedLineCount: number
}

function normalizeDiffText(value: string) {
  return value.replace(/\r\n/g, '\n')
}

function splitLines(value: string) {
  const normalizedValue = normalizeDiffText(value)

  if (!normalizedValue) {
    return [] as string[]
  }

  const lines = normalizedValue.split('\n')

  if (normalizedValue.endsWith('\n')) {
    lines.pop()
  }

  return lines
}

function createInlineParts(
  oldLine: string,
  newLine: string
): Pick<VersionDiffLine, 'oldParts' | 'newParts'> {
  const oldParts: VersionDiffPart[] = []
  const newParts: VersionDiffPart[] = []

  for (const part of diffWordsWithSpace(oldLine, newLine)) {
    if (part.added) {
      newParts.push({ value: part.value, kind: 'added' })
      continue
    }

    if (part.removed) {
      oldParts.push({ value: part.value, kind: 'removed' })
      continue
    }

    oldParts.push({ value: part.value, kind: 'unchanged' })
    newParts.push({ value: part.value, kind: 'unchanged' })
  }

  return {
    oldParts,
    newParts,
  }
}

function createSingleSidedParts(
  value: string,
  kind: Extract<VersionDiffPart['kind'], 'added' | 'removed'>
) {
  return value ? [{ value, kind }] : []
}

function alignSectionLines(oldText: string, newText: string): VersionDiffLine[] {
  const lines: VersionDiffLine[] = []
  const blocks = diffLines(normalizeDiffText(oldText), normalizeDiffText(newText))

  let oldLineNumber = 1
  let newLineNumber = 1

  for (let index = 0; index < blocks.length; index += 1) {
    const currentBlock = blocks[index]
    const currentLines = splitLines(currentBlock.value)

    if (currentBlock.removed && blocks[index + 1]?.added) {
      const nextBlock = blocks[index + 1]
      const nextLines = splitLines(nextBlock.value)
      const pairCount = Math.max(currentLines.length, nextLines.length)

      for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
        const oldLine = currentLines[pairIndex]
        const newLine = nextLines[pairIndex]

        if (oldLine != null && newLine != null) {
          const inlineParts = createInlineParts(oldLine, newLine)

          lines.push({
            key: `modified-${oldLineNumber}-${newLineNumber}`,
            type: 'modified',
            oldLineNumber,
            newLineNumber,
            oldText: oldLine,
            newText: newLine,
            oldParts: inlineParts.oldParts,
            newParts: inlineParts.newParts,
          })

          oldLineNumber += 1
          newLineNumber += 1
          continue
        }

        if (oldLine != null) {
          lines.push({
            key: `removed-${oldLineNumber}-${newLineNumber}`,
            type: 'removed',
            oldLineNumber,
            newLineNumber: null,
            oldText: oldLine,
            newText: '',
            oldParts: createSingleSidedParts(oldLine, 'removed'),
            newParts: [],
          })

          oldLineNumber += 1
          continue
        }

        if (newLine != null) {
          lines.push({
            key: `added-${oldLineNumber}-${newLineNumber}`,
            type: 'added',
            oldLineNumber: null,
            newLineNumber,
            oldText: '',
            newText: newLine,
            oldParts: [],
            newParts: createSingleSidedParts(newLine, 'added'),
          })

          newLineNumber += 1
        }
      }

      index += 1
      continue
    }

    if (currentBlock.removed) {
      for (const oldLine of currentLines) {
        lines.push({
          key: `removed-${oldLineNumber}-${newLineNumber}`,
          type: 'removed',
          oldLineNumber,
          newLineNumber: null,
          oldText: oldLine,
          newText: '',
          oldParts: createSingleSidedParts(oldLine, 'removed'),
          newParts: [],
        })

        oldLineNumber += 1
      }

      continue
    }

    if (currentBlock.added) {
      for (const newLine of currentLines) {
        lines.push({
          key: `added-${oldLineNumber}-${newLineNumber}`,
          type: 'added',
          oldLineNumber: null,
          newLineNumber,
          oldText: '',
          newText: newLine,
          oldParts: [],
          newParts: createSingleSidedParts(newLine, 'added'),
        })

        newLineNumber += 1
      }

      continue
    }

    for (const line of currentLines) {
      const inlineParts = createInlineParts(line, line)

      lines.push({
        key: `unchanged-${oldLineNumber}-${newLineNumber}`,
        type: 'unchanged',
        oldLineNumber,
        newLineNumber,
        oldText: line,
        newText: line,
        oldParts: inlineParts.oldParts,
        newParts: inlineParts.newParts,
      })

      oldLineNumber += 1
      newLineNumber += 1
    }
  }

  if (lines.length === 0) {
    return [
      {
        key: 'empty',
        type: 'unchanged',
        oldLineNumber: null,
        newLineNumber: null,
        oldText: '',
        newText: '',
        oldParts: [],
        newParts: [],
      },
    ]
  }

  return lines
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
    const lines = alignSectionLines(oldText, newText)

    return {
      key: section.key,
      label: getResearchSectionLabel(section.key),
      oldText,
      newText,
      changed: oldText !== newText,
      lines,
      changedLineCount: lines.filter((line) => line.type !== 'unchanged').length,
    }
  })
}
