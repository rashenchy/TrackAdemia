'use client'

import { useState } from 'react'
import { Download, Eye, Loader2 } from 'lucide-react'
import { getPublicSignedUrl, recordResearchView } from '@/app/repository/[id]/actions'
import { usePopup } from '@/components/ui/PopupProvider'

const ANONYMOUS_VIEW_TTL_MS = 24 * 60 * 60 * 1000

function getAnonymousViewStorageKey(researchId: string) {
  return `public-research-view:${researchId}`
}

// Button component for public repository documents (view + download with analytics)
export function PublicDownloadButton({
  fileUrl,
  researchId,
  downloadFileName,
  guestToken,
}: {
  fileUrl: string
  researchId: string
  downloadFileName?: string | null
  guestToken?: string | null
}) {
  // Loading states for viewing and downloading
  const [isDownloading, setIsDownloading] = useState(false)
  const [isViewing, setIsViewing] = useState(false)
  const { notify } = usePopup()

  // Handle downloading the research file
  const handleDownload = async () => {
    setIsDownloading(true)

    // Request a signed URL configured for download and track the download
    const result = await getPublicSignedUrl(
      fileUrl,
      true,
      researchId,
      downloadFileName || undefined,
      guestToken || undefined
    )

    setIsDownloading(false)

    if (result?.error) {
      notify({
        title: 'Unable to download document',
        message: result.error,
        variant: 'error',
      })
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

  // Handle viewing the research document in a new browser tab
  const handleView = async () => {
    setIsViewing(true)

    const storageKey = getAnonymousViewStorageKey(researchId)
    const now = Date.now()
    const lastViewedAtRaw =
      typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null
    const lastViewedAt = lastViewedAtRaw ? Number(lastViewedAtRaw) : null
    const shouldTrackAnonymousView =
      !lastViewedAt || Number.isNaN(lastViewedAt) || now - lastViewedAt >= ANONYMOUS_VIEW_TTL_MS

    try {
      if (shouldTrackAnonymousView) {
        await recordResearchView(researchId)
        window.localStorage.setItem(storageKey, String(now))
      }
    } catch (error) {
      console.error('Error recording research view:', error)
    }

    // Request a signed URL configured for viewing
    const result = await getPublicSignedUrl(
      fileUrl,
      false,
      researchId,
      undefined,
      guestToken || undefined
    )

    setIsViewing(false)

    if (result?.error) {
      notify({
        title: 'Unable to open document',
        message: result.error,
        variant: 'error',
      })
      return
    }

    // Open the document in a new tab
    if (result?.url) {
      window.open(result.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">

      {/* View Document Button */}
      <button
        onClick={handleView}
        disabled={isViewing || isDownloading}
        className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-900/40 dark:hover:bg-gray-700 rounded-xl font-bold transition-all disabled:opacity-50 text-sm shadow-sm w-full sm:w-auto"
      >
        {isViewing ? <Loader2 size={18} className="animate-spin" /> : <Eye size={18} />}
        {isViewing ? 'Opening...' : 'View Document'}
      </button>

      {/* Download Document Button */}
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
