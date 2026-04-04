'use client'

import { useState } from 'react'
import { BarChart, Download, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { getPublishedResearchForExport, getTopResearch } from '../analytics/actions'
import type { TopResearch } from '../analytics/types'

export default function ReportsPage() {
  const [exporting, setExporting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [topResearch, setTopResearch] = useState<TopResearch[]>([])
  const [loadingMetrics, setLoadingMetrics] = useState(false)

  const generateCSV = (
    data: Record<string, string | number | null | undefined>[],
    filename: string
  ) => {
    if (!data || data.length === 0) {
      setError('No data available to export')
      return
    }

    const headers = Object.keys(data[0])

    const csv = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header]

            if (value === null || value === undefined) {
              return ''
            }

            const normalizedValue = String(value)

            if (
              normalizedValue.includes(',') ||
              normalizedValue.includes('"') ||
              normalizedValue.includes('\n') ||
              normalizedValue.includes('\r')
            ) {
              return `"${normalizedValue.replace(/"/g, '""')}"`
            }

            return normalizedValue
          })
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    setSuccessMessage(`${filename} downloaded successfully!`)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const handleExportPublishedResearch = async () => {
    setExporting(true)
    setError(null)

    try {
      const data = await getPublishedResearchForExport()
      generateCSV(
        data,
        `published-research-${new Date().toISOString().split('T')[0]}.csv`
      )
    } catch (err) {
      setError('Failed to export published research')
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  const handleLoadTopMetrics = async () => {
    setLoadingMetrics(true)
    setError(null)

    try {
      const data = await getTopResearch()
      setTopResearch(data)
      setSuccessMessage(`Loaded ${data.length} top research items`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError('Failed to load top research metrics')
      console.error(err)
    } finally {
      setLoadingMetrics(false)
    }
  }

  const handleExportTopResearch = () => {
    if (topResearch.length === 0) {
      setError('No metrics loaded. Click "Load Metrics" first.')
      return
    }

    const data = topResearch.map((item) => ({
      title: item.title,
      author: item.author_name,
      views: item.views_count,
      downloads: item.downloads_count,
    }))

    generateCSV(
      data,
      `top-research-${new Date().toISOString().split('T')[0]}.csv`
    )
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start gap-4 mb-8">
        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400">
          <BarChart size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Reports & Export
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Generate and export system data for compliance and analysis
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-800 dark:text-green-300 flex items-center gap-3">
          <CheckCircle size={20} />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-300 flex items-center gap-3">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Published Research Report
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Export all published research with author, adviser, type, publication date, views,
                and downloads.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
              CSV Columns:
            </h3>
            <div className="text-xs text-blue-800 dark:text-blue-200 grid grid-cols-2 gap-2">
              <div>- Title</div>
              <div>- Author</div>
              <div>- Adviser</div>
              <div>- Type</div>
              <div>- Date Published</div>
              <div>- Views & Downloads</div>
            </div>
          </div>

          <button
            onClick={handleExportPublishedResearch}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Download size={20} />
            )}
            {exporting ? 'Exporting...' : 'Export as CSV'}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Most Viewed Research
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                View and export the most viewed and downloaded research on the platform.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleLoadTopMetrics}
              disabled={loadingMetrics}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMetrics ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Download size={20} />
              )}
              {loadingMetrics ? 'Loading...' : 'Load Metrics'}
            </button>

            {topResearch.length > 0 && (
              <>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100">
                            Rank
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100">
                            Title
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-100">
                            Author
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-900 dark:text-gray-100">
                            Views
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-900 dark:text-gray-100">
                            Downloads
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {topResearch.map((item, index) => (
                          <tr
                            key={item.id}
                            className={`border-b border-gray-200 dark:border-gray-700 ${
                              index % 2 === 0
                                ? 'bg-white dark:bg-gray-900'
                                : 'bg-gray-50 dark:bg-gray-800/30'
                            }`}
                          >
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                              #{index + 1}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                              {item.title}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                              {item.author_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400 font-medium">
                              {item.views_count}
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400 font-medium">
                              {item.downloads_count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button
                  onClick={handleExportTopResearch}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
                >
                  <Download size={20} />
                  Export This Data as CSV
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-orange-900 dark:text-orange-300 mb-2">
            Report Formats
          </h3>
          <ul className="text-sm text-orange-800 dark:text-orange-200 space-y-2">
            <li className="flex items-start gap-2">
              <Download
                size={18}
                className="flex-shrink-0 mt-0.5 text-orange-600 dark:text-orange-400"
              />
              <span>
                <strong>CSV Format:</strong> All exports use standard CSV format compatible with
                Excel, Google Sheets, and other spreadsheet applications
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Download
                size={18}
                className="flex-shrink-0 mt-0.5 text-orange-600 dark:text-orange-400"
              />
              <span>
                <strong>Date Stamped:</strong> All exports include the current date in the filename
                for easy tracking
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Download
                size={18}
                className="flex-shrink-0 mt-0.5 text-orange-600 dark:text-orange-400"
              />
              <span>
                <strong>Complete Data:</strong> Exports include all relevant metrics and
                information for compliance and analysis
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
