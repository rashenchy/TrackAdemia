'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileImage,
  Layers,
} from 'lucide-react'
import {
  type ResearchDiagramItem,
  getDiagramTypeLabel,
  getDiagramTypeShortLabel,
  getDiagramTypeBadgeStyle,
} from '@/lib/research/diagrams/types'
import { getSignedViewUrl, getSignedDownloadUrl } from '@/app/(main)/dashboard/fileActions'
import { usePopup } from '@/components/ui/PopupProvider'

interface DiagramGalleryLightboxProps {
  diagrams: ResearchDiagramItem[]
  title?: string
  description?: string
  className?: string
}

export function DiagramGalleryLightbox({
  diagrams,
  title = 'System Diagrams & Design Specifications',
  description = 'Technical models including Entity Relationship Diagrams (ERD), Data Flow Diagrams (DFD), and System Architecture.',
  className = '',
}: DiagramGalleryLightboxProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>({})
  const [loadingUrls, setLoadingUrls] = useState<Record<string, boolean>>({})
  const { notify } = usePopup()

  const activeDiagram = activeIndex !== null ? diagrams[activeIndex] : null

  // Resolve signed view URLs for thumbnail preview and lightbox
  const resolveDiagramUrl = useCallback(async (filePath: string) => {
    if (resolvedUrls[filePath] || loadingUrls[filePath]) return

    setLoadingUrls((prev) => ({ ...prev, [filePath]: true }))
    try {
      const res = await getSignedViewUrl(filePath)
      if (res?.url) {
        setResolvedUrls((prev) => ({ ...prev, [filePath]: res.url }))
      }
    } catch (err) {
      console.error('Failed to resolve diagram URL:', err)
    } finally {
      setLoadingUrls((prev) => ({ ...prev, [filePath]: false }))
    }
  }, [resolvedUrls, loadingUrls])

  // Pre-load visible thumbnails
  useEffect(() => {
    diagrams.forEach((d) => {
      if (d.file_url && !resolvedUrls[d.file_url]) {
        resolveDiagramUrl(d.file_url)
      }
    })
  }, [diagrams, resolveDiagramUrl, resolvedUrls])

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (activeIndex === null) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveIndex(null)
        setZoomLevel(1)
      } else if (e.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev !== null && prev < diagrams.length - 1 ? prev + 1 : 0))
        setZoomLevel(1)
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : diagrams.length - 1))
        setZoomLevel(1)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, diagrams.length])

  const handleDownload = async (diagram: ResearchDiagramItem) => {
    const res = await getSignedDownloadUrl(
      diagram.file_url,
      diagram.original_file_name || `${diagram.diagram_type}_diagram.png`
    )
    if (res?.error) {
      notify({
        title: 'Download failed',
        message: res.error,
        variant: 'error',
      })
      return
    }
    if (res?.url) {
      window.open(res.url, '_blank')
    }
  }

  if (!diagrams || diagrams.length === 0) {
    return null
  }

  return (
    <div className={`space-y-4 rounded-xl border border-gray-200 bg-[var(--background)] p-6 shadow-sm dark:border-gray-800 ${className}`}>
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Layers className="text-blue-600" size={20} />
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
          {diagrams.length} {diagrams.length === 1 ? 'Diagram' : 'Diagrams'}
        </span>
      </div>

      {/* Grid of diagram cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {diagrams.map((diagram, index) => {
          const imgUrl = resolvedUrls[diagram.file_url]
          const badgeClass = getDiagramTypeBadgeStyle(diagram.diagram_type)
          const typeLabel = getDiagramTypeLabel(diagram.diagram_type)

          return (
            <div
              key={diagram.id || index}
              onClick={() => {
                setActiveIndex(index)
                setZoomLevel(1)
              }}
              className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50/60 transition-all hover:border-blue-400 hover:bg-white hover:shadow-md dark:border-gray-800 dark:bg-gray-900/40 dark:hover:border-blue-700 dark:hover:bg-gray-900"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                {imgUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgUrl}
                    alt={diagram.title}
                    className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-400">
                    <FileImage size={28} />
                    <span className="text-[11px]">Loading diagram...</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/15 flex items-center justify-center">
                  <span className="rounded-full bg-white/90 p-2 text-slate-800 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 dark:bg-slate-900/90 dark:text-white">
                    <Maximize2 size={16} />
                  </span>
                </div>
              </div>

              <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                <div>
                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeClass}`}
                  >
                    {getDiagramTypeShortLabel(diagram.diagram_type)}
                  </span>
                  <h4 className="mt-1.5 text-sm font-bold text-slate-900 line-clamp-1 dark:text-slate-100">
                    {diagram.title || typeLabel}
                  </h4>
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-1">{typeLabel}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Full-Screen Interactive Lightbox Modal */}
      {activeIndex !== null && activeDiagram && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-sm">
          {/* Lightbox Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 text-white">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`rounded-md border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${getDiagramTypeBadgeStyle(
                  activeDiagram.diagram_type
                )}`}
              >
                {getDiagramTypeLabel(activeDiagram.diagram_type)}
              </span>
              <h3 className="text-base font-bold text-white truncate max-w-md sm:max-w-xl">
                {activeDiagram.title || getDiagramTypeLabel(activeDiagram.diagram_type)}
              </h3>
              <span className="text-xs text-slate-400">
                ({activeIndex + 1} of {diagrams.length})
              </span>
            </div>

            {/* Toolbar Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                title="Reset Zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>

              <button
                type="button"
                onClick={() => handleDownload(activeDiagram)}
                className="ml-2 flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
                title="Download Diagram"
              >
                <Download size={15} />
                Download
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveIndex(null)
                  setZoomLevel(1)
                }}
                className="ml-2 rounded-lg p-2 text-slate-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                title="Close Lightbox (Esc)"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Lightbox Image Stage */}
          <div className="relative flex-1 overflow-auto flex items-center justify-center p-6">
            {resolvedUrls[activeDiagram.file_url] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolvedUrls[activeDiagram.file_url]}
                alt={activeDiagram.title}
                style={{
                  transform: `scale(${zoomLevel})`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-[82vh] max-w-[90vw] object-contain select-none shadow-2xl rounded"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <FileImage size={40} className="animate-pulse" />
                <p className="text-sm">Loading high-resolution diagram...</p>
              </div>
            )}

            {/* Prev / Next Arrows */}
            {diagrams.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setActiveIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : diagrams.length - 1))
                    setZoomLevel(1)
                  }}
                  className="absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/80 p-3 text-white shadow-lg backdrop-blur-sm hover:bg-blue-600 transition-all"
                  title="Previous diagram (Left Arrow)"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveIndex((prev) => (prev !== null && prev < diagrams.length - 1 ? prev + 1 : 0))
                    setZoomLevel(1)
                  }}
                  className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-slate-900/80 p-3 text-white shadow-lg backdrop-blur-sm hover:bg-blue-600 transition-all"
                  title="Next diagram (Right Arrow)"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
