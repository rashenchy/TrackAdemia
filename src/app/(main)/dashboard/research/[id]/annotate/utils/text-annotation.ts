import {
  type HighlightConstructor,
  type HighlightRegistryLike,
  type TextAnnotationPosition,
  type TextSelectionDraft,
} from '../types'

const HIGHLIGHT_STYLE_ID = 'trackademia-text-highlight-styles'

export function getTextSelectionDetails(
  selectionRange: Range,
  container: HTMLElement,
  sectionKey: string
): TextSelectionDraft | null {
  const selectedText = selectionRange.toString().replace(/\s+/g, ' ').trim()

  if (!selectedText) return null

  const startOffset = getOffsetWithinSection(container, selectionRange, 'start')
  if (startOffset == null) return null
  const endOffset = startOffset + selectionRange.toString().length
  const fullText = getSectionTextContent(container)

  const selectionRect = selectionRange.getBoundingClientRect()
  const ownerWindow = selectionRange.startContainer.ownerDocument.defaultView
  const frameElement = ownerWindow?.frameElement
  const frameRect =
    frameElement instanceof HTMLElement ? frameElement.getBoundingClientRect() : null
  const x = frameRect
    ? frameRect.left + selectionRect.left + selectionRect.width / 2 + window.scrollX
    : selectionRect.left + selectionRect.width / 2 + window.scrollX
  const y = frameRect
    ? frameRect.top + selectionRect.bottom + window.scrollY
    : selectionRect.bottom + window.scrollY

  return {
    type: 'text',
    sectionKey,
    sectionTitle:
      container.querySelector('[data-document-section-title="true"]')?.textContent?.trim() ||
      undefined,
    selectedText,
    prefixText: fullText.slice(Math.max(0, startOffset - 40), startOffset),
    suffixText: fullText.slice(endOffset, Math.min(fullText.length, endOffset + 40)),
    startOffset,
    endOffset,
    x,
    y,
  }
}

function getAnnotationTextRoots(container: HTMLElement) {
  const roots = Array.from(
    container.querySelectorAll<HTMLElement>('[data-annotation-text-root="true"]')
  )

  return roots.length > 0 ? roots : [container]
}

function getSectionTextContent(container: HTMLElement) {
  return getAnnotationTextRoots(container)
    .map((root) => root.innerText || '')
    .join('')
}

function getOffsetWithinSection(
  container: HTMLElement,
  selectionRange: Range,
  edge: 'start' | 'end'
) {
  const roots = getAnnotationTextRoots(container)
  let totalOffset = 0

  for (const root of roots) {
    const boundaryNode =
      edge === 'start' ? selectionRange.startContainer : selectionRange.endContainer

    if (!root.contains(boundaryNode)) {
      totalOffset += root.innerText.length
      continue
    }

    const beforeRange = selectionRange.cloneRange()
    beforeRange.selectNodeContents(root)

    if (edge === 'start') {
      beforeRange.setEnd(selectionRange.startContainer, selectionRange.startOffset)
    } else {
      beforeRange.setEnd(selectionRange.endContainer, selectionRange.endOffset)
    }

    return totalOffset + beforeRange.toString().length
  }

  return null
}

function buildTextRangeFromOffsets(
  container: HTMLElement,
  startOffset: number,
  endOffset: number
) {
  const roots = getAnnotationTextRoots(container)
  let cumulativeOffset = 0

  for (const root of roots) {
    const rootTextLength = (root.innerText || '').length
    const rootStartOffset = cumulativeOffset
    const rootEndOffset = cumulativeOffset + rootTextLength

    if (endOffset <= rootStartOffset || startOffset > rootEndOffset) {
      cumulativeOffset = rootEndOffset
      continue
    }

    const localStart = Math.max(0, startOffset - rootStartOffset)
    const localEnd = Math.min(rootTextLength, endOffset - rootStartOffset)
    const range = buildTextRangeWithinRoot(root, localStart, localEnd)

    if (range) {
      return range
    }

    cumulativeOffset = rootEndOffset
  }

  return null
}

function buildTextRangeWithinRoot(
  root: HTMLElement,
  startOffset: number,
  endOffset: number
) {
  const doc = root.ownerDocument
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let currentOffset = 0
  let startNode: Node | null = null
  let endNode: Node | null = null
  let startNodeOffset = 0
  let endNodeOffset = 0

  while (walker.nextNode()) {
    const node = walker.currentNode
    const textLength = node.textContent?.length ?? 0
    const nextOffset = currentOffset + textLength

    if (!startNode && startOffset <= nextOffset) {
      startNode = node
      startNodeOffset = Math.max(0, startOffset - currentOffset)
    }

    if (!endNode && endOffset <= nextOffset) {
      endNode = node
      endNodeOffset = Math.max(0, endOffset - currentOffset)
      break
    }

    currentOffset = nextOffset
  }

  if (!startNode || !endNode) {
    return null
  }

  const range = doc.createRange()
  range.setStart(startNode, startNodeOffset)
  range.setEnd(endNode, endNodeOffset)
  return range
}

