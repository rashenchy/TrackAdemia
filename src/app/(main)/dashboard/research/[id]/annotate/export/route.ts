import { NextResponse } from 'next/server'
import { PDFDocument, PDFFont, PDFHexString, PDFName, StandardFonts, rgb } from 'pdf-lib'
import { createClient } from '@/lib/supabase/server'
import { isResearchReviewer } from '@/lib/research/permissions'

type RouteContext = {
  params: Promise<{ id: string }>
}

type PdfHighlightArea = {
  pageIndex: number
  top: number
  left: number
  width: number
  height: number
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

function sanitizeFileName(value: string) {
  const normalized = value.replace(/[^\w\s-]+/g, '').trim().replace(/\s+/g, '-')
  return normalized.length > 0 ? normalized : 'annotated-research'
}

function normalizeForCompare(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function wrapText(text: string, maxWidth: number, font: PDFFont, fontSize: number) {
  const words = normalizeForCompare(text).split(' ').filter(Boolean)
  if (words.length === 0) return ['']

  const lines: string[] = []
  let currentLine = words[0]

  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${currentLine} ${words[index]}`
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      currentLine = candidate
    } else {
      lines.push(currentLine)
      currentLine = words[index]
    }
  }

  lines.push(currentLine)
  return lines
}

function getSummaryLines(
  annotationNumber: number,
  pageNumber: number,
  annotation: AnnotationRow,
  authorName: string,
  font: PDFFont,
  boldFont: PDFFont,
  pageWidth: number
) {
  const contentWidth = pageWidth - 96
  const header = `#${annotationNumber} - Page ${pageNumber}${authorName ? ` • By ${authorName}` : ''}`
  return [
    { text: header, font: boldFont, size: 12, color: rgb(0.11, 0.17, 0.28) },
    ...wrapText(`Quote: "${normalizeForCompare(annotation.quote) || 'No quote captured.'}"`, contentWidth, font, 10).map(
      (line) => ({
        text: line,
        font,
        size: 10,
        color: rgb(0.29, 0.33, 0.39),
      })
    ),
    ...wrapText(
      `Feedback: ${normalizeForCompare(annotation.comment_text) || 'No comment text.'}`,
      contentWidth,
      font,
      10
    ).map((line) => ({
      text: line,
      font,
      size: 10,
      color: rgb(0.12, 0.23, 0.45),
    })),
  ]
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
    return { user, role: profile?.role ?? null }
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
    throw new Error('You are not allowed to export this annotated PDF.')
  }

  return { user, role: profile?.role ?? null }
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
      .select('title, file_url, original_file_name')
      .eq('id', researchId)
      .single()

    if (!research) {
      return NextResponse.json({ error: 'Research record not found.' }, { status: 404 })
    }

    const { data: version } =
      versionNumber != null
        ? await supabase
            .from('research_versions')
            .select(
              'id, version_number, version_major, version_minor, file_url, original_file_name'
            )
            .eq('research_id', researchId)
            .eq('version_number', versionNumber)
            .maybeSingle()
        : { data: null }

    const filePath = version?.file_url || research.file_url
    const originalFileName =
      version?.original_file_name || research.original_file_name || `${research.title}.pdf`

    if (!filePath) {
      return NextResponse.json(
        { error: 'No PDF file is available for this research version.' },
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

    const pdfAnnotations = (annotations || []).filter(
      (annotation): annotation is AnnotationRow & { position_data: PdfHighlightArea[] } =>
        Array.isArray(annotation.position_data) && annotation.position_data.length > 0
    )

    if (pdfAnnotations.length === 0) {
      return NextResponse.json(
        { error: 'No PDF annotations matched this export yet.' },
        { status: 400 }
      )
    }

    const userIds = [
      ...new Set((annotations || []).map((a) => a.user_id).filter(Boolean)),
    ] as string[]
    const profileMap = new Map<string, { name: string; role: string }>()

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .in('id', userIds)

      for (const p of profiles || []) {
        const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim()
        const roleLabel =
          p.role === 'mentor'
            ? 'Teacher / Adviser'
            : p.role === 'proofreader'
              ? 'English Critique'
              : p.role || 'Reviewer'
        profileMap.set(p.id, {
          name: fullName ? `${fullName} (${roleLabel})` : roleLabel,
          role: p.role || 'reviewer',
        })
      }
    }

    const { data: pdfBlob, error: downloadError } = await supabase.storage
      .from('trackademiaPapers')
      .download(filePath)

    if (downloadError || !pdfBlob) {
      throw downloadError ?? new Error('Unable to download the source PDF file.')
    }

    const pdfBytes = await pdfBlob.arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    pdfAnnotations.forEach((annotation, annotationIndex) => {
      annotation.position_data.forEach((area, areaIndex) => {
        const page = pages[area.pageIndex]
        if (!page) return

        const { width, height } = page.getSize()
        const x = area.left * width
        const y = height - (area.top + area.height) * height
        const boxWidth = area.width * width
        const boxHeight = area.height * height

        page.drawRectangle({
          x,
          y,
          width: boxWidth,
          height: boxHeight,
          color: rgb(0.98, 0.82, 0.18),
          opacity: 0.34,
          borderWidth: 0.5,
          borderColor: rgb(0.92, 0.63, 0.12),
        })

        if (areaIndex === 0) {
          const badgeLabel = String(annotationIndex + 1)
          const badgeFontSize = 9
          const badgeTextWidth = boldFont.widthOfTextAtSize(badgeLabel, badgeFontSize)
          const badgeWidth = Math.max(16, badgeTextWidth + 8)
          const badgeHeight = 14
          const badgeX = Math.min(x + boxWidth + 6, width - badgeWidth - 8)
          const badgeY = Math.min(y + boxHeight + 4, height - badgeHeight - 8)

          page.drawRectangle({
            x: badgeX,
            y: badgeY,
            width: badgeWidth,
            height: badgeHeight,
            color: rgb(0.04, 0.36, 0.58),
            opacity: 0.92,
          })
          page.drawText(badgeLabel, {
            x: badgeX + (badgeWidth - badgeTextWidth) / 2,
            y: badgeY + 3,
            size: badgeFontSize,
            font: boldFont,
            color: rgb(1, 1, 1),
          })

          // Attach native PDF clickable Sticky Note / Comment popup annotation
          const authorInfo = annotation.user_id ? profileMap.get(annotation.user_id) : null
          const authorName = authorInfo?.name || 'Reviewer'

          const stickyNote = pdfDoc.context.obj({
            Type: 'Annot',
            Subtype: 'Text',
            Rect: [badgeX, badgeY, badgeX + badgeWidth + 8, badgeY + badgeHeight + 8],
            Contents: PDFHexString.fromText(annotation.comment_text || 'No comment text.'),
            Name: 'Comment',
            T: PDFHexString.fromText(authorName),
            Subj: PDFHexString.fromText('Research Feedback'),
            C: [0.04, 0.36, 0.58],
            Open: false,
          })
          const stickyNoteRef = pdfDoc.context.register(stickyNote)
          page.node.addAnnot(stickyNoteRef)
        }
      })
    })

    let summaryPage = pdfDoc.addPage([612, 792])
    let { width: summaryPageWidth, height: summaryPageHeight } = summaryPage.getSize()
    let cursorY = summaryPageHeight - 54

    const drawSummaryHeader = (continued = false) => {
      summaryPage.drawText(
        continued ? 'Annotation Summary (continued)' : 'Annotation Summary',
        {
          x: 48,
          y: summaryPageHeight - 44,
          size: 18,
          font: boldFont,
          color: rgb(0.11, 0.17, 0.28),
        }
      )
      summaryPage.drawText(
        mode === 'all'
          ? 'Export includes all PDF feedback items from this version.'
          : 'Export includes unresolved PDF feedback items from this version.',
        {
          x: 48,
          y: summaryPageHeight - 62,
          size: 10,
          font,
          color: rgb(0.4, 0.45, 0.54),
        }
      )
      cursorY = summaryPageHeight - 92
    }

    drawSummaryHeader()

    pdfAnnotations.forEach((annotation, annotationIndex) => {
      const firstArea = annotation.position_data[0]
      const pageNumber = (firstArea?.pageIndex ?? 0) + 1
      const authorInfo = annotation.user_id ? profileMap.get(annotation.user_id) : null
      const authorName = authorInfo?.name || 'Reviewer'
      const lines = getSummaryLines(
        annotationIndex + 1,
        pageNumber,
        annotation,
        authorName,
        font,
        boldFont,
        summaryPageWidth
      )

      const blockHeight = lines.reduce((height, line) => height + line.size + 6, 0) + 10
      if (cursorY - blockHeight < 48) {
        summaryPage = pdfDoc.addPage([612, 792])
        const nextPageSize = summaryPage.getSize()
        summaryPageWidth = nextPageSize.width
        summaryPageHeight = nextPageSize.height
        drawSummaryHeader(true)
      }

      summaryPage.drawRectangle({
        x: 42,
        y: cursorY - blockHeight + 8,
        width: summaryPageWidth - 84,
        height: blockHeight,
        color: rgb(0.98, 0.99, 1),
        borderColor: rgb(0.87, 0.91, 0.96),
        borderWidth: 1,
        opacity: 1,
      })

      let lineCursorY = cursorY
      lines.forEach((line) => {
        summaryPage.drawText(line.text, {
          x: 54,
          y: lineCursorY - line.size,
          size: line.size,
          font: line.font,
          color: line.color,
          maxWidth: summaryPageWidth - 108,
        })
        lineCursorY -= line.size + 6
      })

      cursorY -= blockHeight + 12
    })

    const exportedBytes = await pdfDoc.save()
    const baseName = sanitizeFileName(research.title || originalFileName.replace(/\.pdf$/i, ''))
    const versionSuffix = version?.version_number ? `-v${version.version_number}` : ''
    const fileName = `${baseName}${versionSuffix}-annotated.pdf`

    return new Response(Buffer.from(exportedBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to export the annotated PDF.',
      },
      { status: 500 }
    )
  }
}
