export const RESEARCH_STAGE_OPTIONS = [
  'Proposal',
  'Chapter 1-3',
  'Final Manuscript',
] as const

export type ResearchStage = (typeof RESEARCH_STAGE_OPTIONS)[number]

export const RESEARCH_SUBMISSION_FORMAT_OPTIONS = [
  {
    value: 'pdf',
    label: 'PDF only',
    description: 'Upload a manuscript PDF without the editor-based submission.',
  },
  {
    value: 'text',
    label: 'Editor only',
    description: 'Write and submit your manuscript inside the built-in section editor.',
  },
  {
    value: 'both',
    label: 'PDF + editor',
    description: 'Submit both formats and switch between them during review.',
  },
] as const

export type ResearchSubmissionFormat =
  (typeof RESEARCH_SUBMISSION_FORMAT_OPTIONS)[number]['value']

export const RESEARCH_EDITOR_SECTION_DEFINITIONS = [
  { key: 'abstract', label: 'Abstract' },
  { key: 'chapter1', label: 'Chapter 1' },
  { key: 'chapter2', label: 'Chapter 2' },
  { key: 'chapter3', label: 'Chapter 3' },
  { key: 'chapter4', label: 'Chapter 4' },
  { key: 'chapter5', label: 'Chapter 5' },
] as const

export type ResearchSectionKey =
  (typeof RESEARCH_EDITOR_SECTION_DEFINITIONS)[number]['key']

export type ResearchDocumentContent = Record<ResearchSectionKey, string>

export type ResearchChapterSection = {
  id: string
  title: string
  content: string
}

export type TextAnnotationPosition = {
  type: 'text'
  sectionKey: ResearchSectionKey
  selectedText: string
  prefixText: string
  suffixText: string
  startOffset: number
  endOffset: number
}

const EMPTY_RESEARCH_DOCUMENT_CONTENT: ResearchDocumentContent = {
  abstract: '',
  chapter1: '',
  chapter2: '',
  chapter3: '',
  chapter4: '',
  chapter5: '',
}

const CHAPTER_SECTION_TEMPLATES: Record<Exclude<ResearchSectionKey, 'abstract'>, string[]> = {
  chapter1: [
    'Background of the Study',
    'Statement of the Problem',
    'Significance of the Study',
  ],
  chapter2: ['Review of Related Literature', 'Review of Related Studies', 'Synthesis'],
  chapter3: ['Research Design', 'Participants', 'Data Gathering Procedure'],
  chapter4: ['Presentation of Data', 'Analysis of Findings'],
  chapter5: ['Summary', 'Conclusions', 'Recommendations'],
}

const RESEARCH_SUBSECTION_PATTERN =
  /<section\b[^>]*data-research-subsection="true"[^>]*>\s*<h3\b[^>]*data-research-subsection-title="true"[^>]*>([\s\S]*?)<\/h3>\s*<div\b[^>]*data-research-subsection-body="true"[^>]*>([\s\S]*?)<\/div>\s*<\/section>/gi

export function getNormalizedResearchStage(
  stage: string | null | undefined
): ResearchStage {
  return RESEARCH_STAGE_OPTIONS.find((option) => option === stage) ?? 'Proposal'
}

export function getResearchEditorSectionsForStage(
  stage: string | null | undefined
): ReadonlyArray<(typeof RESEARCH_EDITOR_SECTION_DEFINITIONS)[number]> {
  const normalizedStage = getNormalizedResearchStage(stage)

  if (normalizedStage === 'Final Manuscript') {
    return RESEARCH_EDITOR_SECTION_DEFINITIONS
  }

  if (normalizedStage === 'Chapter 1-3') {
    return RESEARCH_EDITOR_SECTION_DEFINITIONS.filter(
      (section) =>
        section.key === 'chapter1' ||
        section.key === 'chapter2' ||
        section.key === 'chapter3'
    )
  }

  return []
}

export function isProposalStage(stage: string | null | undefined) {
  return getNormalizedResearchStage(stage) === 'Proposal'
}

export function isTextAnnotationPosition(
  value: unknown
): value is TextAnnotationPosition {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as { type?: string }).type === 'text'
  )
}

export function isResearchChapterSectionKey(
  sectionKey: ResearchSectionKey
): sectionKey is Exclude<ResearchSectionKey, 'abstract'> {
  return sectionKey !== 'abstract'
}

export function createEmptyResearchDocumentContent(): ResearchDocumentContent {
  return { ...EMPTY_RESEARCH_DOCUMENT_CONTENT }
}

export function createResearchChapterSection(
  title = '',
  content = '',
  id = createResearchChapterSectionId()
): ResearchChapterSection {
  return {
    id,
    title,
    content: normalizeRichTextEditorValue(content),
  }
}

export function getDefaultResearchChapterSections(
  sectionKey: Exclude<ResearchSectionKey, 'abstract'>
) {
  return CHAPTER_SECTION_TEMPLATES[sectionKey].map((title, index) =>
    createResearchChapterSection(title, '<p></p>', `${sectionKey}-default-${index + 1}`)
  )
}

