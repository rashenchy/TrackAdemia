'use client'

import { useState } from 'react'
import { Users, Search, Loader2, AlertCircle, Trash2, UserCheck } from 'lucide-react'
import { getAllUsers, deleteOrBanUser } from './actions'

interface UserProfile {
  id: string
  first_name: string
  last_name: string
  email?: string
  role: 'student' | 'mentor' | 'admin'
  course_program: string
  is_verified: boolean
  updated_at: string
  sectionsCount?: number
  researchCount?: number
}

const roleColors: Record<string, { bg: string; text: string; border: string }> = {
  student: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
  mentor: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
  },
  admin: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
  },
}

interface UserManagementClientProps {
  initialUsers: UserProfile[]
}

export default function UserManagementClient({
  initialUsers,
}: UserManagementClientProps) {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  let filteredUsers = users

  if (roleFilter !== 'all') {
    filteredUsers = filteredUsers.filter((u) => u.role === roleFilter)
  }

  if (searchTerm) {
    const lowerSearch = searchTerm.toLowerCase()
    filteredUsers = filteredUsers.filter(
      (u) =>
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(lowerSearch) ||
        u.email?.toLowerCase().includes(lowerSearch)
    )
  }

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    const result = await getAllUsers()
    setUsers(result)
    setLoading(false)
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This cannot be undone.`)) {
      return
    }

    setActionInProgress(userId)
    const result = await deleteOrBanUser(userId)

    if (result.success) {
      setSuccessMessage(`${userName} has been deleted`)
      setUsers((currentUsers) => currentUsers.filter((u) => u.id !== userId))
      setTimeout(() => setSuccessMessage(null), 3000)
    } else {
      setError(result.error || 'Failed to delete user')
    }

    setActionInProgress(null)
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-start gap-4 mb-8">
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
          <Users size={28} />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            User Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage all users and handle account access
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-800 dark:text-green-300 flex items-center gap-3">
          <UserCheck size={20} />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-300 flex items-center gap-3">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">All Roles</option>
          <option value="student">Student</option>
          <option value="mentor">Mentor</option>
          <option value="admin">Admin</option>
        </select>

        <button
          onClick={loadUsers}
          disabled={loading}
          className="px-4 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-green-600" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <Users size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Users Found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || roleFilter !== 'all' ? 'Try adjusting your search or filters' : 'No users in the system'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Department</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Workload</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Verified</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => {
                  const roleColor = roleColors[user.role]

                  return (
                    <tr
                      key={user.id}
                      className={`border-b border-gray-200 dark:border-gray-800 ${
                        index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/30'
                      } hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user.first_name} {user.last_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${roleColor.bg} ${roleColor.text} ${roleColor.border}`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {user.course_program}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {user.role === 'mentor' ? (
                          <span className="text-xs">
                            {user.sectionsCount} section{user.sectionsCount !== 1 ? 's' : ''}, {user.researchCount} research
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {user.is_verified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-medium">
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDeleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                            disabled={actionInProgress === user.id}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 font-medium text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionInProgress === user.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredUsers.length} of {users.length} user{users.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
