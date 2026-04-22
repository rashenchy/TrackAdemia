'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, CheckCircle, XCircle, Loader2, AlertCircle, IdCard } from 'lucide-react'
import { getPendingStudents, verifyStudent, rejectStudent } from './actions'
import PaginationControl from '@/components/ui/PaginationControl'

interface Student {
  id: string
  first_name: string
  last_name: string
  email?: string
  course_program: string
  student_number?: string | null
  is_verified: boolean
  updated_at: string
}

interface StudentVerificationClientProps {
  initialStudents: Student[]
}

export default function StudentVerificationClient({
  initialStudents,
}: StudentVerificationClientProps) {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>(initialStudents)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const pagedStudents = students.slice((page - 1) * pageSize, page * pageSize)

  const loadPendingStudents = async () => {
    setLoading(true)
    setError(null)
    const result = await getPendingStudents()
    setStudents(result)
    setLoading(false)
  }

  const handleVerify = async (userId: string, firstName: string, lastName: string) => {
    setProcessing(userId)
    const result = await verifyStudent(userId)

    if (result.success) {
      setSuccessMessage(`${firstName} ${lastName} has been verified successfully!`)
      setStudents((currentStudents) => currentStudents.filter((student) => student.id !== userId))
      window.dispatchEvent(new CustomEvent('faculty-pending-approvals-changed'))
      router.refresh()
      setTimeout(() => setSuccessMessage(null), 3000)
    } else {
      setError(result.error || 'Failed to verify student')
    }

    setProcessing(null)
  }

  const handleReject = async (userId: string, firstName: string, lastName: string) => {
    setProcessing(userId)
    const result = await rejectStudent(userId)

    if (result.success) {
      setSuccessMessage(`${firstName} ${lastName} registration has been rejected and archived.`)
      setStudents((currentStudents) => currentStudents.filter((student) => student.id !== userId))
      window.dispatchEvent(new CustomEvent('faculty-pending-approvals-changed'))
      router.refresh()
      setTimeout(() => setSuccessMessage(null), 3000)
    } else {
      setError(result.error || 'Failed to process student request')
    }

    setProcessing(null)
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8 flex items-start gap-4">
        <div className="rounded-lg bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
          <Users size={28} />
        </div>
        <div className="flex-1">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Student Verification Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review and approve student accounts before unlocking the full academic workspace.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          <CheckCircle size={20} />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={loadPendingStudents}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-600 dark:text-green-400" />
          <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">All Clear!</h3>
          <p className="text-gray-600 dark:text-gray-400">
            There are no pending student verification requests at this time.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Program</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Student Number</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Requested</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedStudents.map((student, index) => (
                  <tr
                    key={student.id}
                    className={`border-b border-gray-200 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800 ${
                      index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/30'
                    }`}
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                      {student.first_name} {student.last_name}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-gray-600 dark:text-gray-400">
                      {student.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {student.course_program}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 font-mono dark:bg-gray-800">
                        <IdCard size={14} />
                        {student.student_number || 'Not provided'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(student.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleVerify(student.id, student.first_name, student.last_name)}
                          disabled={processing === student.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 font-medium text-green-700 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
                        >
                          {processing === student.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                          {processing === student.id ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(student.id, student.first_name, student.last_name)}
                          disabled={processing === student.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                        >
                          {processing === student.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                          {processing === student.id ? 'Processing...' : 'Reject'}
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
              totalCount={students.length}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}
    </div>
  )
}
