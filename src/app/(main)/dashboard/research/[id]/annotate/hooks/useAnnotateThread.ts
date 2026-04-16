import { useCallback, useEffect, useRef, useState } from 'react'
import { type ReadonlyURLSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { addReply, getReplies } from '../actions'
import { getAnnotationSourceType } from '@/lib/research/annotation-versioning'
import { type AnnotationRecord, type ReplyRecord } from '../types'

type ClientLike = ReturnType<typeof createClient>

export function useAnnotateThread({
  supabase,
  annotations,
  hasPdf,
  hasText,
  activeFormat,
  setActiveFormat,
  searchParams,
}: {
  supabase: ClientLike
  annotations: AnnotationRecord[]
  hasPdf: boolean
  hasText: boolean
  activeFormat: 'pdf' | 'text'
  setActiveFormat: (format: 'pdf' | 'text') => void
  searchParams: ReadonlyURLSearchParams
}) {
  const [viewMode, setViewMode] = useState<'list' | 'thread'>('list')
  const [selectedAnnotation, setSelectedAnnotation] = useState<AnnotationRecord | null>(null)
  const [activeTextAnnotationId, setActiveTextAnnotationId] = useState<string | null>(null)
  const [threadReplies, setThreadReplies] = useState<ReplyRecord[]>([])
  const [replyText, setReplyText] = useState('')
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  const [isLoadingReplies, setIsLoadingReplies] = useState(false)
  const didOpenAnnotationFromQueryRef = useRef(false)

  const openThread = useCallback(async (annotation: AnnotationRecord) => {
    setSelectedAnnotation(annotation)
    setViewMode('thread')
    setIsLoadingReplies(true)
    setThreadReplies([])

    const annotationSource = getAnnotationSourceType(annotation)

    if (annotationSource === 'text' && hasText) {
      setActiveFormat('text')
      setActiveTextAnnotationId(annotation.id)
    } else {
      setActiveTextAnnotationId(null)
      if (annotationSource === 'pdf' && hasPdf) {
        setActiveFormat('pdf')
      }
    }

    const replies = await getReplies(annotation.id)
    setThreadReplies(replies)
    setIsLoadingReplies(false)
  }, [hasPdf, hasText, setActiveFormat])

  const closeThread = useCallback(() => {
    setSelectedAnnotation(null)
    setActiveTextAnnotationId(null)
    setViewMode('list')
    setThreadReplies([])
  }, [])

  const handleSendReply = useCallback(async (event?: React.FormEvent) => {
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
  }, [isSubmittingReply, replyText, selectedAnnotation])

  useEffect(() => {
    if (!selectedAnnotation) return

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
  }, [annotations, closeThread, selectedAnnotation])

  useEffect(() => {
    const annotationId = searchParams.get('annotationId')

    if (!annotationId || didOpenAnnotationFromQueryRef.current || annotations.length === 0) {
      return
    }

    const annotation = annotations.find((item) => item.id === annotationId)
    if (!annotation) return

    didOpenAnnotationFromQueryRef.current = true
    void openThread(annotation)
  }, [annotations, openThread, searchParams])

  useEffect(() => {
    if (!selectedAnnotation) return

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

  useEffect(() => {
    if (!selectedAnnotation) return

    const annotationSource = getAnnotationSourceType(selectedAnnotation)
    if (annotationSource === 'text' && activeFormat !== 'text') return
    if (annotationSource === 'pdf' && activeFormat !== 'pdf') return
  }, [activeFormat, selectedAnnotation])

  return {
    viewMode,
    setViewMode,
    selectedAnnotation,
    setSelectedAnnotation,
    activeTextAnnotationId,
    setActiveTextAnnotationId,
    threadReplies,
    setThreadReplies,
    replyText,
    setReplyText,
    isSubmittingReply,
    isLoadingReplies,
    openThread,
    closeThread,
    handleSendReply,
  }
}
