'use client'

/* =========================================
   IMPORTS
   - React state
   - Icons
   - Server actions (faculty approval logic)
   - Pagination component
========================================= */
import { useState } from 'react'
import { Users, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { getPendingFaculty, verifyFaculty, rejectFaculty } from './actions'
import PaginationControl from '@/components/ui/PaginationControl'

/* =========================================
   TYPES
   Represents faculty account data
========================================= */
interface Faculty {
  id: string
  first_name: string
  last_name: string
  email?: string
  course_program: string
  is_verified: boolean
  updated_at: string
}

/* =========================================
   COMPONENT PROPS
   Initial faculty data passed from server
========================================= */
interface FacultyApprovalClientProps {
  initialFaculty: Faculty[]
}

export default function FacultyApprovalClient({
  initialFaculty,
}: FacultyApprovalClientProps) {

  /* =========================================
     STATE MANAGEMENT
     - faculty: current list
     - loading: refresh state
     - error: error messages
     - verifying: active row action
     - successMessage: feedback UI
     - page: pagination state
  ========================================= */
  const [faculty, setFaculty] = useState<Faculty[]>(initialFaculty)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  /* =========================================
     PAGINATION CONFIG
  ========================================= */
  const pageSize = 10
  const pagedFaculty = faculty.slice((page - 1) * pageSize, page * pageSize)

  /* =========================================
     LOAD PENDING FACULTY
     Refreshes list from server
  ========================================= */
  const loadPendingFaculty = async () => {
    setLoading(true)
    setError(null)

    const result = await getPendingFaculty()
    setFaculty(result)

    setLoading(false)
  }

  /* =========================================
     VERIFY FACULTY
     - Approves account
     - Removes from list
     - Shows success/error feedback
  ========================================= */
  const handleVerify = async (userId: string, firstName: string, lastName: string) => {
    setVerifying(userId)

    const result = await verifyFaculty(userId)

    if (result.success) {
      setSuccessMessage(`${firstName} ${lastName} has been verified successfully!`)
      setFaculty((currentFaculty) => currentFaculty.filter((f) => f.id !== userId))
      setTimeout(() => setSuccessMessage(null), 3000)
    } else {
      setError(result.error || 'Failed to verify faculty member')
    }

    setVerifying(null)
  }

  /* =========================================
     REJECT FACULTY
     - Rejects request
     - Removes from list
     - Shows feedback
  ========================================= */
  const handleReject = async (userId: string, firstName: string, lastName: string) => {
    setVerifying(userId)

    const result = await rejectFaculty(userId)

    if (result.success) {
      setSuccessMessage(`${firstName} ${lastName} request has been rejected.`)
      setFaculty((currentFaculty) => currentFaculty.filter((f) => f.id !== userId))
      setTimeout(() => setSuccessMessage(null), 3000)
    } else {
      setError(result.error || 'Failed to reject faculty member')
    }

    setVerifying(null)
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start gap-4 mb-8">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
          <Users size={28} />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Faculty Approval Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review and verify pending faculty/mentor account requests
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

      <div className="mb-6">
        <button
          onClick={loadPendingFaculty}
          disabled={loading}
          className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : faculty.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-600 dark:text-green-400" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            All Clear!
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            There are no pending faculty verification requests at this time.
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
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Department/Program</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Requested</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedFaculty.map((member, index) => (
                  <tr
                    key={member.id}
                    className={`border-b border-gray-200 dark:border-gray-800 ${
                      index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/30'
                    } hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {member.first_name} {member.last_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {member.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {member.course_program}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(member.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleVerify(member.id, member.first_name, member.last_name)}
                          disabled={verifying === member.id}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {verifying === member.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                          {verifying === member.id ? 'Verifying...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(member.id, member.first_name, member.last_name)}
                          disabled={verifying === member.id}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {verifying === member.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                          {verifying === member.id ? 'Processing...' : 'Reject'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-800/50">
            <PaginationControl
              page={page}
              pageSize={pageSize}
              totalCount={faculty.length}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}
    </div>
  )
}
