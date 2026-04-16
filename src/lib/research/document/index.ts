export const RESEARCH_STAGE_OPTIONS = [
  'Proposal',
  'In Progress',
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

export type ResearchDocumentSectionKind = 'structured' | 'rich-text'

export type ResearchDocumentSection = {
  id: string
  title: string
  content: string
  kind: ResearchDocumentSectionKind
}

export type ResearchDocumentContent = {
  sections: ResearchDocumentSection[]
}

export type ResearchChapterSection = {
  id: string
  title: string
  content: string
}

export type TextAnnotationPosition = {
  type: 'text'
  sectionKey: string
  sectionTitle?: string
  selectedText: string
  prefixText: string
  suffixText: string
  startOffset: number
  endOffset: number
}

type TemplateSectionDefinition = {
  title: string
  kind: ResearchDocumentSectionKind
  subsectionTitles?: string[]
}

const GENERAL_RESEARCH_TEMPLATE: TemplateSectionDefinition[] = [
  {
    title: 'CHAPTER I: INTRODUCTION',
    kind: 'structured',
    subsectionTitles: [
      'Background of the Study',
      'Statement of the Problem',
      'Significance of the Study',
      'Research Hypotheses',
      'Scope and Delimitation of the Study',
      'Conceptual Framework',
      'Definition of Terms',
    ],
  },
  {
    title: 'CHAPTER II: REVIEW OF RELATED LITERATURE',
    kind: 'structured',
    subsectionTitles: ['Review of Related Literature', 'Synthesis'],
  },
]

const CAPSTONE_TEMPLATE: TemplateSectionDefinition[] = [
  {
    title: 'CHAPTER I: THE PROBLEM AND ITS BACKGROUND',
    kind: 'structured',
    subsectionTitles: [
      'Introduction',
      'Review of Related Literature',
      'Conceptual Framework',
      'Statement of the Problem',
      'Scope and Delimitations',
      'Significance of the Study',
      'Definition of Terms',
    ],
  },
  {
    title: 'CHAPTER II: METHODOLOGY AND PROCEDURES',
    kind: 'structured',
    subsectionTitles: [
      'Research Design',
      'Research Locale',
      'Research Respondents',
      'Sample and Sampling Procedures',
      'Research Instruments',
      'Response Mode',
      'Data Gathering Procedure',
      'Data Analysis',
      'Ethical Considerations',
    ],
  },
]

const FALLBACK_TEMPLATE: TemplateSectionDefinition[] = [
  {
    title: 'CHAPTER I',
    kind: 'structured',
    subsectionTitles: ['Section 1'],
  },
]

const LEGACY_SECTION_LABELS: Record<string, string> = {
  abstract: 'Abstract',
  chapter1: 'Chapter 1',
  chapter2: 'Chapter 2',
  chapter3: 'Chapter 3',
  chapter4: 'Chapter 4',
  chapter5: 'Chapter 5',
}

const RESEARCH_SUBSECTION_PATTERN =
  /<section\b[^>]*data-research-subsection="true"[^>]*>\s*<h3\b[^>]*data-research-subsection-title="true"[^>]*>([\s\S]*?)<\/h3>\s*<div\b[^>]*data-research-subsection-body="true"[^>]*>([\s\S]*?)<\/div>\s*<\/section>/gi

export function getNormalizedResearchStage(
  stage: string | null | undefined
): ResearchStage {
  return RESEARCH_STAGE_OPTIONS.find((option) => option === stage) ?? 'Proposal'
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

export function createEmptyResearchDocumentContent(): ResearchDocumentContent {
  return {
    sections: [],
  }
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

export function createResearchDocumentSection(
  title = '',
  content = '',
  kind: ResearchDocumentSectionKind = 'structured',
  id = createResearchDocumentSectionId()
): ResearchDocumentSection {
  return {
    id,
    title,
    content: kind === 'structured' ? content || '<p></p>' : normalizeRichTextEditorValue(content),
    kind,
  }
}

export function createStructuredSectionContent(subsectionTitles: string[]) {
  return serializeResearchChapterSections(
    subsectionTitles.map((title, index) =>
      createResearchChapterSection(title, '<p></p>', `section-default-${index + 1}`)
    )
  )
}

export function createDefaultResearchDocumentContent(researchType: string | null | undefined) {
  const template =
    researchType === 'capstone'
      ? CAPSTONE_TEMPLATE
      : researchType === 'research'
        ? GENERAL_RESEARCH_TEMPLATE
        : FALLBACK_TEMPLATE

  return {
    sections: template.map((section, index) =>
      createResearchDocumentSection(
        section.title,
        section.kind === 'structured'
          ? createStructuredSectionContent(section.subsectionTitles ?? ['Section 1'])
          : '<p></p>',
        section.kind,
        `template-${index + 1}`
      )
    ),
  }
}

export function createBibliographySection() {
  return createResearchDocumentSection(
    'Bibliography / References',
    '<p></p>',
    'rich-text'
  )
}

export function getResearchDocumentSections(value: unknown) {
  return normalizeResearchDocumentContent(value).sections
}

export function normalizeResearchDocumentContent(
  value: unknown,
  researchType?: string | null | undefined
): ResearchDocumentContent {
  const parsed =
    typeof value === 'string'
      ? safelyParseJson(value)
      : value && typeof value === 'object'
        ? (value as Record<string, unknown>)
        : null

  if (Array.isArray(parsed?.sections)) {
    return {
      sections: parsed.sections
        .map((section, index) => normalizeDocumentSection(section, index))
        .filter((section): section is ResearchDocumentSection => Boolean(section)),
    }
  }

  const legacySections = normalizeLegacyResearchDocumentContent(parsed)
  if (legacySections.length > 0) {
    return { sections: legacySections }
  }

  if (researchType) {
    return createDefaultResearchDocumentContent(researchType)
  }

  return createEmptyResearchDocumentContent()
}

export function extractResearchDocumentContentFromFormData(
  formData: FormData,
  _stage: string | null | undefined,
  researchType?: string | null | undefined
): ResearchDocumentContent {
  const rawJson = formData.get('contentJson')

  if (typeof rawJson === 'string' && rawJson.trim()) {
    return normalizeResearchDocumentContent(rawJson, researchType)
  }

  const legacyEntries = Object.fromEntries(
    Array.from(formData.entries())
      .filter(([key]) => key.startsWith('section-'))
      .map(([key, rawValue]) => [key.replace(/^section-/, ''), rawValue])
  )

  if (Object.keys(legacyEntries).length > 0) {
    return normalizeResearchDocumentContent(legacyEntries, researchType)
  }

  return normalizeResearchDocumentContent(null, researchType)
}

export function hasResearchTextContent(
  content: ResearchDocumentContent,
  stage: string | null | undefined
) {
  void stage
  return getResearchDocumentSections(content).some(
    (section) => getPlainTextFromRichText(section.content).trim().length > 0
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
  }: {
    hasPdf: boolean
    hasText: boolean
    stage?: string | null
  }
): ResearchSubmissionFormat {
  if (format === 'both' && hasPdf && hasText) return 'both'
  if (format === 'text' && hasText) return 'text'
  if (format === 'pdf' && hasPdf) return 'pdf'
  if (hasPdf && hasText) return 'both'
  if (hasText) return 'text'
  return 'pdf'
}

export function getResearchSectionLabel(sectionKey: string, content?: unknown) {
  const matchedSection = content
    ? getResearchDocumentSections(content).find((section) => section.id === sectionKey)
    : null

  if (matchedSection?.title) {
    return matchedSection.title
  }

  return LEGACY_SECTION_LABELS[sectionKey] ?? sectionKey
}

export function parseResearchChapterSections(
  value: string | null | undefined,
  fallbackTitles: string[] = ['Section 1']
): ResearchChapterSection[] {
  const trimmedValue = value?.trim() ?? ''

  if (!trimmedValue) {
    return fallbackTitles.map((title, index) =>
      createResearchChapterSection(title, '<p></p>', `default-${index + 1}`)
    )
  }

  const parsedSections = Array.from(trimmedValue.matchAll(RESEARCH_SUBSECTION_PATTERN)).map(
    (match, index) =>
      createResearchChapterSection(
        decodeHtml(match[1]),
        match[2].trim() || '<p></p>',
        `parsed-${index + 1}`
      )
  )

  if (parsedSections.length > 0) {
    return parsedSections
  }

  return [
    createResearchChapterSection(
      fallbackTitles[0] ?? 'Section 1',
      trimmedValue,
      'legacy-1'
    ),
  ]
}

export function serializeResearchChapterSections(
  sections: ResearchChapterSection[]
): string {
  const normalizedSections = sections.map((section) => ({
    ...section,
    title: section.title,
    content: normalizeRichTextEditorValue(section.content),
  }))

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

function normalizeDocumentSection(section: unknown, index: number) {
  if (!section || typeof section !== 'object') {
    return null
  }

  const candidate = section as Record<string, unknown>
  const title =
    typeof candidate.title === 'string' && candidate.title.trim()
      ? candidate.title.trim()
      : `Untitled Section ${index + 1}`
  const content =
    typeof candidate.content === 'string'
      ? candidate.content
      : '<p></p>'
  const kind =
    candidate.kind === 'rich-text' ? 'rich-text' : 'structured'

  return {
    id:
      typeof candidate.id === 'string' && candidate.id.trim()
        ? candidate.id
        : createResearchDocumentSectionId(),
    title,
    content: kind === 'structured' ? content || '<p></p>' : normalizeRichTextEditorValue(content),
    kind,
  } satisfies ResearchDocumentSection
}

function normalizeLegacyResearchDocumentContent(
  parsed: Record<string, unknown> | null
) {
  if (!parsed) {
    return []
  }

  return Object.entries(LEGACY_SECTION_LABELS)
    .map(([key, label]) => {
      const rawValue = parsed[key]
      if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
        return null
      }

      return createResearchDocumentSection(
        label,
        rawValue,
        key === 'abstract' ? 'rich-text' : 'structured',
        key
      )
    })
    .filter((section): section is ResearchDocumentSection => Boolean(section))
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

function createResearchChapterSectionId() {
  return `section-${Math.random().toString(36).slice(2, 10)}`
}

function createResearchDocumentSectionId() {
  return `document-section-${Math.random().toString(36).slice(2, 10)}`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
