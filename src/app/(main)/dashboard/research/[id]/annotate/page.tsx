'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Viewer, Worker } from '@react-pdf-viewer/core'
import {
  highlightPlugin,
  type RenderHighlightTargetProps,
  type RenderHighlightsProps,
} from '@react-pdf-viewer/highlight'

import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/highlight/lib/styles/index.css'

import {
  BadgeCheck,
  CheckCircle,
  ChevronLeft,
  CircleDashed,
  Edit3,
  Eye,
  FileCode2,
  GitCompareArrows,
  Loader2,
  MessageSquare,
  Save,
  Send,
} from 'lucide-react'
import Link from 'next/link'

import {
  addAnnotation,
  addReply,
  getAnnotations,
  getReplies,
  getResearchFile,
  getResearchFileForVersion,
  saveStudentWorkspaceDraft,
  saveTeacherWorkspaceVersion,
  submitStudentWorkspaceVersion,
  toggleAnnotationResolved,
  updateReviewDecision,
} from './actions'
import {
  getResearchSectionLabel,
  hasResearchTextContent,
  isTextAnnotationPosition,
  normalizeResearchDocumentContent,
  resolveResearchSubmissionFormat,
  type ResearchDocumentContent,
  type ResearchSubmissionFormat,
  type TextAnnotationPosition,
} from '@/lib/research/document'
import { ResearchDocumentStructureEditor } from '@/components/dashboard/ResearchDocumentStructureEditor'
import { getVersionLabel } from '@/lib/research/versioning'
import { BackButton } from '@/components/navigation/BackButton'
import { appendFromParam, buildPathWithSearch } from '@/lib/navigation'

type AnnotationRecord = {
  id: string
  research_id: string
  quote: string
  comment_text: string
  position_data: unknown
  is_resolved: boolean
  created_at: string
}

type ReplyRecord = {
  id: string
  user_id: string
  message: string
  profiles?: {
    first_name?: string
    last_name?: string
    role?: string
  }
}

type PdfHighlightArea = {
  pageIndex: number
  top: number
  left: number
  width: number
  height: number
}

type TextSelectionDraft = TextAnnotationPosition & {
  x: number
  y: number
}

type VersionSnapshot = {
  id: string
  version_number: number
  version_major?: number | null
  version_minor?: number | null
  version_label?: string | null
  created_by_role?: string | null
  change_type?: string | null
  change_summary?: string | null
  created_at: string
  original_file_name?: string | null
  file_url?: string | null
  content_json?: unknown
}

type ResearchDraftRecord = {
  id?: string
  research_id: string
  owner_role: string
  owner_user_id: string
  content_json?: unknown
  updated_at?: string | null
  change_summary?: string | null
  base_version_id?: string | null
}

type ResearchRecord = {
  id: string
  title: string
  type?: string | null
  user_id: string
  members?: string[] | null
  current_stage?: string | null
  status?: string | null
  submission_format?: string | null
  content_json?: unknown
  file_url?: string | null
  original_file_name?: string | null
}

