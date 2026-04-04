'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'
import { MANUAL_RESEARCH_STATUS_OPTIONS } from '@/lib/research-status'

function StatusControls({ currentStatus }: { currentStatus: string }) {
  const { pending } = useFormStatus()
  const [selectedStatus, setSelectedStatus] = useState(
    MANUAL_RESEARCH_STATUS_OPTIONS.some((option) => option.value === currentStatus)
      ? currentStatus
      : ''
  )

  return (
    <>
      <select
        name="status"
        value={selectedStatus}
        onChange={(event) => setSelectedStatus(event.target.value)}
        disabled={pending}
        className="text-sm font-semibold bg-transparent border-none outline-none cursor-pointer pl-2 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <option value="" disabled>
          {currentStatus}
        </option>
        {MANUAL_RESEARCH_STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending || !selectedStatus}
        className="inline-flex min-w-[102px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending && <Loader2 size={14} className="animate-spin" />}
        {pending ? 'Updating...' : 'Update'}
      </button>
    </>
  )
}

export function ResearchStatusForm({
  action,
  currentStatus,
}: {
  action: (formData: FormData) => void
  currentStatus: string
}) {
  return (
    <form
      action={action}
      className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200 shadow-sm w-fit dark:border-gray-800 dark:bg-gray-900/50"
    >
      <StatusControls currentStatus={currentStatus} />
    </form>
  )
}
