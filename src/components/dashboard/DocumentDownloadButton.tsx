'use client'

import { useState } from 'react'
import { Download, Eye, Loader2 } from 'lucide-react'
import { getSignedViewUrl, getSignedDownloadUrl } from '@/app/(main)/dashboard/fileActions'

// Button component that allows users to view or download a research document
export function DocumentDownloadButton({
  fileUrl,
  downloadFileName,
  stopRowClick = false,
}: {
  fileUrl: string
  downloadFileName?: string | null
  stopRowClick?: boolean
}) {

  // UI loading states for viewing and downloading
  const [isViewing, setIsViewing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Handle viewing the document (opens PDF in a new browser tab)
  const handleView = async () => {
    setIsViewing(true)

    // Request a temporary signed URL for viewing the file
    const result = await getSignedViewUrl(fileUrl)

    setIsViewing(false)

    if (result?.error) {
      alert(result.error)
      return
    }

    // Open the document securely in a new tab
    if (result?.url) {
      window.open(result.url, '_blank', 'noopener,noreferrer')
    }
  }

  // Handle downloading the document (forces a file download)
  const handleDownload = async () => {
    setIsDownloading(true)

    // Request a temporary signed URL configured for download
    const result = await getSignedDownloadUrl(fileUrl, downloadFileName || undefined)

    setIsDownloading(false)

    if (result?.error) {
      alert(result.error)
      return
    }

    if (result?.url) {

      // Create a temporary invisible link to trigger the download
      const link = document.createElement('a')
      link.href = result.url

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Render View and Download buttons with loading indicators
  return (
    <div className="flex flex-wrap items-center gap-2">

      {/* View Button */}
      <button
        onClick={handleView}
        onMouseDown={stopRowClick ? (event) => event.stopPropagation() : undefined}
        disabled={isViewing || isDownloading}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-200 dark:hover:bg-gray-800"
      >
        {isViewing ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
        {isViewing ? 'Opening...' : 'View File'}
      </button>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        onMouseDown={stopRowClick ? (event) => event.stopPropagation() : undefined}
        disabled={isViewing || isDownloading}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
        {isDownloading ? 'Downloading...' : 'Download'}
      </button>

    </div>
  )
}
