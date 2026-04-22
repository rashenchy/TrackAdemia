import { NextResponse } from 'next/server'
import {
  CommentRangeEnd,
  CommentRangeStart,
  CommentReference,
  Document,
  HeadingLevel,
  HighlightColor,
  Packer,
  Paragraph,
  TextRun,
  type ICommentOptions,
  type ParagraphChild,
} from 'docx'
import { createClient } from '@/lib/supabase/server'
import {
  getPlainTextFromRichText,
  getResearchDocumentSections,
  isTextAnnotationPosition,
  normalizeResearchDocumentContent,
  type TextAnnotationPosition,
} from '@/lib/research/document'
import { isResearchReviewer } from '@/lib/research/permissions'

type RouteContext = {
  params: Promise<{ id: string }>
}

type AnnotationRow = {
  id: string
  user_id: string | null
  quote: string
  comment_text: string
  position_data: unknown
  is_resolved: boolean
  created_at: string
}

type ResolvedTextAnnotation = {
  id: string
  commentId: number
  authorName: string
  quote: string
  commentText: string
  start: number
  end: number
}

function sanitizeFileName(value: string) {
  const normalized = value.replace(/[^\w\s-]+/g, '').trim().replace(/\s+/g, '-')
  return normalized.length > 0 ? normalized : 'annotated-research'
}

function normalizeComparableText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function resolveTextAnnotationOffsets(
  fullText: string,
  position: TextAnnotationPosition
): { start: number; end: number } | null {
  const directSlice = fullText.slice(position.startOffset, position.endOffset)

  if (
    directSlice &&
    normalizeComparableText(directSlice) === normalizeComparableText(position.selectedText)
  ) {
    return { start: position.startOffset, end: position.endOffset }
  }

  const matches: number[] = []
  let cursor = 0

  while (cursor <= fullText.length) {
    const foundIndex = fullText.indexOf(position.selectedText, cursor)
    if (foundIndex === -1) break
    matches.push(foundIndex)
    cursor = foundIndex + Math.max(position.selectedText.length, 1)
  }

  if (matches.length === 0) {
    return null
  }

  const bestMatch = matches
    .map((start) => {
      const end = start + position.selectedText.length
      const prefix = fullText.slice(Math.max(0, start - position.prefixText.length), start)
      const suffix = fullText.slice(end, end + position.suffixText.length)
      const score =
        (normalizeComparableText(prefix) === normalizeComparableText(position.prefixText) ? 3 : 0) +
        (normalizeComparableText(suffix) === normalizeComparableText(position.suffixText) ? 3 : 0) +
        Math.max(0, 2 - Math.min(Math.abs(start - position.startOffset), 2))

      return { start, end, score }
    })
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score
      }

      return Math.abs(first.start - position.startOffset) - Math.abs(second.start - position.startOffset)
    })[0]

  return bestMatch ? { start: bestMatch.start, end: bestMatch.end } : null
}

function createSectionParagraphSpecs(sectionText: string) {
  const matches = Array.from(sectionText.matchAll(/[^\n]+/g))

  if (matches.length === 0 && normalizeComparableText(sectionText)) {
    return [{ text: sectionText, start: 0, end: sectionText.length }]
  }

  return matches.map((match) => ({
    text: match[0],
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }))
}

function createAnnotatedParagraph(
  paragraphText: string,
  paragraphStart: number,
  annotations: ResolvedTextAnnotation[]
) {
  const paragraphEnd = paragraphStart + paragraphText.length
  const relevantAnnotations = annotations
    .filter((annotation) => annotation.end > paragraphStart && annotation.start < paragraphEnd)
    .sort((first, second) => first.start - second.start)

  if (relevantAnnotations.length === 0) {
    return new Paragraph({
      children: [new TextRun(paragraphText)],
    })
  }

  const children: ParagraphChild[] = []
  let cursor = paragraphStart

  for (const annotation of relevantAnnotations) {
    const segmentStart = Math.max(annotation.start, paragraphStart)
    const segmentEnd = Math.min(annotation.end, paragraphEnd)

    if (segmentEnd <= cursor) {
      continue
    }

    if (segmentStart > cursor) {
      children.push(new TextRun(paragraphText.slice(cursor - paragraphStart, segmentStart - paragraphStart)))
    }

    if (annotation.start >= paragraphStart && annotation.start < paragraphEnd) {
      children.push(new CommentRangeStart(annotation.commentId))
    }

    children.push(
      new TextRun({
        text: paragraphText.slice(segmentStart - paragraphStart, segmentEnd - paragraphStart),
        highlight: HighlightColor.YELLOW,
      })
    )

    if (annotation.end > paragraphStart && annotation.end <= paragraphEnd) {
      children.push(new CommentRangeEnd(annotation.commentId))
      children.push(new CommentReference(annotation.commentId))
    }

    cursor = segmentEnd
  }

  if (cursor < paragraphEnd) {
    children.push(new TextRun(paragraphText.slice(cursor - paragraphStart)))
  }

  return new Paragraph({ children })
}

