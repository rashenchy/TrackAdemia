import Link from 'next/link'

type SearchParams = Record<string, string | string[] | undefined>

function toNumber(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
  return Number.isFinite(parsed) ? parsed : 1
}

function buildHref({
  pathname,
  searchParams,
  page,
  pageParam,
}: {
  pathname: string
  searchParams: SearchParams
  page: number
  pageParam: string
}) {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (key === pageParam) continue
    if (typeof value === 'undefined') continue
    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, entry)
    } else {
      params.set(key, value)
    }
  }

  if (page > 1) {
    params.set(pageParam, String(page))
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export default function PaginationLinks({
  pathname,
  searchParams,
  totalCount,
  pageSize = 10,
  pageParam = 'page',
}: {
  pathname: string
  searchParams: SearchParams
  totalCount: number
  pageSize?: number
  pageParam?: string
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  if (totalPages <= 1) {
    return null
  }

  const page = Math.min(Math.max(toNumber(searchParams[pageParam]), 1), totalPages)
  const start = (page - 1) * pageSize + 1
  const end = Math.min(totalCount, page * pageSize)

  const pages: number[] = []
  const windowStart = Math.max(1, page - 2)
  const windowEnd = Math.min(totalPages, page + 2)
  for (let p = windowStart; p <= windowEnd; p += 1) {
    pages.push(p)
  }

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs font-semibold text-slate-500">
        Showing {start}-{end} of {totalCount}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Link
          aria-disabled={page <= 1}
          className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
            page <= 1
              ? 'pointer-events-none border-slate-200 bg-white text-slate-300'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
          href={buildHref({ pathname, searchParams, page: page - 1, pageParam })}
        >
          Prev
        </Link>

        <div className="flex items-center gap-1">
          {pages.map((p) => (
            <Link
              key={p}
              className={`h-9 min-w-9 rounded-xl border px-3 text-xs font-bold leading-9 transition-colors ${
                p === page
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
              href={buildHref({ pathname, searchParams, page: p, pageParam })}
            >
              {p}
            </Link>
          ))}
        </div>

        <Link
          aria-disabled={page >= totalPages}
          className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
            page >= totalPages
              ? 'pointer-events-none border-slate-200 bg-white text-slate-300'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
          href={buildHref({ pathname, searchParams, page: page + 1, pageParam })}
        >
          Next
        </Link>
      </div>
    </div>
  )
}

