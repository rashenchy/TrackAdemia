'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, Eye, Loader2 } from 'lucide-react'
import { getPublicSignedUrl, recordResearchView } from '@/app/repository/[id]/actions'

export function PublicDownloadButton({ fileUrl, researchId }: { fileUrl: string, researchId: string }) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isViewing, setIsViewing] = useState(false)
  
  // Use a ref to ensure we only count 1 view per page load in React Strict Mode
  const hasViewed = useRef(false)

  // NEW: Record view on mount
  useEffect(() => {
    if (researchId && !hasViewed.current) {
      hasViewed.current = true
      recordResearchView(researchId)
    }
  }, [researchId])

  const handleDownload = async () => {
    setIsDownloading(true)
    const result = await getPublicSignedUrl(fileUrl, true, researchId) // Pass researchId
    setIsDownloading(false)

    if (result?.error) {
      alert(result.error)
      return
    }

    if (result?.url) {
      const link = document.createElement('a')
      link.href = result.url
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleView = async () => {
    setIsViewing(true)
    const result = await getPublicSignedUrl(fileUrl, false)
    setIsViewing(false)

    if (result?.error) {
      alert(result.error)
      return
    }

    if (result?.url) {
      window.open(result.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
      <button
        onClick={handleView}
        disabled={isViewing || isDownloading}
        className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-900/40 dark:hover:bg-gray-700 rounded-xl font-bold transition-all disabled:opacity-50 text-sm shadow-sm w-full sm:w-auto"
      >
        {isViewing ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
        {isViewing ? 'Opening...' : 'View Document'}
      </button>

      <button
        onClick={handleDownload}
        disabled={isDownloading || isViewing}
        className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold transition-colors disabled:opacity-50 text-sm shadow-md w-full sm:w-auto"
      >
        {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
        {isDownloading ? 'Preparing...' : 'Download PDF'}
      </button>
    </div>
  )
}