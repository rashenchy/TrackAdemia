'use client'

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

interface AnnouncementsClientProps {
  initialAnnouncements: Announcement[]
}

export default function AnnouncementsClient({
  initialAnnouncements,
}: AnnouncementsClientProps) {
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

  const loadAnnouncements = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAnnouncements()
      setAnnouncements(data)
    } catch (err) {
      setError('Failed to load announcements')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

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
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      try {
        const success = await deleteAnnouncement(id)
        if (success) {
          await loadAnnouncements()
          setSuccessMessage('Announcement deleted successfully!')
          setTimeout(() => setSuccessMessage(null), 3000)
        }
      } catch {
        setError('Failed to delete announcement')
      }
    }
  }

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const success = await toggleAnnouncementStatus(id, !isActive)
      if (success) {
        await loadAnnouncements()
        setSuccessMessage(`Announcement ${!isActive ? 'activated' : 'deactivated'}!`)
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch {
      setError('Failed to toggle announcement')
    }
  }

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
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
            <Megaphone size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Announcements</h1>
            <p className="text-gray-600 dark:text-gray-400">Create and manage system-wide announcements for all users</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={loadAnnouncements} className="inline-flex items-center gap-2 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Refresh</button>
          <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors"><Plus size={20} />New Announcement</button>
        </div>
      </div>

      {successMessage && <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-800 dark:text-green-300 flex items-center gap-3"><CheckCircle size={20} /><span className="font-medium">{successMessage}</span></div>}
      {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-300 flex items-center gap-3"><AlertCircle size={20} /><span className="font-medium">{error}</span></div>}

      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create New Announcement</h2>
            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"><X size={24} className="text-gray-600 dark:text-gray-400" /></button>
          </div>
          <form onSubmit={handleCreateAnnouncement} className="space-y-4">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter announcement title" className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Enter announcement message" rows={5} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Announcement Type */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Announcement Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as Announcement['type'])}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>

            </div>
            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={submitting} className="flex-1 px-6 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {submitting ? <><Loader2 size={18} className="animate-spin" />Creating...</> : <><CheckCircle size={18} />Create Announcement</>}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">All Announcements ({announcements.length})</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={32} className="animate-spin text-purple-600" /></div>
        ) : announcements.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center"><Bell size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-600" /><p className="text-gray-600 dark:text-gray-400 font-medium">No announcements yet. Create one to get started!</p></div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div key={announcement.id} className={`rounded-2xl border-2 p-6 transition-all ${getTypeColor(announcement.type)}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getTypeBadgeColor(announcement.type)}`}>{announcement.type}</span>
                      {!announcement.is_active && <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 uppercase tracking-wide">Inactive</span>}
                    </div>
                    <h3 className="text-lg font-bold mb-3">{announcement.title}</h3>
                    <p className="mb-4 whitespace-pre-wrap leading-relaxed">{announcement.message}</p>
                    <div className="flex items-center gap-4 text-sm opacity-75">
                      <div className="flex items-center gap-1"><Clock size={16} /><span>{new Date(announcement.created_at).toLocaleDateString()}</span></div>
                      {announcement.expires_at && <div className="flex items-center gap-1"><X size={16} /><span>Expires: {new Date(announcement.expires_at).toLocaleDateString()}</span></div>}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex gap-2">
                    <button onClick={() => handleToggle(announcement.id, announcement.is_active)} className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors" title={announcement.is_active ? 'Deactivate' : 'Activate'}>
                      {announcement.is_active ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    </button>
                    <button onClick={() => handleDelete(announcement.id)} className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors" title="Delete"><Trash2 size={20} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
