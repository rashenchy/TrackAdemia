'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

function clampPage(page: number, totalPages: number) {
  if (page < 1) return 1
  if (page > totalPages) return totalPages
  return page
}

export default function PaginationControl({
  page,
  pageSize,
  totalCount,
  onPageChange,
  className = '',
}: {
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (nextPage: number) => void
  className?: string
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  if (totalPages <= 1) {
    return null
  }

  const safePage = clampPage(page, totalPages)
  const start = (safePage - 1) * pageSize + 1
  const end = Math.min(totalCount, safePage * pageSize)

  const pages: number[] = []
  const windowStart = Math.max(1, safePage - 2)
  const windowEnd = Math.min(totalPages, safePage + 2)
  for (let p = windowStart; p <= windowEnd; p += 1) {
    pages.push(p)
  }

  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="text-xs font-semibold text-slate-500">
        Showing {start}-{end} of {totalCount}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft size={14} />
          Prev
        </button>

        <div className="flex items-center gap-1">
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`h-9 min-w-9 rounded-xl border px-3 text-xs font-bold transition-colors ${
                p === safePage
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