export function getEditorRoot(container: HTMLElement | null) {
  if (!container) return null

  const iframe = container.querySelector('iframe')
  if (iframe?.contentDocument?.body) {
    return iframe.contentDocument.body
  }

  return container
}

export function getRangeViewportRect(range: Range) {
  const rect = range.getBoundingClientRect()
  const ownerWindow = range.startContainer.ownerDocument.defaultView
  const frameElement = ownerWindow?.frameElement

  if (!(frameElement instanceof HTMLElement)) {
    return rect
  }

  const frameRect = frameElement.getBoundingClientRect()

  return {
    top: frameRect.top + rect.top,
    right: frameRect.left + rect.right,
    bottom: frameRect.top + rect.bottom,
    left: frameRect.left + rect.left,
    width: rect.width,
    height: rect.height,
    x: frameRect.left + rect.x,
    y: frameRect.top + rect.y,
    toJSON: () => rect.toJSON(),
  } satisfies DOMRect
}

export function findScrollableAncestor(node: HTMLElement | null) {
  let current = node?.parentElement ?? null

  while (current) {
    const styles = window.getComputedStyle(current)
    const overflowY = styles.overflowY
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight
    ) {
      return current
    }
    current = current.parentElement
  }

  return null
}

export function scrollElementIntoContainer(
  container: HTMLElement,
  element: HTMLElement,
  alignRatio = 0.24
) {
  const containerRect = container.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  const targetTop =
    container.scrollTop +
    (elementRect.top - containerRect.top) -
    container.clientHeight * alignRatio

  container.scrollTo({
    top: Math.max(0, targetTop),
    behavior: 'smooth',
  })

  return {
    containerRect,
    elementRect,
    targetTop,
  }
}

function normalizeComparableText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function resolveTextAnnotationRange(
  container: HTMLElement,
  position: TextAnnotationPosition
) {
  const directRange = buildTextRangeFromOffsets(
    container,
    position.startOffset,
    position.endOffset
  )
  const directRangeText = directRange?.toString() ?? ''

  if (
    directRange &&
    normalizeComparableText(directRangeText) === normalizeComparableText(position.selectedText)
  ) {
    return directRange
  }

  const fullText = getSectionTextContent(container)
  const matches: number[] = []
  let cursor = 0

  while (cursor <= fullText.length) {
    const foundIndex = fullText.indexOf(position.selectedText, cursor)
    if (foundIndex === -1) break
    matches.push(foundIndex)
    cursor = foundIndex + Math.max(position.selectedText.length, 1)
  }

  if (matches.length === 0) {
    return directRange
  }

  const scoredMatches = matches
    .map((startOffset) => {
      const endOffset = startOffset + position.selectedText.length
      const prefix = fullText.slice(
        Math.max(0, startOffset - position.prefixText.length),
        startOffset
      )
      const suffix = fullText.slice(endOffset, endOffset + position.suffixText.length)
      const score =
        (normalizeComparableText(prefix) === normalizeComparableText(position.prefixText)
          ? 3
          : 0) +
        (normalizeComparableText(suffix) === normalizeComparableText(position.suffixText)
          ? 3
          : 0) +
        Math.max(0, 2 - Math.min(Math.abs(startOffset - position.startOffset), 2))

      return { startOffset, endOffset, score }
    })
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score
      }

      return (
        Math.abs(first.startOffset - position.startOffset) -
        Math.abs(second.startOffset - position.startOffset)
      )
    })

  const bestMatch = scoredMatches[0]
  return buildTextRangeFromOffsets(container, bestMatch.startOffset, bestMatch.endOffset)
}

export function ensureHighlightStyles(doc: Document) {
  if (doc.getElementById(HIGHLIGHT_STYLE_ID)) {
    return
  }

  const style = doc.createElement('style')
  style.id = HIGHLIGHT_STYLE_ID
  style.textContent = `
    ::highlight(trackademia-text-feedback-open) {
      background: rgba(250, 204, 21, 0.38);
    }

    ::highlight(trackademia-text-feedback-resolved) {
      background: rgba(34, 197, 94, 0.22);
    }

    ::highlight(trackademia-text-feedback-active) {
      background: rgba(59, 130, 246, 0.4);
    }
  `

  doc.head.appendChild(style)
}

export function getHighlightRegistryForDocument(doc: Document) {
  return (
    (doc.defaultView as typeof globalThis & {
      CSS?: {
        highlights?: HighlightRegistryLike
      }
    } | null)?.CSS?.highlights ?? null
  )
}

export function getHighlightConstructorForDocument(doc: Document) {
  return (
    (doc.defaultView as typeof globalThis & {
      Highlight?: HighlightConstructor
    } | null)?.Highlight ?? null
  )
}

export function clearHighlightRegistry(doc: Document) {
  const highlightRegistry = getHighlightRegistryForDocument(doc)
  if (!highlightRegistry) {
    return
  }

  highlightRegistry.delete('trackademia-text-feedback-open')
  highlightRegistry.delete('trackademia-text-feedback-resolved')
  highlightRegistry.delete('trackademia-text-feedback-active')
}
