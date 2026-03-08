'use client'

import { Search, Filter, SlidersHorizontal } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export function RepositorySearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [type, setType] = useState(searchParams.get('type') || 'all')
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest')

  // Debounce search input to avoid spamming the database
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (type !== 'all') params.set('type', type)
      if (sort !== 'newest') params.set('sort', sort)

      router.push(`/dashboard/repository?${params.toString()}`)
    }, 400) // 400ms delay

    return () => clearTimeout(delayDebounceFn)
  }, [query, type, sort, router])

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
      
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, abstract, or keywords..." 
          className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-[var(--foreground)] outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
        />
      </div>

      {/* Filters & Sorting */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto text-sm text-gray-500">
          <Filter size={16} />
          <select 
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="bg-transparent font-semibold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
          >
              <option value="capstone">Capstone Project</option>
              <option value="case-study">Case Study</option>
              <option value="dissertation">Dissertation</option>
              <option value="research">General Research</option>
              <option value="proposal">Research Proposal</option>
              <option value="thesis">Thesis</option>
          </select>
        </div>

        <div className="hidden sm:block w-px h-4 bg-gray-300 dark:bg-gray-700 mx-2"></div>

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
    </div>
  )
}