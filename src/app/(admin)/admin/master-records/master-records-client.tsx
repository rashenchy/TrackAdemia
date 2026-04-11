'use client'

/* =========================================
   IMPORTS
   - React state
   - Icons
   - Server actions for research management
   - Static option helpers
   - UI components (pagination, popup)
========================================= */
import { useState } from 'react'
import { Database, Trash2, AlertCircle, Loader2, Archive, CheckCircle } from 'lucide-react'
import { getAllResearch, forceDeleteResearch, overrideResearchStatus, archiveAllSections } from './actions'
import { RESEARCH_TYPE_OPTIONS, getResearchTypeLabel } from '@/lib/research/types'
import { RESEARCH_STATUS_OPTIONS } from '@/lib/research/status'
import PaginationControl from '@/components/ui/PaginationControl'
import { usePopup } from '@/components/ui/PopupProvider'

/* =========================================
   TYPES
   Represents research data displayed in UI
========================================= */
interface ResearchRecord {
  id: string
  title: string
  type: string
  abstract: string
  status: string
  author_name: string
  adviser_name?: string
  section_name?: string
  created_at: string
  published_at?: string
  views_count: number
  downloads_count: number
}

/* =========================================
   COMPONENT PROPS
   Receives initial research dataset
========================================= */
interface MasterRecordsClientProps {
  initialResearch: ResearchRecord[]
}