function summarizeQuote(text: string, maxLength = 120) {
  if (!text) return ''
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, maxLength)}...`
}

function isPdfAnnotation(annotation: AnnotationRecord) {
  return Array.isArray(annotation.position_data)
}

function getAnnotationLocationLabel(annotation: AnnotationRecord) {
  if (isTextAnnotationPosition(annotation.position_data)) {
    return (
      annotation.position_data.sectionTitle ||
      getResearchSectionLabel(annotation.position_data.sectionKey)
    )
  }

  if (Array.isArray(annotation.position_data)) {
    const pageIndex =
      annotation.position_data[0] &&
      typeof annotation.position_data[0] === 'object' &&
      annotation.position_data[0] !== null &&
      'pageIndex' in annotation.position_data[0]
        ? Number((annotation.position_data[0] as { pageIndex?: number }).pageIndex)
        : 0

    return `Page ${pageIndex + 1}`
  }

  return 'Document'
}

function getTextSelectionDetails(
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
    x: selectionRange.getBoundingClientRect().left + window.scrollX,
    y: selectionRange.getBoundingClientRect().bottom + window.scrollY,
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
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
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

  const range = document.createRange()
  range.setStart(startNode, startNodeOffset)
  range.setEnd(endNode, endNodeOffset)
  return range
}

type HighlightConstructor = new (...ranges: Range[]) => {
  add: (...ranges: Range[]) => void
  clear: () => void
}

type HighlightRegistryLike = {
  set: (name: string, highlight: InstanceType<HighlightConstructor>) => void
  delete: (name: string) => void
}

function getEditorRoot(container: HTMLElement | null) {
  if (!container) return null

  return container
}

function normalizeComparableText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function resolveTextAnnotationRange(
  container: HTMLElement,
  position: TextAnnotationPosition
) {
  const directRange = buildTextRangeFromOffsets(
    container,
    position.startOffset,
    position.endOffset
  )

  if (
    directRange &&
    normalizeComparableText(directRange.toString()) ===
      normalizeComparableText(position.selectedText)
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
      const prefix = fullText.slice(Math.max(0, startOffset - position.prefixText.length), startOffset)
      const suffix = fullText.slice(endOffset, endOffset + position.suffixText.length)
      const score =
        (normalizeComparableText(prefix) === normalizeComparableText(position.prefixText) ? 3 : 0) +
        (normalizeComparableText(suffix) === normalizeComparableText(position.suffixText) ? 3 : 0) +
        Math.max(0, 2 - Math.min(Math.abs(startOffset - position.startOffset), 2))

      return { startOffset, endOffset, score }
    })
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score
      }

      return Math.abs(first.startOffset - position.startOffset) - Math.abs(second.startOffset - position.startOffset)
    })

  const bestMatch = scoredMatches[0]

  return buildTextRangeFromOffsets(container, bestMatch.startOffset, bestMatch.endOffset)
}

function getHighlightRegistry() {
  return (
    (globalThis as typeof globalThis & {
      CSS?: {
        highlights?: HighlightRegistryLike
      }
    }).CSS?.highlights ?? null
  )
}

function getHighlightConstructor() {
  return (
    (globalThis as typeof globalThis & {
      Highlight?: HighlightConstructor
    }).Highlight ?? null
  )
}

export default function AnnotatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: researchId } = use(params)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const versionParam = searchParams.get('version')
  const selectedVersionNumber = versionParam ? Number(versionParam) : null

  const [research, setResearch] = useState<ResearchRecord | null>(null)
  const [availableVersions, setAvailableVersions] = useState<VersionSnapshot[]>([])
  const [workspaceDrafts, setWorkspaceDrafts] = useState<ResearchDraftRecord[]>([])
  const [annotations, setAnnotations] = useState<AnnotationRecord[]>([])
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [researchStatus, setResearchStatus] = useState('Pending Review')
  const [submissionFormat, setSubmissionFormat] = useState<ResearchSubmissionFormat>('pdf')
  const [activeFormat, setActiveFormat] = useState<'pdf' | 'text'>('pdf')
  const [workspaceContent, setWorkspaceContent] = useState<ResearchDocumentContent>(
    normalizeResearchDocumentContent(null, research?.type ?? null)
  )
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState<string | null>(null)
  const [changeSummary, setChangeSummary] = useState('')
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isSubmittingVersion, setIsSubmittingVersion] = useState(false)
  const [isSavingReviewEdit, setIsSavingReviewEdit] = useState(false)
  const [isUpdatingDecision, setIsUpdatingDecision] = useState(false)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved')
  const [viewMode, setViewMode] = useState<'list' | 'thread'>('list')
  const [selectedAnnotation, setSelectedAnnotation] = useState<AnnotationRecord | null>(null)
  const [activeTextAnnotationId, setActiveTextAnnotationId] = useState<string | null>(null)
  const [threadReplies, setThreadReplies] = useState<ReplyRecord[]>([])
  const [replyText, setReplyText] = useState('')
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  const [isLoadingReplies, setIsLoadingReplies] = useState(false)

  const [showCommentBox, setShowCommentBox] = useState(false)
  const [activePdfHighlight, setActivePdfHighlight] = useState<RenderHighlightTargetProps | null>(
    null
  )
  const [activeTextSelection, setActiveTextSelection] = useState<TextSelectionDraft | null>(null)
  const [commentText, setCommentText] = useState('')
  const [isSubmittingAnnotation, setIsSubmittingAnnotation] = useState(false)

  const highlightRefs = useRef<Record<string, HTMLElement | null>>({})
  const textAnnotationRangesRef = useRef<Record<string, Range>>({})
  const didOpenAnnotationFromQueryRef = useRef(false)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

  const canReview = currentUserRole === 'mentor' || currentUserRole === 'admin'
  const isAuthor = Boolean(
    research &&
      currentUserId &&
      (research.user_id === currentUserId ||
        (Array.isArray(research.members) && research.members.includes(currentUserId)))
  )
  const canParticipate = canReview || isAuthor

  const latestVersion = availableVersions[0] ?? null
  const effectiveVersion =
    availableVersions.find((version) => version.version_number === selectedVersionNumber) ??
    latestVersion
  const effectiveVersionNumber = effectiveVersion?.version_number ?? 1
  const effectiveVersionLabel = effectiveVersion ? getVersionLabel(effectiveVersion) : '1'
  const previousVersion =
    availableVersions.find((version) => version.version_number < effectiveVersionNumber) ?? null

  const studentDraft = workspaceDrafts.find(
    (draft) => draft.owner_role === 'student' && draft.owner_user_id === currentUserId
  )
  const teacherDraft = workspaceDrafts.find(
    (draft) => draft.owner_role === 'teacher' && draft.owner_user_id === currentUserId
  )

  const selectedVersionContent = useMemo(
    () =>
      normalizeResearchDocumentContent(
        effectiveVersion?.content_json ?? research?.content_json ?? null,
        research?.type
      ),
    [effectiveVersion?.content_json, research?.content_json, research?.type]
  )

  const editableWorkspaceContent = useMemo(() => {
    if (canReview) {
      return normalizeResearchDocumentContent(
        teacherDraft?.content_json ??
          effectiveVersion?.content_json ??
          research?.content_json ??
          null,
        research?.type
      )
    }

    if (isAuthor) {
      return normalizeResearchDocumentContent(
        studentDraft?.content_json ??
          research?.content_json ??
          effectiveVersion?.content_json ??
          null,
        research?.type
      )
    }

    return selectedVersionContent
  }, [
    canReview,
    effectiveVersion?.content_json,
    isAuthor,
    research?.content_json,
    selectedVersionContent,
    studentDraft?.content_json,
    teacherDraft?.content_json,
    research?.type,
  ])

  useEffect(() => {
    setWorkspaceContent(editableWorkspaceContent)
  }, [editableWorkspaceContent])

  const currentPageHref = useMemo(
    () =>
      buildPathWithSearch(`/dashboard/research/${researchId}/annotate`, [
        ['version', selectedVersionNumber ? String(selectedVersionNumber) : null],
        ['from', searchParams.get('from')],
      ]),
    [researchId, searchParams, selectedVersionNumber]
  )
  const hasPdf = submissionFormat === 'pdf' || submissionFormat === 'both'
  const hasText = submissionFormat === 'text' || submissionFormat === 'both'
  const canEditTextWorkspace =
    activeFormat === 'text' &&
    hasText &&
    Boolean(latestVersion) &&
    effectiveVersionNumber === latestVersion.version_number &&
    canParticipate

  useEffect(() => {
    if (activeFormat === 'pdf' && !hasPdf && hasText) {
      setActiveFormat('text')
    }

    if (activeFormat === 'text' && !hasText && hasPdf) {
      setActiveFormat('pdf')
    }
  }, [activeFormat, hasPdf, hasText])

  const formatAwareAnnotations = useMemo(() => {
    return annotations.filter((annotation) =>
      activeFormat === 'pdf'
        ? isPdfAnnotation(annotation)
        : isTextAnnotationPosition(annotation.position_data)
    )
  }, [activeFormat, annotations])

  const unresolvedAnnotations = formatAwareAnnotations.filter(
    (annotation) => !annotation.is_resolved
  )
  const resolvedAnnotations = formatAwareAnnotations.filter((annotation) => annotation.is_resolved)

  const displayedAnnotations = useMemo(() => {
    let filtered = formatAwareAnnotations

    if (filter === 'unresolved') {
      filtered = unresolvedAnnotations
    } else if (filter === 'resolved') {
      filtered = resolvedAnnotations
    }

    return [...filtered].sort((first, second) => {
      if (first.is_resolved !== second.is_resolved) {
        return first.is_resolved ? 1 : -1
      }

      if (activeFormat === 'text') {
        const firstOffset = isTextAnnotationPosition(first.position_data)
          ? first.position_data.startOffset
          : 0
        const secondOffset = isTextAnnotationPosition(second.position_data)
          ? second.position_data.startOffset
          : 0
        return firstOffset - secondOffset
      }

      const pageA = Array.isArray(first.position_data)
        ? Number((first.position_data[0] as { pageIndex?: number } | undefined)?.pageIndex ?? 0)
        : 0
      const pageB = Array.isArray(second.position_data)
        ? Number((second.position_data[0] as { pageIndex?: number } | undefined)?.pageIndex ?? 0)
        : 0

      return pageA - pageB
    })
  }, [activeFormat, filter, formatAwareAnnotations, resolvedAnnotations, unresolvedAnnotations])

  useEffect(() => {
    if (activeFormat !== 'text') {
      setActiveTextAnnotationId(null)
      return
    }

    const highlightRegistry = getHighlightRegistry()
    const Highlight = getHighlightConstructor()

    if (!highlightRegistry || !Highlight) {
      return
    }

    const openRanges: Range[] = []
    const resolvedRanges: Range[] = []
    let activeRange: Range | null = null
    const nextRanges: Record<string, Range> = {}

    for (const annotation of annotations) {
      if (!isTextAnnotationPosition(annotation.position_data)) {
        continue
      }

      const editorRoot = getEditorRoot(sectionRefs.current[annotation.position_data.sectionKey])

      if (!editorRoot) {
        continue
      }

      const range = resolveTextAnnotationRange(editorRoot, annotation.position_data)

      if (!range) {
        continue
      }

      nextRanges[annotation.id] = range

      if (annotation.id === activeTextAnnotationId) {
        activeRange = range
      } else if (annotation.is_resolved) {
        resolvedRanges.push(range)
      } else {
        openRanges.push(range)
      }
    }

    textAnnotationRangesRef.current = nextRanges

    if (openRanges.length > 0) {
      highlightRegistry.set('trackademia-text-feedback-open', new Highlight(...openRanges))
    } else {
      highlightRegistry.delete('trackademia-text-feedback-open')
    }

    if (resolvedRanges.length > 0) {
      highlightRegistry.set('trackademia-text-feedback-resolved', new Highlight(...resolvedRanges))
    } else {
      highlightRegistry.delete('trackademia-text-feedback-resolved')
    }

    if (activeRange) {
      highlightRegistry.set('trackademia-text-feedback-active', new Highlight(activeRange))
    } else {
      highlightRegistry.delete('trackademia-text-feedback-active')
    }

    return () => {
      highlightRegistry.delete('trackademia-text-feedback-open')
      highlightRegistry.delete('trackademia-text-feedback-resolved')
      highlightRegistry.delete('trackademia-text-feedback-active')
    }
  }, [
    activeFormat,
    activeTextAnnotationId,
    annotations,
    canEditTextWorkspace,
    selectedVersionContent,
    workspaceContent,
  ])

  useEffect(() => {
    const annotationId = searchParams.get('annotationId')

    if (!annotationId || didOpenAnnotationFromQueryRef.current || annotations.length === 0) {
      return
    }

    const annotation = annotations.find((item) => item.id === annotationId)

    if (!annotation) {
      return
    }

    didOpenAnnotationFromQueryRef.current = true
    void openThread(annotation)
  }, [annotations, searchParams])

  const loadWorkspaceData = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      setCurrentUserId(user.id)

      const [{ data: profile }, { data: researchData, error: researchError }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase
          .from('research')
          .select(
            'id, title, type, user_id, members, current_stage, status, submission_format, content_json, file_url, original_file_name'
          )
          .eq('id', researchId)
          .single(),
      ])

      if (researchError || !researchData) {
        throw new Error('Research record not found.')
      }

      setCurrentUserRole(profile?.role ?? null)
      setResearch(researchData)
      setResearchStatus(researchData.status ?? 'Pending Review')

      const { data: versionsData } = await supabase
        .from('research_versions')
        .select(
          'id, version_number, version_major, version_minor, version_label, created_by_role, change_type, change_summary, created_at, original_file_name, file_url, content_json'
        )
        .eq('research_id', researchId)
        .order('version_number', { ascending: false })

      const versionRows: VersionSnapshot[] =
        versionsData && versionsData.length > 0
          ? versionsData
          : [
              {
                id: 'legacy',
                version_number: 1,
                version_label: '1',
                created_by_role: 'student',
                created_at: new Date().toISOString(),
                original_file_name: researchData.original_file_name,
                file_url: researchData.file_url,
                content_json: researchData.content_json,
              },
            ]

      setAvailableVersions(versionRows)

      const { data: draftsData, error: draftsError } = await supabase
        .from('research_drafts')
        .select(
          'id, research_id, owner_role, owner_user_id, content_json, updated_at, change_summary, base_version_id'
        )
        .eq('research_id', researchId)

      if (!draftsError && draftsData) {
        setWorkspaceDrafts(draftsData)
      } else {
        setWorkspaceDrafts([])
      }

      const selectedVersion =
        versionRows.find((version) => version.version_number === selectedVersionNumber) ??
        versionRows[0]
      const selectedVersionFileUrl =
        selectedVersion?.version_number != null
          ? await getResearchFileForVersion(researchId, selectedVersion.version_number)
          : await getResearchFile(researchId)
      setFileUrl(selectedVersionFileUrl ?? null)

      const selectedContent = normalizeResearchDocumentContent(
        selectedVersion?.content_json ?? researchData.content_json,
        researchData.type
      )
      const derivedSubmissionFormat = resolveResearchSubmissionFormat(
        researchData.submission_format,
        {
          hasPdf: Boolean(selectedVersion?.file_url ?? researchData.file_url),
          hasText: hasResearchTextContent(selectedContent, researchData.current_stage),
          stage: researchData.current_stage,
        }
      )
      setSubmissionFormat(derivedSubmissionFormat)
      setActiveFormat((current) => {
        if (derivedSubmissionFormat === 'text') return 'text'
        if (derivedSubmissionFormat === 'pdf') return 'pdf'
        return current
      })

      const annotationRows = await getAnnotations(researchId, selectedVersion?.version_number ?? null)
      setAnnotations(annotationRows as AnnotationRecord[])
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load the unified review workspace.'
      setLoadError(message)
    } finally {
      setIsLoading(false)
    }
  }, [researchId, router, selectedVersionNumber, supabase])

  useEffect(() => {
    void loadWorkspaceData()
  }, [loadWorkspaceData])

  useEffect(() => {
    if (!selectedAnnotation) {
      return
    }

    const nextSelectedAnnotation = annotations.find(
      (annotation) => annotation.id === selectedAnnotation.id
    )

    if (!nextSelectedAnnotation) {
      closeThread()
      return
    }

    if (
      nextSelectedAnnotation.is_resolved !== selectedAnnotation.is_resolved ||
      nextSelectedAnnotation.comment_text !== selectedAnnotation.comment_text ||
      nextSelectedAnnotation.quote !== selectedAnnotation.quote
    ) {
      setSelectedAnnotation(nextSelectedAnnotation)
    }
  }, [annotations, selectedAnnotation])

  useEffect(() => {
    const channel = supabase
      .channel(`research-status:${researchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'research',
          filter: `id=eq.${researchId}`,
        },
        (payload: {
          new?: Partial<ResearchRecord> & { status?: string | null; current_stage?: string | null }
        }) => {
          const nextRecord = payload.new

          if (!nextRecord) {
            return
          }

          setResearch((current) => (current ? { ...current, ...nextRecord } : current))

          if (typeof nextRecord.status === 'string' && nextRecord.status.length > 0) {
            setResearchStatus(nextRecord.status)
          }

        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [researchId, supabase])

  useEffect(() => {
    const channel = supabase
      .channel(`research-annotations:${researchId}:${selectedVersionNumber ?? 'latest'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'annotations',
          filter: `research_id=eq.${researchId}`,
        },
        async () => {
          const nextAnnotations = await getAnnotations(researchId, selectedVersionNumber ?? null)
          setAnnotations(nextAnnotations as AnnotationRecord[])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [researchId, selectedVersionNumber, supabase])

  useEffect(() => {
    if (!selectedAnnotation) {
      return
    }

    const channel = supabase
      .channel(`annotation-thread:${selectedAnnotation.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'annotation_replies',
          filter: `annotation_id=eq.${selectedAnnotation.id}`,
        },
        async () => {
          const replies = await getReplies(selectedAnnotation.id)
          setThreadReplies(replies)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedAnnotation, supabase])

  const registerHighlightRef = (annotationId: string, node: HTMLElement | null) => {
    highlightRefs.current[annotationId] = node
  }

  const openThread = async (annotation: AnnotationRecord) => {
    setSelectedAnnotation(annotation)
    setViewMode('thread')
    setIsLoadingReplies(true)
    setThreadReplies([])

    if (isTextAnnotationPosition(annotation.position_data)) {
      setActiveTextAnnotationId(annotation.id)

      const sectionContainer = sectionRefs.current[annotation.position_data.sectionKey]
      const editorRoot = getEditorRoot(sectionContainer)
      const range =
        textAnnotationRangesRef.current[annotation.id] ??
        (editorRoot ? resolveTextAnnotationRange(editorRoot, annotation.position_data) : null)

      if (sectionContainer) {
        sectionContainer.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }

      if (range) {
        requestAnimationFrame(() => {
          const rect = range.getBoundingClientRect()
          const targetTop = window.scrollY + rect.top - window.innerHeight * 0.28
          window.scrollTo({
            top: Math.max(0, targetTop),
            behavior: 'smooth',
          })
        })
      }
    } else {
      setActiveTextAnnotationId(null)
      highlightRefs.current[annotation.id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }

    const replies = await getReplies(annotation.id)
    setThreadReplies(replies)
    setIsLoadingReplies(false)
  }

  const closeThread = () => {
    setSelectedAnnotation(null)
    setActiveTextAnnotationId(null)
    setViewMode('list')
    setThreadReplies([])
  }

  const jumpToNextUnresolved = () => {
    const currentIndex = unresolvedAnnotations.findIndex(
      (annotation) => annotation.id === selectedAnnotation?.id
    )
    const nextAnnotation =
      currentIndex >= 0
        ? unresolvedAnnotations[currentIndex + 1] || unresolvedAnnotations[0]
        : unresolvedAnnotations[0]

    if (nextAnnotation) {
      void openThread(nextAnnotation)
    }
  }

  const handleTextSelection = (sectionKey: string) => {
    if (!canReview || !canEditTextWorkspace) return

    const selection = window.getSelection()
    const sectionContainer = sectionRefs.current[sectionKey]
    const editorRoot = getEditorRoot(sectionContainer)

    if (!selection || selection.rangeCount === 0 || !editorRoot) {
      setActiveTextSelection(null)
      return
    }

    const range = selection.getRangeAt(0)
    if (range.collapsed || !editorRoot.contains(range.commonAncestorContainer)) {
      setActiveTextSelection(null)
      return
    }

    setActiveTextSelection(getTextSelectionDetails(range, editorRoot, sectionKey))
  }

  const normalizeAreas = (areas: PdfHighlightArea[]) => {
    return areas.map((area) => ({
      pageIndex: area.pageIndex,
      top: area.top / 100,
      left: area.left / 100,
      width: area.width / 100,
      height: area.height / 100,
    }))
  }

  const denormalizeArea = (area: PdfHighlightArea) => ({
    ...area,
    top: area.top * 100,
    left: area.left * 100,
    width: area.width * 100,
    height: area.height * 100,
  })

  const handleAddAnnotation = async () => {
    if (!canReview || !commentText.trim()) return

    setIsSubmittingAnnotation(true)

    try {
      if (activeFormat === 'pdf') {
        if (!activePdfHighlight?.selectedText || !activePdfHighlight.highlightAreas.length) return

        const saved = await addAnnotation(
          researchId,
          {
            selectedText: activePdfHighlight.selectedText,
            highlightAreas: normalizeAreas(activePdfHighlight.highlightAreas),
          },
          commentText
        )

        setAnnotations((current) => [...current, saved as AnnotationRecord])
      } else {
        if (!activeTextSelection?.selectedText) return

        const saved = await addAnnotation(
          researchId,
          {
            selectedText: activeTextSelection.selectedText,
            highlightAreas: {
              type: 'text',
              sectionKey: activeTextSelection.sectionKey,
              selectedText: activeTextSelection.selectedText,
              prefixText: activeTextSelection.prefixText,
              suffixText: activeTextSelection.suffixText,
              startOffset: activeTextSelection.startOffset,
              endOffset: activeTextSelection.endOffset,
            },
          },
          commentText
        )

        setAnnotations((current) => [...current, saved as AnnotationRecord])
      }

      setCommentText('')
      setShowCommentBox(false)
      setActivePdfHighlight(null)
      setActiveTextSelection(null)
      setFilter('unresolved')
    } finally {
      setIsSubmittingAnnotation(false)
    }
  }

  const handleToggleResolve = async (annotationId: string, currentStatus: boolean) => {
    if (!canParticipate) return

    setAnnotations((current) =>
      current.map((annotation) =>
        annotation.id === annotationId
          ? { ...annotation, is_resolved: !currentStatus }
          : annotation
      )
    )

    if (selectedAnnotation?.id === annotationId) {
      setSelectedAnnotation((current) =>
        current ? { ...current, is_resolved: !currentStatus } : current
      )
    }

    try {
      await toggleAnnotationResolved(annotationId, !currentStatus)
    } catch {
      setAnnotations((current) =>
        current.map((annotation) =>
          annotation.id === annotationId
            ? { ...annotation, is_resolved: currentStatus }
            : annotation
        )
      )
    }
  }

  const handleSendReply = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!replyText.trim() || !selectedAnnotation || isSubmittingReply) return

    setIsSubmittingReply(true)
    try {
      const newReply = await addReply(selectedAnnotation.id, replyText)
      if (newReply) {
        setThreadReplies((current) => [...current, newReply])
        setReplyText('')
      }
    } finally {
      setIsSubmittingReply(false)
    }
  }

  const handleStudentDraftSave = async () => {
    setIsSavingDraft(true)
    setActionFeedback(null)

    try {
      await saveStudentWorkspaceDraft(researchId, workspaceContent, changeSummary || null)
      setActionFeedback('Draft saved in the unified editor.')
      await loadWorkspaceData()
    } catch (error) {
      setActionFeedback(error instanceof Error ? error.message : 'Failed to save draft.')
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleStudentSubmit = async () => {
    setIsSubmittingVersion(true)
    setActionFeedback(null)

    try {
      const result = await submitStudentWorkspaceVersion(
        researchId,
        workspaceContent,
        changeSummary || null
      )
      setActionFeedback(`Submitted as version ${result.versionLabel}.`)
      await loadWorkspaceData()
    } catch (error) {
      setActionFeedback(error instanceof Error ? error.message : 'Failed to submit version.')
    } finally {
      setIsSubmittingVersion(false)
    }
  }

  const handleTeacherSave = async () => {
    setIsSavingReviewEdit(true)
    setActionFeedback(null)

    try {
      const result = await saveTeacherWorkspaceVersion(
        researchId,
        workspaceContent,
        changeSummary || null
      )
      setActionFeedback(`Review edit saved as version ${result.versionLabel}.`)
      await loadWorkspaceData()
    } catch (error) {
      setActionFeedback(error instanceof Error ? error.message : 'Failed to save review edit.')
    } finally {
      setIsSavingReviewEdit(false)
    }
  }

  const handleReviewDecision = async (nextStatus: 'Revision Requested' | 'Approved') => {
    setIsUpdatingDecision(true)

    try {
      const status = await updateReviewDecision(researchId, nextStatus)
      setResearchStatus(status)
      setActionFeedback(`Research status updated to ${status}.`)
    } finally {
      setIsUpdatingDecision(false)
    }
  }

  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget: (renderProps: RenderHighlightTargetProps) =>
      canReview ? (
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-lg"
          style={{
            left: `${renderProps.selectionRegion.left}%`,
            top: `${renderProps.selectionRegion.top + renderProps.selectionRegion.height}%`,
            position: 'absolute',
            transform: 'translateY(8px)',
            zIndex: 20,
          }}
          onClick={() => {
            setActivePdfHighlight(renderProps)
            setShowCommentBox(true)
            setActiveTextSelection(null)
          }}
        >
          Add feedback
        </button>
      ) : (
        <></>
      ),
    renderHighlights: (renderProps: RenderHighlightsProps) => (
      <div>
        {annotations
          .filter((annotation) => Array.isArray(annotation.position_data))
          .map((annotation) => (
            <React.Fragment key={annotation.id}>
              {(annotation.position_data as PdfHighlightArea[])
                .filter((area) => area.pageIndex === renderProps.pageIndex)
                .map((area, index) => {
                  const highlightArea = denormalizeArea(area)
                  return (
                    <div
                      key={`${annotation.id}-${index}`}
                      ref={(node) => registerHighlightRef(annotation.id, node)}
                      onClick={() => void openThread(annotation)}
                      className="cursor-pointer rounded"
                      style={{
                        ...renderProps.getCssProperties(highlightArea, renderProps.rotation),
                        background:
                          selectedAnnotation?.id === annotation.id
                            ? 'rgba(37, 99, 235, 0.42)'
                            : annotation.is_resolved
                              ? 'rgba(34, 197, 94, 0.28)'
                              : 'rgba(250, 204, 21, 0.35)',
                        boxShadow:
                          selectedAnnotation?.id === annotation.id
                            ? '0 0 0 2px rgba(37, 99, 235, 0.5)'
                            : 'none',
                      }}
                    />
                  )
                })}
            </React.Fragment>
          ))}
      </div>
    ),
  })

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm font-semibold text-gray-700 shadow-sm">
          <Loader2 size={18} className="animate-spin text-blue-600" />
          Loading unified review workspace...
        </div>
      </div>
    )
  }

  if (loadError || !research) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 px-6">
        <div className="max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <p className="text-lg font-bold text-gray-900">Workspace unavailable</p>
          <p className="mt-2 text-sm text-gray-600">{loadError ?? 'Unable to open this research.'}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <style jsx global>{`
        ::highlight(trackademia-text-feedback-open) {
          background: rgba(250, 204, 21, 0.38);
        }

        ::highlight(trackademia-text-feedback-resolved) {
          background: rgba(34, 197, 94, 0.22);
        }

        ::highlight(trackademia-text-feedback-active) {
          background: rgba(59, 130, 246, 0.4);
        }
      `}</style>
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <BackButton className="rounded-full border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                Unified Review Workspace
              </p>
              <h1 className="text-xl font-bold text-gray-900">{research.title}</h1>
              <p className="mt-1 text-sm text-gray-500">
                Version {effectiveVersionLabel}
                {effectiveVersion?.created_by_role
                  ? ` • ${effectiveVersion.created_by_role === 'teacher' ? 'Teacher edit' : 'Student submission'}`
                  : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {availableVersions.length > 0 ? (
              <select
                value={String(effectiveVersionNumber)}
                onChange={(event) => {
                  const params = new URLSearchParams(searchParams.toString())
                  params.set('version', event.target.value)
                  router.push(`/dashboard/research/${researchId}/annotate?${params.toString()}`)
                }}
                className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 outline-none"
              >
                {availableVersions.map((version) => (
                  <option key={version.id} value={version.version_number}>
                    Version {getVersionLabel(version)}
                    {version.created_by_role
                      ? ` (${version.created_by_role === 'teacher' ? 'Teacher' : 'Student'})`
                      : ''}
                  </option>
                ))}
              </select>
            ) : null}

            {hasPdf && hasText ? (
              <div className="flex items-center rounded-lg border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setActiveFormat('pdf')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    activeFormat === 'pdf'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormat('text')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    activeFormat === 'text'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Text
                </button>
              </div>
            ) : null}

            <Link
              href={appendFromParam(`/dashboard/research/${researchId}`, currentPageHref)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              <Eye size={16} />
              Details
            </Link>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200 bg-gradient-to-r from-slate-50 via-white to-blue-50 px-6 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">
                Review Status
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <BadgeCheck size={16} className="text-blue-600" />
                {researchStatus}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">
                Unresolved
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <CircleDashed size={16} className="text-amber-500" />
                {unresolvedAnnotations.length} items
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">
                Resolved
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <CheckCircle size={16} className="text-green-600" />
                {resolvedAnnotations.length} threads
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-500">
                Current Mode
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <FileCode2 size={16} className="text-violet-600" />
                {activeFormat === 'pdf'
                  ? 'PDF review'
                  : canEditTextWorkspace
                    ? 'Edit + comment'
                    : 'Version view'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {previousVersion ? (
              <Link
                href={appendFromParam(
                  buildPathWithSearch(`/dashboard/research/${researchId}/compare`, [
                    ['base', String(previousVersion.version_number)],
                    ['target', String(effectiveVersionNumber)],
                  ]),
                  currentPageHref
                )}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <GitCompareArrows size={16} />
                Compare with v{getVersionLabel(previousVersion)}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={jumpToNextUnresolved}
              disabled={unresolvedAnnotations.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MessageSquare size={16} />
              Next unresolved
            </button>
            {canReview ? (
              <>
                <button
                  type="button"
                  disabled={isUpdatingDecision}
                  onClick={() => void handleReviewDecision('Revision Requested')}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
                >
                  {isUpdatingDecision ? <Loader2 size={16} className="animate-spin" /> : null}
                  Request revision
                </button>
                <button
                  type="button"
                  disabled={isUpdatingDecision || unresolvedAnnotations.length > 0}
                  onClick={() => void handleReviewDecision('Approved')}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUpdatingDecision ? <Loader2 size={16} className="animate-spin" /> : null}
                  Approve
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-5xl space-y-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                    Shared Workspace
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-gray-900">{research.title}</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    {activeFormat === 'pdf'
                      ? effectiveVersion?.original_file_name || research.original_file_name || 'Attached manuscript.pdf'
                      : 'Teachers and students work in the same manuscript editor, while history stays in version snapshots.'}
                  </p>
                </div>
                {!canEditTextWorkspace && activeFormat === 'text' && latestVersion ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    You are viewing Version {effectiveVersionLabel}. Switch back to the latest version to keep editing.
                  </div>
                ) : null}
              </div>

              {activeFormat === 'text' && canEditTextWorkspace ? (
                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                      Change Summary
                    </label>
                    <input
                      value={changeSummary}
                      onChange={(event) => setChangeSummary(event.target.value)}
                      placeholder={
                        canReview
                          ? 'Summarize the review edits you made...'
                          : 'Summarize what changed in this draft...'
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    />
                    {actionFeedback ? (
                      <p className="text-sm font-medium text-blue-700">{actionFeedback}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {isAuthor && !canReview ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void handleStudentDraftSave()}
                          disabled={isSavingDraft}
                          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                        >
                          {isSavingDraft ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                          Save draft
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleStudentSubmit()}
                          disabled={isSubmittingVersion}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                          {isSubmittingVersion ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                          {researchStatus === 'Draft' ? 'Submit for review' : 'Resubmit version'}
                        </button>
                      </>
                    ) : null}
                    {canReview ? (
                      <button
                        type="button"
                        onClick={() => void handleTeacherSave()}
                        disabled={isSavingReviewEdit}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        {isSavingReviewEdit ? <Loader2 size={16} className="animate-spin" /> : <Edit3 size={16} />}
                        Save review edit
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : actionFeedback ? (
                <p className="mt-4 text-sm font-medium text-blue-700">{actionFeedback}</p>
              ) : null}
            </div>

            {activeFormat === 'pdf' ? (
              fileUrl ? (
                <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
                  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <Viewer fileUrl={fileUrl} plugins={[highlightPluginInstance]} />
                  </div>
                </Worker>
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
                  No PDF is available for this version.
                </div>
              )
            ) : (
              <ResearchDocumentStructureEditor
                value={canEditTextWorkspace ? workspaceContent : selectedVersionContent}
                onChange={canEditTextWorkspace ? setWorkspaceContent : undefined}
                editable={canEditTextWorkspace}
                onSectionMouseUp={handleTextSelection}
                onSectionRef={(sectionId, node) => {
                  sectionRefs.current[sectionId] = node
                }}
              />
            )}

            {canReview &&
            activeFormat === 'text' &&
            canEditTextWorkspace &&
            activeTextSelection &&
            !showCommentBox ? (
              <button
                type="button"
                onClick={() => {
                  setActivePdfHighlight(null)
                  setShowCommentBox(true)
                }}
                className="fixed z-20 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
                style={{
                  left: Math.min(activeTextSelection.x, window.innerWidth - 200),
                  top: Math.min(activeTextSelection.y + 8, window.innerHeight - 80),
                }}
              >
                Add feedback
              </button>
            ) : null}

            {showCommentBox ? (
              <div className="fixed bottom-6 left-1/2 z-30 w-full max-w-xl -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                      New Feedback
                    </p>
                    <p className="mt-2 text-sm font-medium text-gray-700">
                      {summarizeQuote(
                        activeFormat === 'pdf'
                          ? activePdfHighlight?.selectedText || ''
                          : activeTextSelection?.selectedText || '',
                        180
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCommentBox(false)
                      setCommentText('')
                      setActivePdfHighlight(null)
                      setActiveTextSelection(null)
                    }}
                    className="text-sm font-semibold text-gray-500 transition hover:text-gray-900"
                  >
                    Close
                  </button>
                </div>
                <textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  rows={4}
                  placeholder="Describe the issue or give revision guidance..."
                  className="mt-4 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCommentBox(false)
                      setCommentText('')
                    }}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingAnnotation || !commentText.trim()}
                    onClick={() => void handleAddAnnotation()}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {isSubmittingAnnotation ? <Loader2 size={16} className="animate-spin" /> : null}
                    Save feedback
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative flex w-[400px] flex-col overflow-hidden border-l border-gray-200 bg-white">
          <div
            className="absolute inset-0 flex transition-transform duration-300 ease-in-out"
            style={{ transform: viewMode === 'list' ? 'translateX(0)' : 'translateX(-100%)' }}
          >
            <div className="flex h-full w-full flex-shrink-0 flex-col">
              <div className="border-b border-gray-100 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                    <MessageSquare size={18} className="text-blue-600" />
                    Feedback
                  </h2>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold text-gray-500">
                    {formatAwareAnnotations.length} total
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1">
                  {(['all', 'unresolved', 'resolved'] as const).map((nextFilter) => (
                    <button
                      key={nextFilter}
                      type="button"
                      onClick={() => setFilter(nextFilter)}
                      className={`rounded-md px-2 py-2 text-xs font-bold capitalize transition ${
                        filter === nextFilter
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {nextFilter === 'all'
                        ? `All (${formatAwareAnnotations.length})`
                        : nextFilter === 'unresolved'
                          ? `Open (${unresolvedAnnotations.length})`
                          : `Done (${resolvedAnnotations.length})`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {displayedAnnotations.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                    No feedback in this view yet.
                  </div>
                ) : (
                  displayedAnnotations.map((annotation) => (
                    <button
                      key={annotation.id}
                      type="button"
                      onClick={() => void openThread(annotation)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        selectedAnnotation?.id === annotation.id
                          ? 'border-blue-400 bg-blue-50 shadow-sm ring-2 ring-blue-100'
                          : annotation.is_resolved
                            ? 'border-green-100 bg-green-50/30 hover:bg-green-50'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                          {getAnnotationLocationLabel(annotation)}
                        </span>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                          v{effectiveVersionLabel}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            annotation.is_resolved
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {annotation.is_resolved ? 'Resolved' : 'Needs review'}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-gray-900">
                        {annotation.comment_text}
                      </p>
                      <p className="mt-3 truncate text-xs italic text-gray-500">
                        &ldquo;{summarizeQuote(annotation.quote, 56)}&rdquo;
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex h-full w-full flex-shrink-0 flex-col bg-white">
              {selectedAnnotation ? (
                <>
                  <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 p-4">
                    <button
                      type="button"
                      onClick={closeThread}
                      className="flex items-center gap-1 text-sm font-medium text-gray-500 transition hover:text-gray-900"
                    >
                      <ChevronLeft size={16} />
                      Back to list
                    </button>
                    {canParticipate ? (
                      <button
                        type="button"
                        onClick={() =>
                          void handleToggleResolve(
                            selectedAnnotation.id,
                            selectedAnnotation.is_resolved
                          )
                        }
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          selectedAnnotation.is_resolved
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {selectedAnnotation.is_resolved ? 'Resolved' : 'Mark resolved'}
                      </button>
                    ) : null}
                  </div>

                  <div className="flex-1 space-y-5 overflow-y-auto p-5">
                    <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700">
                        Context
                      </p>
                      <p className="mt-2 text-sm italic leading-relaxed text-gray-700">
                        &ldquo;{selectedAnnotation.quote}&rdquo;
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">
                        Feedback
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-gray-800">
                        {selectedAnnotation.comment_text}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
                        Replies
                      </p>
                      {isLoadingReplies ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader2 size={16} className="animate-spin" />
                          Loading replies...
                        </div>
                      ) : threadReplies.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-400">
                          No replies yet.
                        </div>
                      ) : (
                        threadReplies.map((reply) => (
                          <div key={reply.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-gray-900">
                                {reply.profiles?.first_name || 'User'} {reply.profiles?.last_name || ''}
                              </p>
                              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                                {reply.profiles?.role || 'participant'}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-gray-700">
                              {reply.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <form onSubmit={handleSendReply} className="border-t border-gray-100 p-4">
                    <textarea
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                      rows={3}
                      placeholder="Reply to this feedback..."
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    />
                    <div className="mt-3 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSubmittingReply || !replyText.trim()}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {isSubmittingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Send reply
                      </button>
                    </div>
                  </form>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