async function requireResearchParticipant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  researchId: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated.')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .eq('is_active', true)
    .single()

  if (isResearchReviewer(profile?.role)) {
    return
  }

  const { data: research } = await supabase
    .from('research')
    .select('user_id, members')
    .eq('id', researchId)
    .single()

  const isParticipant =
    research?.user_id === user.id ||
    (Array.isArray(research?.members) && research.members.includes(user.id))

  if (!isParticipant) {
    throw new Error('You are not allowed to export this Word document.')
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { id: researchId } = await context.params
  const { searchParams } = new URL(request.url)
  const versionParam = searchParams.get('version')
  const versionNumber =
    versionParam && !Number.isNaN(Number(versionParam)) ? Number(versionParam) : null
  const mode = searchParams.get('mode') === 'all' ? 'all' : 'unresolved'

  const supabase = await createClient()

  try {
    await requireResearchParticipant(supabase, researchId)

    const { data: research } = await supabase
      .from('research')
      .select('title, type, content_json')
      .eq('id', researchId)
      .single()

    if (!research) {
      return NextResponse.json({ error: 'Research record not found.' }, { status: 404 })
    }

    const { data: version } =
      versionNumber != null
        ? await supabase
            .from('research_versions')
            .select('id, version_number, version_major, version_minor, content_json')
            .eq('research_id', researchId)
            .eq('version_number', versionNumber)
            .maybeSingle()
        : { data: null }

    const contentSource = version?.content_json ?? research.content_json
    const documentContent = normalizeResearchDocumentContent(contentSource, research.type)
    const sections = getResearchDocumentSections(documentContent)

    if (sections.length === 0) {
      return NextResponse.json(
        { error: 'No editor content is available for this manuscript version.' },
        { status: 400 }
      )
    }

    let annotationQuery = supabase
      .from('annotations')
      .select('id, user_id, quote, comment_text, position_data, is_resolved, created_at')
      .eq('research_id', researchId)
      .order('created_at', { ascending: true })

    const versionLineageNumber = version?.version_major ?? version?.version_number ?? null
    if (versionLineageNumber != null) {
      annotationQuery = annotationQuery.eq('version_major', versionLineageNumber)
    }

    if (mode === 'unresolved') {
      annotationQuery = annotationQuery.eq('is_resolved', false)
    }

    const { data: annotations, error: annotationError } = await annotationQuery

    if (annotationError) {
      throw annotationError
    }

    const textAnnotations = (annotations || []).filter(
      (annotation): annotation is AnnotationRow & { position_data: TextAnnotationPosition } =>
        isTextAnnotationPosition(annotation.position_data)
    )

    if (textAnnotations.length === 0) {
      return NextResponse.json(
        { error: 'No text annotations matched this export yet.' },
        { status: 400 }
      )
    }

    const authorIds = [...new Set(textAnnotations.map((annotation) => annotation.user_id).filter(Boolean))]
    const { data: authorProfiles } =
      authorIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', authorIds as string[])
        : { data: [] }

    const authorMap = new Map(
      (authorProfiles || []).map((profile) => [
        profile.id,
        `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Reviewer',
      ])
    )

    const commentDefinitions: ICommentOptions[] = []
    const docSections = sections.flatMap((section) => {
      const sectionText = getPlainTextFromRichText(section.content)
      const resolvedAnnotations: ResolvedTextAnnotation[] = textAnnotations
        .filter((annotation) => annotation.position_data.sectionKey === section.id)
        .map((annotation, index) => {
          const resolvedOffsets = resolveTextAnnotationOffsets(sectionText, annotation.position_data)
          if (!resolvedOffsets || resolvedOffsets.end <= resolvedOffsets.start) {
            return null
          }

          const commentId = commentDefinitions.length + index
          const authorName = authorMap.get(annotation.user_id ?? '') || 'Reviewer'

          commentDefinitions.push({
            id: commentId,
            author: authorName,
            initials: authorName
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? '')
              .join(''),
            date: new Date(annotation.created_at),
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: normalizeComparableText(annotation.comment_text) || 'No comment text.',
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Quote: "${normalizeComparableText(annotation.quote) || 'No quote captured.'}"`,
                    italics: true,
                  }),
                ],
              }),
            ],
          })

          return {
            id: annotation.id,
            commentId,
            authorName,
            quote: annotation.quote,
            commentText: annotation.comment_text,
            start: resolvedOffsets.start,
            end: resolvedOffsets.end,
          }
        })
        .filter((annotation): annotation is ResolvedTextAnnotation => Boolean(annotation))
        .sort((first, second) => first.start - second.start)

      const paragraphSpecs = createSectionParagraphSpecs(sectionText)
      const children: Paragraph[] = [
        new Paragraph({
          text: section.title,
          heading: HeadingLevel.HEADING_1,
        }),
      ]

      if (paragraphSpecs.length === 0) {
        children.push(
          new Paragraph({
            children: [new TextRun(' ')],
          })
        )
      } else {
        paragraphSpecs.forEach((paragraphSpec) => {
          children.push(
            createAnnotatedParagraph(
              paragraphSpec.text,
              paragraphSpec.start,
              resolvedAnnotations
            )
          )
        })
      }

      children.push(
        new Paragraph({
          children: [new TextRun(' ')],
        })
      )

      return children
    })

    const doc = new Document({
      comments: {
        children: commentDefinitions,
      },
      sections: [
        {
          children: [
            new Paragraph({
              text: research.title,
              heading: HeadingLevel.TITLE,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text:
                    mode === 'all'
                      ? 'Export includes all text feedback with inline highlights and Word comments.'
                      : 'Export includes unresolved text feedback with inline highlights and Word comments.',
                  italics: true,
                }),
              ],
            }),
            ...docSections,
          ],
        },
      ],
    })

    const buffer = await Packer.toBuffer(doc)
    const baseName = sanitizeFileName(research.title)
    const versionSuffix = version?.version_number ? `-v${version.version_number}` : ''
    const fileName = `${baseName}${versionSuffix}-feedback.docx`

    return new Response(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to export the Word document.',
      },
      { status: 500 }
    )
  }
}
