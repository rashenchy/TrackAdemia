'use client'

import { Search, Filter, SlidersHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { RESEARCH_TYPE_OPTIONS } from '@/lib/research/types'

type YearFilterMode = 'specific' | 'range'

function sanitizeYearInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 4)
}

// Search and filter component for the public research repository
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

  // Router utilities for updating URL query parameters
  const router = useRouter()
  
  // Initialize filter states from existing URL parameters
  const [query, setQuery] = useState(initialQuery)
  const [type, setType] = useState(initialType)
  const [sort, setSort] = useState(initialSort)
  const [yearMode, setYearMode] = useState<YearFilterMode>(initialYearMode)
  const [specificYear, setSpecificYear] = useState(initialSpecificYear)
  const [yearFrom, setYearFrom] = useState(initialYearFrom)
  const [yearTo, setYearTo] = useState(initialYearTo)

  // Debounced search logic to avoid excessive database queries
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {

      // Build new URL parameters based on current filters
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (type !== 'all') params.set('type', type)
      if (sort !== 'newest') params.set('sort', sort)
      params.set('yearMode', yearMode)

      if (yearMode === 'specific') {
        if (specificYear) params.set('year', specificYear)
      } else {
        if (yearFrom) params.set('yearFrom', yearFrom)
        if (yearTo) params.set('yearTo', yearTo)
      }

      // Push updated search parameters to the repository page
      router.push(`${basePath}?${params.toString()}`)

    }, 400) // 400ms delay to debounce typing

    return () => clearTimeout(delayDebounceFn)
  }, [basePath, query, type, sort, yearMode, specificYear, yearFrom, yearTo, router])

  const yearRangeInvalid =
    yearMode === 'range' &&
    yearFrom.length === 4 &&
    yearTo.length === 4 &&
    Number(yearFrom) > Number(yearTo)

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
      
      {/* Search Input Field */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, author, year, keywords, or subject code..." 
          className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-[var(--foreground)] outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
        />
      </div>

      {/* Filter and Sorting Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">

          {/* Research Type Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto text-sm text-gray-500">
            <Filter size={16} />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="bg-transparent font-semibold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
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
            <SlidersHorizontal size={16} />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-transparent font-semibold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
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
    </div>
  )
}
