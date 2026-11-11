'use client'

import { Search, Filter, SlidersHorizontal, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { RESEARCH_TYPE_OPTIONS } from '@/lib/research/types'

type YearFilterMode = 'specific' | 'range'

function sanitizeYearInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 4)
}

// Search and filter component for the public and dashboard research repository
export function RepositorySearch({
  basePath = '/dashboard/repository',
  initialQuery = '',
  initialType = 'all',
  initialSort = 'newest',
  initialYearMode = 'specific',
  initialSpecificYear = '',
  initialYearFrom = '',
  initialYearTo = '',
}: {
  basePath?: string
  initialQuery?: string
  initialType?: string
  initialSort?: string
  initialYearMode?: YearFilterMode
  initialSpecificYear?: string
  initialYearFrom?: string
  initialYearTo?: string
}) {
  const router = useRouter()

  // Initialize filter states from existing URL parameters
  const [query, setQuery] = useState(initialQuery)
  const [type, setType] = useState(initialType)
  const [sort, setSort] = useState(initialSort)
  const [yearMode, setYearMode] = useState<YearFilterMode>(initialYearMode)
  const [specificYear, setSpecificYear] = useState(initialSpecificYear)
  const [yearFrom, setYearFrom] = useState(initialYearFrom)
  const [yearTo, setYearTo] = useState(initialYearTo)

  const yearRangeInvalid =
    yearMode === 'range' &&
    yearFrom.length === 4 &&
    yearTo.length === 4 &&
    Number(yearFrom) > Number(yearTo)

  const hasActiveFilters =
    Boolean(query.trim()) ||
    type !== 'all' ||
    sort !== 'newest' ||
    Boolean(specificYear) ||
    Boolean(yearFrom) ||
    Boolean(yearTo) ||
    Boolean(initialQuery) ||
    initialType !== 'all' ||
    initialSort !== 'newest' ||
    Boolean(initialSpecificYear) ||
    Boolean(initialYearFrom) ||
    Boolean(initialYearTo)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (yearRangeInvalid) {
      return
    }

    const params = new URLSearchParams()
    const trimmedQuery = query.trim()

    if (trimmedQuery) params.set('q', trimmedQuery)
    if (type !== 'all') params.set('type', type)
    if (sort !== 'newest') params.set('sort', sort)

    if (yearMode === 'specific') {
      if (specificYear) {
        params.set('yearMode', 'specific')
        params.set('year', specificYear)
      }
    } else if (yearFrom || yearTo) {
      params.set('yearMode', 'range')
      if (yearFrom) params.set('yearFrom', yearFrom)
      if (yearTo) params.set('yearTo', yearTo)
    }

    const queryString = params.toString()
    router.push(queryString ? `${basePath}?${queryString}` : basePath)
  }

  const handleReset = () => {
    setQuery('')
    setType('all')
    setSort('newest')
    setYearMode('specific')
    setSpecificYear('')
    setYearFrom('')
    setYearTo('')
    router.push(basePath)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4"
    >
      {/* Search Input & Submit Button */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, year, keywords, or subject code..."
            aria-label="Search research repository"
            className="w-full min-h-11 pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-[var(--foreground)] outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="submit"
            disabled={yearRangeInvalid}
            className="inline-flex min-h-11 flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Search size={16} aria-hidden="true" />
            Search
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleReset}
              aria-label="Clear search filters"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <RotateCcw size={15} aria-hidden="true" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Sorting Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Research Type Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto text-sm text-gray-500">
            <Filter size={16} className="shrink-0" aria-hidden="true" />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              aria-label="Filter by research type"
              className="w-full sm:w-auto min-h-10 bg-transparent font-semibold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
            >
              <option value="all">All</option>
              {RESEARCH_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Divider between filter and sorting */}
          <div className="hidden sm:block w-px h-4 bg-gray-300 dark:bg-gray-700 mx-2"></div>

          {/* Sorting Options */}
          <div className="flex items-center gap-2 w-full sm:w-auto text-sm text-gray-500">
            <SlidersHorizontal size={16} className="shrink-0" aria-hidden="true" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort results"
              className="w-full sm:w-auto min-h-10 bg-transparent font-semibold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title_asc">Title (A-Z)</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-800/50">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Year</p>
                <p className="text-xs text-gray-500">
                  Filter by a specific year or an inclusive year range. Academic years are matched automatically.
                </p>
              </div>

              <div className="inline-flex w-full sm:w-auto rounded-lg bg-white p-1 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                <button
                  type="button"
                  onClick={() => setYearMode('specific')}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors sm:flex-none ${
                    yearMode === 'specific'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400'
                  }`}
                >
                  Specific
                </button>
                <button
                  type="button"
                  onClick={() => setYearMode('range')}
                  className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors sm:flex-none ${
                    yearMode === 'range'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-blue-600 dark:text-gray-300 dark:hover:text-blue-400'
                  }`}
                >
                  Range
                </button>
              </div>
            </div>

            {yearMode === 'specific' ? (
              <div className="max-w-xs">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                  Year
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={specificYear}
                  onChange={(event) => setSpecificYear(sanitizeYearInput(event.target.value))}
                  placeholder="2025"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition-all focus:border-blue-600 dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                    From
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={yearFrom}
                    onChange={(event) => setYearFrom(sanitizeYearInput(event.target.value))}
                    placeholder="2021"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition-all focus:border-blue-600 dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                    To
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={yearTo}
                    onChange={(event) => setYearTo(sanitizeYearInput(event.target.value))}
                    placeholder="2025"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition-all focus:border-blue-600 dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
              </div>
            )}

            {yearRangeInvalid && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                The From year cannot be greater than the To year.
              </p>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}
