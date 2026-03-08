'use client'

import { useState } from 'react'
import { Download, Eye, Loader2 } from 'lucide-react'
import { getSignedViewUrl, getSignedDownloadUrl } from '@/app/(main)/dashboard/fileActions'

// Button component that allows users to view or download a research document
export function DocumentDownloadButton({ fileUrl }: { fileUrl: string }) {

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
    const result = await getSignedDownloadUrl(fileUrl)

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
    <div className="flex items-center gap-3">

      {/* View Button */}
      <button
        onClick={handleView}
        disabled={isViewing || isDownloading}
        className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-xl font-semibold transition-colors disabled:opacity-50 text-sm"
      >
        {isViewing ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
        {isViewing ? 'Opening...' : 'View'}
      </button>

      {/* Download Button */}
      <button
        onClick={handleDownload}
        disabled={isViewing || isDownloading}
        className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-xl font-semibold transition-colors disabled:opacity-50 text-sm shadow-sm"
      >
        {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
        {isDownloading ? 'Downloading...' : 'Download'}
      </button>

    </div>
  )
}