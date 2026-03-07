'use client'

import { createClient } from '@/lib/supabase/client'
import React, { useState, useEffect, use, useRef, useMemo } from 'react'
import { Viewer, Worker } from '@react-pdf-viewer/core'
import {
  highlightPlugin,
  RenderHighlightTargetProps,
  RenderHighlightsProps,
} from '@react-pdf-viewer/highlight'

import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/highlight/lib/styles/index.css'

import { ArrowLeft, CheckCircle, MessageSquare, ChevronLeft, Send, Loader2 } from 'lucide-react'
import Link from 'next/link'

import {
  addAnnotation,
  getAnnotations,
  getResearchFile,
  toggleAnnotationResolved,
  getReplies,
  addReply,
  deleteReply,
  updateReply
} from './actions'

function summarizeQuote(text: string, maxLength = 120) {
  if (!text) return ''
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return cleaned.substring(0, maxLength) + '...'
}

export default function AnnotatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const researchId = resolvedParams.id

  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [annotations, setAnnotations] = useState<any[]>([])

  // --- Filter State ---
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all')

  // --- Phase 2: UX States ---
  const [viewMode, setViewMode] = useState<'list' | 'thread'>('list')
  const [selectedAnnotation, setSelectedAnnotation] = useState<any | null>(null)

  // --- Phase 3: Thread Chat States ---
  const [threadReplies, setThreadReplies] = useState<any[]>([])
  const [replyText, setReplyText] = useState('')
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)
  const [isLoadingReplies, setIsLoadingReplies] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // --- User / Reply Editing State ---
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const [editMessage, setEditMessage] = useState('')

  const [showCommentBox, setShowCommentBox] = useState(false)
  const [activeHighlight, setActiveHighlight] = useState<any | null>(null)
  const [commentText, setCommentText] = useState('')

  const highlightRefs = useRef<Record<string, HTMLElement | null>>({})

  // --- Smart Sorting & Filtering Engine ---
  const displayedAnnotations = useMemo(() => {
    let filtered = annotations
    if (filter === 'unresolved') {
      filtered = annotations.filter(a => !a.is_resolved)
    } else if (filter === 'resolved') {
      filtered = annotations.filter(a => a.is_resolved)
    }

    return filtered.sort((a, b) => {
      if (a.is_resolved !== b.is_resolved) return a.is_resolved ? 1 : -1
      const pageA = a.position_data?.[0]?.pageIndex ?? 0
      const pageB = b.position_data?.[0]?.pageIndex ?? 0
      if (pageA !== pageB) return pageA - pageB
      const topA = a.position_data?.[0]?.top ?? 0
      const topB = b.position_data?.[0]?.top ?? 0
      return topA - topB
    })
  }, [annotations, filter])

  /* Normalize highlight areas */
  function normalizeAreas(areas: any[]) {
    return areas.map(area => ({
      pageIndex: area.pageIndex,
      top: area.top / 100,
      left: area.left / 100,
      width: area.width / 100,
      height: area.height / 100,
    }))
  }

  function denormalizeArea(area: any) {
    return {
      ...area,
      top: area.top * 100,
      left: area.left * 100,
      width: area.width * 100,
      height: area.height * 100,
    }
  }

  /* Add Annotation */
  const handleAddAnnotation = async (highlightData: any, text: string) => {
    if (!highlightData?.selectedText) return
    if (!highlightData?.highlightAreas?.length) return

    const normalizedAreas = normalizeAreas(highlightData.highlightAreas)
    const tempId = Math.random().toString()

    const newAnnotation = {
      id: tempId,
      research_id: researchId,
      quote: highlightData.selectedText,
      comment_text: text,
      position_data: normalizedAreas,
      is_resolved: false,
      created_at: new Date().toISOString()
    }

    setAnnotations(prev => [...prev, newAnnotation])

    try {
      const saved = await addAnnotation(
        researchId,
        { ...highlightData, highlightAreas: normalizedAreas },
        text
      )
      if (saved) setAnnotations(prev => prev.map(a => (a.id === tempId ? saved : a)))
    } catch {
      setAnnotations(prev => prev.filter(a => a.id !== tempId))
    }
  }

  /* Resolve Toggle */
  const handleToggleResolve = async (id: string, currentStatus: boolean) => {
    setAnnotations(prev => prev.map(a => (a.id === id ? { ...a, is_resolved: !currentStatus } : a)))
    if (selectedAnnotation?.id === id) {
      setSelectedAnnotation((prev: any) => ({ ...prev, is_resolved: !currentStatus }))
    }

    try {
      await toggleAnnotationResolved(id, !currentStatus)
    } catch {
      setAnnotations(prev => prev.map(a => (a.id === id ? { ...a, is_resolved: currentStatus } : a)))
      if (selectedAnnotation?.id === id) {
        setSelectedAnnotation((prev: any) => ({ ...prev, is_resolved: currentStatus }))
      }
    }
  }

  // --- Thread Actions ---
  const scrollToHighlight = (id: string) => {
    setTimeout(() => {
      const entry = Object.entries(highlightRefs.current).find(([key]) => key.startsWith(id))
      if (entry?.[1]) entry[1].scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const openThread = async (ann: any) => {
    setSelectedAnnotation(ann)
    setViewMode('thread')
    scrollToHighlight(ann.id)

    // Phase 3: Load Thread Replies
    setIsLoadingReplies(true)
    setThreadReplies([]) // Clear previous
    const replies = await getReplies(ann.id)
    setThreadReplies(replies)
    setIsLoadingReplies(false)
    setTimeout(scrollToBottom, 100)
  }

  const closeThread = () => {
    setSelectedAnnotation(null)
    setViewMode('list')
    setThreadReplies([])
  }

  const handleSendReply = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!replyText.trim() || !selectedAnnotation || isSubmittingReply) return

    setIsSubmittingReply(true)
    try {
      const newReply = await addReply(selectedAnnotation.id, replyText)
      if (newReply) {
        setThreadReplies(prev => [...prev, newReply])
        setReplyText('')
        setTimeout(scrollToBottom, 100)
      }
    } catch (error) {
      console.error(error)
      alert("Failed to send reply. Please try again.")
    } finally {
      setIsSubmittingReply(false)
    }
  }

  /* Highlight Plugin */
  const highlightPluginInstance = highlightPlugin({
    renderHighlightTarget: (renderProps: RenderHighlightTargetProps) => (
      <div
        style={{
          position: 'absolute',
          left: `${renderProps.selectionRegion.left}%`,
          top: `${renderProps.selectionRegion.top + renderProps.selectionRegion.height}%`,
          zIndex: 10,
        }}
      >
        <button
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold shadow hover:bg-blue-700 transition"
          onClick={() => {
            setActiveHighlight(renderProps)
            setShowCommentBox(true)
            renderProps.cancel()
          }}
        >
          Add Feedback
        </button>
      </div>
    ),
    renderHighlights: (renderProps: RenderHighlightsProps) => (
      <div>
        {annotations.map(ann => {
          const isSelected = viewMode === 'thread' && selectedAnnotation?.id === ann.id;
          return (
            <React.Fragment key={ann.id}>
              {ann.position_data?.filter((area: any) => area.pageIndex === renderProps.pageIndex).map((area: any, index: number) => {
                try {
                  const normalized = denormalizeArea(area)
                  const css = renderProps.getCssProperties(normalized, renderProps.rotation)
                  return (
                    <div
                      key={`${ann.id}-${index}`}
                      ref={el => { highlightRefs.current[`${ann.id}-${index}`] = el }}
                      className="cursor-pointer transition-all duration-200"
                      onClick={() => openThread(ann)}
                      style={{
                        ...css,
                        background: ann.is_resolved ? '#86efac' : (isSelected ? '#fcd34d' : '#fef08a'),
                        opacity: ann.is_resolved ? 0.3 : (isSelected ? 0.8 : 0.5),
                        outline: isSelected ? '2px solid #eab308' : 'none',
                        zIndex: isSelected ? 5 : 1
                      }}
                    />
                  )
                } catch { return null }
              })}
            </React.Fragment>
          )
        })}
      </div>
    ),
  })

  useEffect(() => {
    async function loadData() {
      const file = await getResearchFile(researchId)
      if (file) setFileUrl(file)
      const anns = await getAnnotations(researchId)
      setAnnotations(anns)
    }
    loadData()
  }, [researchId])

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }

    getUser()
  }, [])

  if (!fileUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-gray-500">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        Loading manuscript...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/dashboard/research/${researchId}`} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="font-bold text-gray-900 text-lg">Review & Annotate</h1>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 bg-gray-200/50 p-6 overflow-y-auto">
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
            <div className="max-w-4xl mx-auto shadow-lg bg-white">
              <Viewer fileUrl={fileUrl} plugins={[highlightPluginInstance]} />
            </div>
          </Worker>
        </div>

        <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] z-10 relative overflow-hidden">

          <div className="absolute inset-0 flex transition-transform duration-300 ease-in-out" style={{ transform: viewMode === 'list' ? 'translateX(0)' : 'translateX(-100%)' }}>

            {/* --- VIEW MODE: LIST --- */}
            <div className="w-full h-full flex flex-col flex-shrink-0">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                    <MessageSquare size={18} className="text-blue-600" /> Feedback
                  </h2>
                  <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                    {annotations.length} total
                  </span>
                </div>

                <div className="flex p-1 bg-gray-100 rounded-lg">
                  {(['all', 'unresolved', 'resolved'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`flex-1 px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-all duration-200 ${filter === f ? 'bg-white shadow-sm text-blue-600 border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {displayedAnnotations.length === 0 ? (
                  <div className="text-center py-10 px-4 text-gray-400">
                    <CheckCircle size={32} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No {filter !== 'all' ? filter : ''} feedback found.</p>
                  </div>
                ) : (
                  displayedAnnotations.map(ann => (
                    <div
                      key={ann.id}
                      onClick={() => openThread(ann)}
                      className={`p-4 border rounded-xl cursor-pointer transition-all duration-200 group
                        ${ann.is_resolved ? 'border-green-100 bg-green-50/30 hover:bg-green-50 hover:border-green-200' : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'}
                      `}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                          Page {(ann.position_data?.[0]?.pageIndex ?? 0) + 1}
                        </span>
                        {ann.is_resolved && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase">
                            <CheckCircle size={12} /> Resolved
                          </span>
                        )}
                      </div>

                      <p className={`text-sm mb-3 line-clamp-2 ${ann.is_resolved ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
                        {ann.comment_text}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-100">
                        <div className="text-[10px] text-gray-400 italic truncate max-w-[200px]">
                          "{summarizeQuote(ann.quote, 40)}"
                        </div>
                        <span className="text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          View Thread &rarr;
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* --- VIEW MODE: THREAD --- */}
            <div className="w-full h-full flex flex-col flex-shrink-0 bg-white">
              {selectedAnnotation && (
                <>
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <button onClick={closeThread} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 font-medium transition-colors">
                      <ChevronLeft size={16} /> Back to list
                    </button>
                    <button
                      onClick={() => handleToggleResolve(selectedAnnotation.id, selectedAnnotation.is_resolved)}
                      className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-colors ${selectedAnnotation.is_resolved ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      <CheckCircle size={14} />
                      {selectedAnnotation.is_resolved ? 'Resolved' : 'Mark Resolved'}
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 space-y-6">

                    <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100/50 relative">
                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 rounded-l-xl"></div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase text-amber-600 tracking-wider">Context • Page {(selectedAnnotation.position_data?.[0]?.pageIndex ?? 0) + 1}</p>
                      </div>
                      <p className="text-sm italic text-gray-700 leading-relaxed">
                        "{selectedAnnotation.quote}"
                      </p>
                    </div>

                    <div className="space-y-5">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] uppercase font-bold text-gray-400 bg-white px-2">Thread Started</span>
                        <div className="h-4 border-l border-dashed border-gray-200"></div>
                      </div>

                      {/* Original Comment */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 flex-shrink-0 text-sm">
                          {selectedAnnotation.comment_text?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-xs font-bold text-gray-900">Reviewer</span>
                            <span className="text-[10px] text-gray-400">
                              {selectedAnnotation.created_at ? new Date(selectedAnnotation.created_at).toLocaleDateString() : 'Just now'}
                            </span>
                          </div>
                          <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none text-sm text-gray-800 border border-gray-200/50 shadow-sm">
                            {selectedAnnotation.comment_text}
                          </div>
                        </div>
                      </div>

                      {/* Phase 3: Replies */}
                      {isLoadingReplies ? (
                        <div className="flex justify-center py-4">
                          <Loader2 size={16} className="animate-spin text-gray-400" />
                        </div>
                      ) : (
                        <>
                          {threadReplies.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-3 group">
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-600 flex-shrink-0 text-sm">
                                {reply.profiles?.first_name?.charAt(0)?.toUpperCase() || 'U'}
                              </div>

                              <div className="flex-1">
                                <div className="flex items-baseline gap-2 mb-1 justify-between">
                                  <span className="text-xs font-bold text-gray-900">
                                    {reply.profiles?.first_name}
                                  </span>

                                  {/* Edit/Delete Controls */}
                                  {reply.user_id === currentUserId && editingReplyId !== reply.id && (
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => {
                                          setEditingReplyId(reply.id)
                                          setEditMessage(reply.message)
                                        }}
                                        className="text-[10px] text-blue-600 hover:underline"
                                      >
                                        Edit
                                      </button>

                                      <button
                                        onClick={async () => {
                                          await deleteReply(reply.id)
                                          setThreadReplies((prev) =>
                                            prev.filter((r) => r.id !== reply.id)
                                          )
                                        }}
                                        className="text-[10px] text-red-600 hover:underline"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {editingReplyId === reply.id ? (
                                  <div className="flex gap-2">
                                    <input
                                      value={editMessage}
                                      onChange={(e) => setEditMessage(e.target.value)}
                                      className="flex-1 p-2 text-sm border rounded-lg"
                                    />
                                    <button
                                      onClick={async () => {
                                        await updateReply(reply.id, editMessage)
                                        setThreadReplies((prev) =>
                                          prev.map((r) =>
                                            r.id === reply.id ? { ...r, message: editMessage } : r
                                          )
                                        )
                                        setEditingReplyId(null)
                                      }}
                                      className="text-xs font-bold text-blue-600"
                                    >
                                      Save
                                    </button>
                                  </div>
                                ) : (
                                  <div className="bg-white p-3 rounded-2xl rounded-tl-none text-sm text-gray-800 border border-gray-200 shadow-sm">
                                    {reply.message}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* Invisible element to scroll to bottom */}
                      <div ref={messagesEndRef} />

                    </div>
                  </div>

                  {/* Phase 3: Chat Input Form */}
                  <form onSubmit={handleSendReply} className="p-4 border-t border-gray-200 bg-gray-50/50">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={selectedAnnotation.is_resolved ? "Thread is resolved. Reopen to reply." : "Reply to this thread..."}
                        disabled={selectedAnnotation.is_resolved || isSubmittingReply}
                        className="flex-1 rounded-xl border border-gray-300 p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 disabled:bg-gray-100"
                      />
                      <button
                        type="submit"
                        disabled={!replyText.trim() || selectedAnnotation.is_resolved || isSubmittingReply}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        {isSubmittingReply ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- ADD FEEDBACK MODAL --- */}
      {showCommentBox && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white w-[400px] rounded-2xl shadow-2xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Add Feedback</h3>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Highlighted Text</p>
              <p className="text-xs italic text-gray-600 line-clamp-3">
                "{summarizeQuote(activeHighlight?.selectedText)}"
              </p>
            </div>

            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="What needs to be revised here?"
              autoFocus
              className="w-full border border-gray-300 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              rows={4}
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowCommentBox(false)
                  setCommentText('')
                  setActiveHighlight(null)
                }}
                className="text-sm px-4 py-2 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  if (!activeHighlight || !commentText.trim()) return

                  await handleAddAnnotation(activeHighlight, commentText)

                  setShowCommentBox(false)
                  setCommentText('')
                  setActiveHighlight(null)
                  setFilter('unresolved')
                }}
                disabled={!commentText.trim()}
                className="bg-blue-600 text-white text-sm px-6 py-2 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-200"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