export default function MasterRecordsClient({
  initialResearch,
}: MasterRecordsClientProps) {

  /* =========================================
     STATE MANAGEMENT
     - research: main dataset
     - loading/error: fetch states
     - filters: status/type filtering
     - action states: delete/update/archive tracking
     - pagination state
  ========================================= */
  const [research, setResearch] = useState<ResearchRecord[]>(initialResearch)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [archivingInProgress, setArchivingInProgress] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [page, setPage] = useState(1)

  /* =========================================
     POPUP UTILITIES
     - confirm: modal confirmation
     - notify: toast/feedback system
  ========================================= */
  const { confirm, notify } = usePopup()

  /* =========================================
     PAGINATION CONFIG
  ========================================= */
  const pageSize = 10

  /* =========================================
     FILTERING LOGIC
     Applies status + type filters
  ========================================= */
  let filteredResearch = research

  if (statusFilter !== 'all') {
    filteredResearch = filteredResearch.filter((r) => r.status === statusFilter)
  }

  if (typeFilter !== 'all') {
    filteredResearch = filteredResearch.filter((r) => r.type === typeFilter)
  }

  /* =========================================
     PAGINATION CALCULATION
     Ensures valid page range
  ========================================= */
  const normalizedPage = Math.min(page, Math.max(1, Math.ceil(filteredResearch.length / pageSize)))
  const pagedResearch = filteredResearch.slice(
    (normalizedPage - 1) * pageSize,
    normalizedPage * pageSize
  )

  /* =========================================
     LOAD RESEARCH
     Fetches latest dataset from server
  ========================================= */
  const loadResearch = async () => {
    setLoading(true)
    setError(null)

    const result = await getAllResearch()
    setResearch(result)

    setLoading(false)
  }

  /* =========================================
     DELETE RESEARCH
     - Confirms action
     - Removes record + updates UI
  ========================================= */
  const handleDeleteResearch = async (researchId: string, title: string) => {
    const confirmed = await confirm({
      title: 'Delete this research record?',
      message: `"${title}" will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete record',
      variant: 'danger',
    })

    if (!confirmed) return

    setActionInProgress(researchId)

    const result = await forceDeleteResearch(researchId)

    if (result.success) {
      setSuccessMessage(`"${title}" has been deleted`)
      notify({
        title: 'Research deleted',
        message: `"${title}" has been deleted.`,
        variant: 'success',
      })
      setResearch((current) => current.filter((r) => r.id !== researchId))
      setTimeout(() => setSuccessMessage(null), 3000)
    } else {
      setError(result.error || 'Failed to delete research')
      notify({
        title: 'Delete failed',
        message: result.error || 'Failed to delete research',
        variant: 'error',
      })
    }

    setActionInProgress(null)
  }

  /* =========================================
     STATUS UPDATE
     - Overrides research status
     - Updates UI optimistically
  ========================================= */
  const handleStatusChange = async (researchId: string, newStatus: string) => {
    setActionInProgress(researchId)

    const result = await overrideResearchStatus(researchId, newStatus)

    if (result.success) {
      setSuccessMessage(`Status updated to "${newStatus}"`)
      notify({
        title: 'Status updated',
        message: `Research status is now "${newStatus}".`,
        variant: 'success',
      })
      setResearch((current) =>
        current.map((r) =>
          r.id === researchId ? { ...r, status: newStatus } : r
        )
      )
      setTimeout(() => setSuccessMessage(null), 3000)
    } else {
      setError(result.error || 'Failed to update status')
      notify({
        title: 'Status update failed',
        message: result.error || 'Failed to update status',
        variant: 'error',
      })
    }

    setActionInProgress(null)
  }

  /* =========================================
     ARCHIVE ALL SECTIONS
     - Bulk admin operation
     - Archives + freezes sections
  ========================================= */
  const handleArchiveAllSections = async () => {
    setArchivingInProgress(true)

    const result = await archiveAllSections()

    if (result.success) {
      setSuccessMessage(
        `${result.archivedCount} section${result.archivedCount !== 1 ? 's' : ''} have been archived`
      )
      setShowArchiveConfirm(false)
      notify({
        title: 'Sections archived',
        message: `${result.archivedCount} section${result.archivedCount !== 1 ? 's have' : ' has'} been archived.`,
        variant: 'success',
      })
      setTimeout(() => setSuccessMessage(null), 5000)
    } else {
      setError(result.error || 'Failed to archive sections')
      notify({
        title: 'Archive failed',
        message: result.error || 'Failed to archive sections',
        variant: 'error',
      })
    }

    setArchivingInProgress(false)
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-start gap-4 mb-8">
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
          <Database size={28} />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Master Records</h1>
          <p className="text-gray-600 dark:text-gray-400">View and manage all research records across the system</p>
        </div>
      </div>

      {successMessage && <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-800 dark:text-green-300 flex items-center gap-3"><CheckCircle size={20} /><span className="font-medium">{successMessage}</span></div>}
      {error && <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-300 flex items-center gap-3"><AlertCircle size={20} /><span className="font-medium">{error}</span></div>}

      <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-blue-900 dark:text-blue-300 mb-2">End of Semester Setup</h2>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">Archive all active sections and freeze them for the semester.</p>
          </div>
          <button onClick={() => setShowArchiveConfirm(true)} disabled={archivingInProgress} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
            {archivingInProgress ? <Loader2 size={18} className="animate-spin" /> : <Archive size={18} />}
            {archivingInProgress ? 'Archiving...' : 'Archive Sections'}
          </button>
        </div>
      </div>

      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Archive All Sections?</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">This will archive and freeze all active sections.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowArchiveConfirm(false)} disabled={archivingInProgress} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold disabled:opacity-50">Cancel</button>
              <button onClick={handleArchiveAllSections} disabled={archivingInProgress} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {archivingInProgress ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
                Archive All
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }} className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500">
          <option value="all">All Statuses</option>
          {RESEARCH_STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }} className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500">
          <option value="all">All Types</option>
          {RESEARCH_TYPE_OPTIONS.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select>
        <button onClick={loadResearch} disabled={loading} className="px-4 py-2.5 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">Refresh</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={32} className="animate-spin text-purple-600" /></div>
      ) : filteredResearch.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center"><Database size={48} className="mx-auto mb-4 text-gray-400" /><h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Research Found</h3><p className="text-gray-600 dark:text-gray-400">No research records match your filters.</p></div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50"><th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Title</th><th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Author</th><th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Type</th><th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Status</th><th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Engagement</th><th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</th></tr></thead>
              <tbody>
                {pagedResearch.map((item, index) => (
                  <tr key={item.id} className={`border-b border-gray-200 dark:border-gray-800 ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/30'} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}>
                    <td className="px-6 py-4 text-sm"><div className="max-w-xs"><p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.title}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{new Date(item.created_at).toLocaleDateString()}</p></div></td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{item.author_name}</td>
                    <td className="px-6 py-4 text-sm"><span className="inline-block px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs font-medium border border-purple-200 dark:border-purple-800">{getResearchTypeLabel(item.type)}</span></td>
                    <td className="px-6 py-4 text-sm"><select value={item.status} onChange={(e) => handleStatusChange(item.id, e.target.value)} disabled={actionInProgress === item.id} className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50">{RESEARCH_STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400"><span className="text-xs">Views {item.views_count} • Downloads {item.downloads_count}</span></td>
                    <td className="px-6 py-4 text-sm"><button onClick={() => handleDeleteResearch(item.id, item.title)} disabled={actionInProgress === item.id} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 font-medium text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{actionInProgress === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <PaginationControl
              page={normalizedPage}
              pageSize={pageSize}
              totalCount={filteredResearch.length}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}
    </div>
  )
}
