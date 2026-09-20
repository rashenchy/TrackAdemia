'use client'

import { useState } from 'react'
import {
  Code2,
  ExternalLink,
  Download,
  Globe,
  FileArchive,
  Check,
  Copy,
  Loader2,
} from 'lucide-react'
import { getSignedDownloadUrl } from '@/app/(main)/dashboard/fileActions'
import { usePopup } from '@/components/ui/PopupProvider'

interface TechnicalArtifactsCardProps {
  repositoryUrl?: string | null
  demoUrl?: string | null
  sourceCodeUrl?: string | null
  sourceCodeFilename?: string | null
  className?: string
}

export function TechnicalArtifactsCard({
  repositoryUrl,
  demoUrl,
  sourceCodeUrl,
  sourceCodeFilename,
  className = '',
}: TechnicalArtifactsCardProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const { notify } = usePopup()

  const hasAnyArtifact = Boolean(repositoryUrl || demoUrl || sourceCodeUrl)

  if (!hasAnyArtifact) return null

  const handleDownloadZip = async () => {
    if (!sourceCodeUrl) return

    setIsDownloading(true)
    try {
      const res = await getSignedDownloadUrl(
        sourceCodeUrl,
        sourceCodeFilename || 'source-code.zip'
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
    } catch (err) {
      console.error('Download error:', err)
      notify({
        title: 'Download error',
        message: 'Unable to start download.',
        variant: 'error',
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleCopyRepo = () => {
    if (!repositoryUrl) return
    navigator.clipboard.writeText(repositoryUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  return (
    <div className={`space-y-4 rounded-xl border border-gray-200 bg-[var(--background)] p-6 shadow-sm dark:border-gray-800 ${className}`}>
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Code2 className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            Source Code &amp; Implementation Deliverables
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Technical Assets
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Repository Link */}
        {repositoryUrl && (
          <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-gray-50/60 p-4 transition-all hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/30">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Code Repository
                </span>
                <button
                  type="button"
                  onClick={handleCopyRepo}
                  className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
                  title="Copy URL"
                >
                  {copiedLink ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 break-all line-clamp-1">{repositoryUrl}</p>
            </div>

            <div className="pt-3 mt-2 border-t border-gray-100 dark:border-gray-800">
              <a
                href={repositoryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-all"
              >
                <Code2 size={14} />
                View Repository
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}

        {/* Live Demo Link */}
        {demoUrl && (
          <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-gray-50/60 p-4 transition-all hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/30">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Live Prototype / Demo
              </span>
              <p className="mt-1 text-xs text-gray-500 break-all line-clamp-1">{demoUrl}</p>
            </div>

            <div className="pt-3 mt-2 border-t border-gray-100 dark:border-gray-800">
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-all"
              >
                <Globe size={14} />
                Open Live Demo
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}

        {/* Downloadable Source Code Archive (.ZIP) */}
        {sourceCodeUrl && (
          <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-gray-50/60 p-4 transition-all hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900/30">
            <div>
              <div className="flex items-center gap-1.5">
                <FileArchive size={16} className="text-amber-600" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Project Archive (.ZIP)
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                {sourceCodeFilename || 'source-code.zip'}
              </p>
            </div>

            <div className="pt-3 mt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={handleDownloadZip}
                disabled={isDownloading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-60 transition-all"
              >
                {isDownloading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                Download Project ZIP
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
