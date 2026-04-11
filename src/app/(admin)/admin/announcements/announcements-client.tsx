'use client'

/* =========================================
   IMPORTS
   - React state
   - Icons
   - Server actions
   - Types
   - UI helpers
========================================= */
import { useState } from 'react'
import {
  Megaphone,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Bell,
  Clock,
} from 'lucide-react'

import {
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement,
  toggleAnnouncementStatus,
} from './actions'

import type { Announcement } from './actions'
import PaginationControl from '@/components/ui/PaginationControl'
import { usePopup } from '@/components/ui/PopupProvider'

/* =========================================
   COMPONENT PROPS
   Initial announcements passed from server
========================================= */
interface AnnouncementsClientProps {
  initialAnnouncements: Announcement[]
}

/* =========================================
   MAIN COMPONENT
========================================= */
export default function AnnouncementsClient({
  initialAnnouncements,
}: AnnouncementsClientProps) {
  /* =========================================
     STATE
  ========================================= */
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [type, setType] = useState<'info' | 'warning' | 'success' | 'urgent'>('info')
  const [expiresAt, setExpiresAt] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [page, setPage] = useState(1)

  const { confirm, notify } = usePopup()
  const pageSize = 10

  /* =========================================
     LOAD ANNOUNCEMENTS
     Refreshes the announcements list
  ========================================= */
  const loadAnnouncements = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await getAnnouncements()
      setAnnouncements(data)
      setPage(1)
    } catch (err) {
      setError('Failed to load announcements')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  /* =========================================
     CREATE ANNOUNCEMENT
     Handles form submission
  ========================================= */
  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !message.trim()) {
      setError('Title and message are required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const result = await createAnnouncement(title, message, type, expiresAt || undefined)

      if (result) {
        setSuccessMessage('Announcement created successfully!')

        notify({
          title: 'Announcement created',
          message: 'Your announcement is now available in the system.',
          variant: 'success',
        })

        setTitle('')
        setMessage('')
        setType('info')
        setExpiresAt('')
        setShowForm(false)

        await loadAnnouncements()
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        setError('Failed to create announcement')
      }
    } catch (err) {
      setError('Error creating announcement')

      notify({
        title: 'Create failed',
        message: 'Error creating announcement',
        variant: 'error',
      })

      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  /* =========================================
     DELETE ANNOUNCEMENT
     Confirms before deleting
  ========================================= */
  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete this announcement?',
      message: 'This announcement will be removed for all users and cannot be restored.',
      confirmLabel: 'Delete announcement',
      variant: 'danger',
    })

    if (!confirmed) return

    try {
      const success = await deleteAnnouncement(id)

      if (success) {
        await loadAnnouncements()
        setSuccessMessage('Announcement deleted successfully!')

        notify({
          title: 'Announcement deleted',
          message: 'The announcement has been removed.',
          variant: 'success',
        })

        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch {
      setError('Failed to delete announcement')

      notify({
        title: 'Delete failed',
        message: 'Failed to delete announcement',
        variant: 'error',
      })
    }
  }

  /* =========================================
     TOGGLE ANNOUNCEMENT STATUS
     Activates or deactivates announcement
  ========================================= */
  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const success = await toggleAnnouncementStatus(id, !isActive)

      if (success) {
        await loadAnnouncements()
        setSuccessMessage(`Announcement ${!isActive ? 'activated' : 'deactivated'}!`)

        notify({
          title: !isActive ? 'Announcement activated' : 'Announcement deactivated',
          message: !isActive
            ? 'The announcement is now visible to users.'
            : 'The announcement is now hidden from users.',
          variant: 'success',
        })

        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch {
      setError('Failed to toggle announcement')

      notify({
        title: 'Update failed',
        message: 'Failed to toggle announcement',
        variant: 'error',
      })
    }
  }

  /* =========================================
     TYPE CARD COLOR
     Returns card classes based on type
  ========================================= */
  const getTypeColor = (currentType: string) => {
    switch (currentType) {
      case 'urgent':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300'
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
    }
  }

  /* =========================================
     TYPE BADGE COLOR
     Returns badge classes based on type
  ========================================= */
  const getTypeBadgeColor = (currentType: string) => {
    switch (currentType) {
      case 'urgent':
        return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
      case 'success':
        return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
      default:
        return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
    }
  }

  return (
    <div className="max-w-6xl space-y-6 pb-8">
      {/* =========================================
         PAGE HEADER
      ========================================= */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-purple-50 p-3 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
            <Megaphone size={28} />
          </div>

          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              Announcements
            </h1>

            <p className="text-gray-600 dark:text-gray-400">
              Create and manage system-wide announcements for all users
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={loadAnnouncements}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 font-semibold transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Refresh
          </button>

          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-700"
          >
            <Plus size={20} />
            New Announcement
          </button>
        </div>
      </div>

      {/* =========================================
         STATUS MESSAGES
      ========================================= */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          <CheckCircle size={20} />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* =========================================
         CREATE FORM
      ========================================= */}
      {showForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Create New Announcement
            </h2>

            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X size={24} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleCreateAnnouncement} className="space-y-4">
            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter announcement title"
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />

            {/* Message */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter announcement message"
              rows={5}
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Announcement Type */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Announcement Type
                </label>

                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as Announcement['type'])}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="success">Success</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Expiration */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Display Until
                </label>

                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Create Announcement
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================
         ANNOUNCEMENTS LIST SECTION
      ========================================= */}
      <div>
        <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
          All Announcements ({announcements.length})
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-purple-600" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
            <Bell size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-600" />

            <p className="font-medium text-gray-600 dark:text-gray-400">
              No announcements yet. Create one to get started!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements
              .slice((page - 1) * pageSize, page * pageSize)
              .map((announcement) => (
                <div
                  key={announcement.id}
                  className={`rounded-2xl border-2 p-6 transition-all ${getTypeColor(announcement.type)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Announcement Content */}
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${getTypeBadgeColor(announcement.type)}`}
                        >
                          {announcement.type}
                        </span>

                        {!announcement.is_active && (
                          <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                            Inactive
                          </span>
                        )}
                      </div>

                      <h3 className="mb-3 text-lg font-bold">{announcement.title}</h3>

                      <p className="mb-4 whitespace-pre-wrap leading-relaxed">
                        {announcement.message}
                      </p>

                      <div className="flex items-center gap-4 text-sm opacity-75">
                        {/* Created Date */}
                        <div className="flex items-center gap-1">
                          <Clock size={16} />
                          <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                        </div>

                        {/* Expiration Date */}
                        {announcement.expires_at && (
                          <div className="flex items-center gap-1">
                            <X size={16} />
                            <span>
                              Expires: {new Date(announcement.expires_at).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-shrink-0 gap-2">
                      <button
                        onClick={() => handleToggle(announcement.id, announcement.is_active)}
                        className="rounded-lg p-2 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                        title={announcement.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {announcement.is_active ? (
                          <CheckCircle size={20} />
                        ) : (
                          <AlertCircle size={20} />
                        )}
                      </button>

                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="rounded-lg p-2 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
                        title="Delete"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* =========================================
         PAGINATION
      ========================================= */}
      <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <PaginationControl
          page={page}
          pageSize={pageSize}
          totalCount={announcements.length}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}