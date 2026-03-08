'use client'

import { useState } from 'react'
import { Download, Eye, Loader2 } from 'lucide-react'
import { getSignedViewUrl, getSignedDownloadUrl } from '@/app/(main)/dashboard/fileActions'

export function DocumentDownloadButton({ fileUrl }: { fileUrl: string }) {
  const [isViewing, setIsViewing] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  // Handler for Viewing (opens in new tab)
  const handleView = async () => {
    setIsViewing(true)
    const result = await getSignedViewUrl(fileUrl)
    setIsViewing(false)

    if (result?.error) {
      alert(result.error)
      return
    }

    if (result?.url) {
      window.open(result.url, '_blank', 'noopener,noreferrer')
    }
  }

  // Handler for Downloading (forces file download)
  const handleDownload = async () => {
    setIsDownloading(true)
    const result = await getSignedDownloadUrl(fileUrl)
    setIsDownloading(false)

    if (result?.error) {
      alert(result.error)
      return
    }

    if (result?.url) {
      // Create an invisible link to cleanly trigger the forced download
      const link = document.createElement('a')
      link.href = result.url
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleView}
        disabled={isViewing || isDownloading}
        className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-xl font-semibold transition-colors disabled:opacity-50 text-sm"
      >
        {isViewing ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
        {isViewing ? 'Opening...' : 'View'}
      </button>
      
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