export function normalizeResearchDocumentContent(
  value: unknown
): ResearchDocumentContent {
  const parsed =
    typeof value === 'string'
      ? safelyParseJson(value)
      : value && typeof value === 'object'
        ? (value as Record<string, unknown>)
        : null

  const normalized = createEmptyResearchDocumentContent()

  for (const section of RESEARCH_EDITOR_SECTION_DEFINITIONS) {
    const nextValue = parsed?.[section.key]
    normalized[section.key] =
      typeof nextValue === 'string' ? nextValue : ''
  }

  return normalized
}

export function extractResearchDocumentContentFromFormData(
  formData: FormData,
  stage: string | null | undefined
): ResearchDocumentContent {
  const content = createEmptyResearchDocumentContent()

  for (const section of getResearchEditorSectionsForStage(stage)) {
    const rawValue = formData.get(`section-${section.key}`)
    content[section.key] = typeof rawValue === 'string' ? rawValue.trim() : ''
  }

  return content
}

export function hasResearchTextContent(
  content: ResearchDocumentContent,
  stage: string | null | undefined
) {
  return getResearchEditorSectionsForStage(stage).some(
    (section) => getPlainTextFromRichText(content[section.key]).trim().length > 0
  )
}

export function getSubmissionFormatLabel(format: string | null | undefined) {
  return (
    RESEARCH_SUBMISSION_FORMAT_OPTIONS.find((option) => option.value === format)
      ?.label ?? 'PDF only'
  )
}

export function resolveResearchSubmissionFormat(
  format: string | null | undefined,
  {
    hasPdf,
    hasText,
    stage,
  }: {
    hasPdf: boolean
    hasText: boolean
    stage?: string | null
  }
): ResearchSubmissionFormat {
  if (isProposalStage(stage)) {
    return 'pdf'
  }

  if (format === 'both' && hasPdf && hasText) return 'both'
  if (format === 'text' && hasText) return 'text'
  if (format === 'pdf' && hasPdf) return 'pdf'
  if (hasPdf && hasText) return 'both'
  if (hasText) return 'text'
  return 'pdf'
}

export function getResearchSectionLabel(sectionKey: ResearchSectionKey) {
  return (
    RESEARCH_EDITOR_SECTION_DEFINITIONS.find((section) => section.key === sectionKey)
      ?.label ?? sectionKey
  )
}

export function parseResearchChapterSections(
  sectionKey: ResearchSectionKey,
  value: string | null | undefined
): ResearchChapterSection[] {
  if (!isResearchChapterSectionKey(sectionKey)) {
    return []
  }

  const trimmedValue = value?.trim() ?? ''

  if (!trimmedValue) {
    return getDefaultResearchChapterSections(sectionKey)
  }

  const parsedSections = Array.from(trimmedValue.matchAll(RESEARCH_SUBSECTION_PATTERN)).map(
    (match, index) =>
      createResearchChapterSection(
        decodeHtml(match[1]),
        match[2].trim() || '<p></p>',
        `${sectionKey}-parsed-${index + 1}`
      )
  )

  if (parsedSections.length > 0) {
    return parsedSections
  }

  return [
    createResearchChapterSection(
      getDefaultLegacySectionTitle(sectionKey),
      trimmedValue,
      `${sectionKey}-legacy-1`
    ),
  ]
}

export function serializeResearchChapterSections(
  sections: ResearchChapterSection[]
): string {
  const normalizedSections = sections
    .map((section) => ({
      ...section,
      title: section.title,
      content: normalizeRichTextEditorValue(section.content),
    }))
    .filter(
      (section) =>
        section.title.length > 0 ||
        getPlainTextFromRichText(section.content).trim().length > 0
    )

  if (normalizedSections.length === 0) {
    return ''
  }

  return normalizedSections
    .map(
      (section) =>
        `<section data-research-subsection="true"><h3 data-research-subsection-title="true">${escapeHtml(
          section.title
        )}</h3><div data-research-subsection-body="true">${normalizeRichTextEditorValue(
          section.content
        )}</div></section>`
    )
    .join('')
}

export function getPlainTextFromRichText(value: string | null | undefined) {
  if (!value) return ''

  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|section)>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function normalizeRichTextEditorValue(value: string | null | undefined) {
  if (!value) return '<p></p>'

  const trimmed = value.trim()
  if (trimmed.startsWith('<')) {
    return trimmed
  }

  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function safelyParseJson(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
}

function getDefaultLegacySectionTitle(
  sectionKey: Exclude<ResearchSectionKey, 'abstract'>
) {
  return CHAPTER_SECTION_TEMPLATES[sectionKey][0] ?? 'Section 1'
}

function createResearchChapterSectionId() {
  return `section-${Math.random().toString(36).slice(2, 10)}`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
