import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { RepositorySearch } from '@/components/dashboard/repository/RepositorySearch'
import { BookOpen, Calendar, Users, Hash, ChevronRight, Search, Eye, Download, Crown } from 'lucide-react'
import PaginationLinks from '@/components/ui/PaginationLinks'

type RepositoryPaper = {
  id: string
  user_id: string
  title?: string | null
  abstract?: string | null
  type?: string | null
  subject_code?: string | null
  research_area?: string | null
  original_file_name?: string | null
  created_at?: string | null
  published_at?: string | null
  academic_year?: string | null
  adviser_id?: string | null
  members?: string[]
  keywords?: string[] | string | null
  views_count?: number | null
  downloads_count?: number | null
}

type ResolvedYear = {
  label: string
  startYear: number | null
  endYear: number | null
}

function normalizeSearchValue(value: string | null | undefined) {
  return value?.toLowerCase().trim() ?? ''
}

function parseSingleYear(value: string | null | undefined) {
  return value && /^\d{4}$/.test(value) ? Number(value) : null
}

function resolvePaperYear(paper: RepositoryPaper): ResolvedYear {
  const academicYear = paper.academic_year?.trim() || ''
  const academicYearMatch = academicYear.match(/^(\d{4})-(\d{4})$/)

  if (academicYearMatch) {
    const startYear = Number(academicYearMatch[1])
    const endYear = Number(academicYearMatch[2])

    return {
      label: academicYear,
      startYear,
      endYear,
    }
  }

  const publishedYear = paper.published_at
    ? new Date(paper.published_at).getFullYear()
    : null
  const createdYear = paper.created_at
    ? new Date(paper.created_at).getFullYear()
    : null
  const fallbackYear = publishedYear ?? createdYear

  return {
    label: fallbackYear ? String(fallbackYear) : 'Unknown Year',
    startYear: fallbackYear,
    endYear: fallbackYear,
  }
}

function matchesSpecificYear(paperYear: ResolvedYear, selectedYear: number) {
  if (paperYear.startYear === null || paperYear.endYear === null) {
    return false
  }

  return selectedYear >= paperYear.startYear && selectedYear <= paperYear.endYear
}

function matchesYearRange(paperYear: ResolvedYear, fromYear: number, toYear: number) {
  if (paperYear.startYear === null || paperYear.endYear === null) {
    return false
  }

  return paperYear.startYear <= toYear && paperYear.endYear >= fromYear
}

function getPublishedTimestamp(paper: RepositoryPaper) {
  return paper.published_at ? new Date(paper.published_at).getTime() : 0
}

function getCreatedTimestamp(paper: RepositoryPaper) {
  return paper.created_at ? new Date(paper.created_at).getTime() : 0
}

function compareByAcademicYearDesc(firstPaper: RepositoryPaper, secondPaper: RepositoryPaper) {
  const firstYear = resolvePaperYear(firstPaper)
  const secondYear = resolvePaperYear(secondPaper)

  if (firstYear.endYear !== secondYear.endYear) {
    return (secondYear.endYear ?? 0) - (firstYear.endYear ?? 0)
  }

  if (firstYear.startYear !== secondYear.startYear) {
    return (secondYear.startYear ?? 0) - (firstYear.startYear ?? 0)
  }

  if (getPublishedTimestamp(firstPaper) !== getPublishedTimestamp(secondPaper)) {
    return getPublishedTimestamp(secondPaper) - getPublishedTimestamp(firstPaper)
  }

  return getCreatedTimestamp(secondPaper) - getCreatedTimestamp(firstPaper)
}

function compareByAcademicYearAsc(firstPaper: RepositoryPaper, secondPaper: RepositoryPaper) {
  return compareByAcademicYearDesc(secondPaper, firstPaper)
}

function getPaperSearchText(
  paper: RepositoryPaper,
  authorNames: string,
  adviserName: string
) {
  const yearLabel = resolvePaperYear(paper).label
  const keywords = Array.isArray(paper.keywords)
    ? paper.keywords.join(' ')
    : (paper.keywords ?? '')

  return normalizeSearchValue(
    [
      paper.title,
      paper.abstract,
      paper.type,
      paper.subject_code,
      paper.research_area,
      paper.original_file_name,
      yearLabel,
      keywords,
      authorNames,
      adviserName,
    ]
      .filter(Boolean)
      .join(' ')
  )
}

export default async function RepositoryPage({
  searchParams
}: {
  searchParams: Promise<{
    q?: string
    type?: string
    sort?: string
    page?: string
    yearMode?: string
    year?: string
    yearFrom?: string
    yearTo?: string
  }>
}) {

  const resolvedParams = await searchParams
  const query = resolvedParams.q || ''
  const typeFilter = resolvedParams.type || 'all'
  const sortFilter = resolvedParams.sort || 'newest'
  const yearMode = resolvedParams.yearMode === 'range' ? 'range' : 'specific'
  const selectedYear = parseSingleYear(resolvedParams.year)
  const yearFrom = parseSingleYear(resolvedParams.yearFrom)
  const yearTo = parseSingleYear(resolvedParams.yearTo)
  const hasSpecificYearFilter = yearMode === 'specific' && selectedYear !== null
  const hasYearRangeFilter =
    yearMode === 'range' &&
    yearFrom !== null &&
    yearTo !== null &&
    yearFrom <= yearTo
  const yearFilterActive = hasSpecificYearFilter || hasYearRangeFilter
  const rawPage = Number.parseInt(resolvedParams.page || '1', 10)
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const pageSize = 10

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let dbQuery = supabase
    .from('research')
    .select('*')
    .eq('status', 'Published')

  if (typeFilter !== 'all') {
    dbQuery = dbQuery.eq('type', typeFilter)
  }

  const { data: papers } = await dbQuery

  const authorsMap: Record<string, string> = {}
  const adviserMap: Record<string, string> = {}
  let filteredPapers = (papers ?? []) as RepositoryPaper[]

  if (papers && papers.length > 0) {

    const allProfileIds = new Set<string>()

    papers.forEach((paper) => {
      allProfileIds.add(paper.user_id)
      paper.members?.forEach((memberId: string) => allProfileIds.add(memberId))
    })

    papers.forEach((paper) => {
      if (paper.adviser_id) {
        allProfileIds.add(paper.adviser_id)
      }
    })

    if (allProfileIds.size > 0) {

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .in('id', Array.from(allProfileIds))

      profiles?.forEach(p => {
        const fullName = `${p.first_name} ${p.last_name}`
        authorsMap[p.id] = fullName
        adviserMap[p.id] = fullName
      })

    }

  }

  if (query) {
    const normalizedQuery = normalizeSearchValue(query)

    filteredPapers = filteredPapers.filter((paper) => {
      const leaderName = authorsMap[paper.user_id] || ''
      const memberNames = (paper.members || [])
        .filter((id: string) => id !== paper.user_id)
        .map((id: string) => authorsMap[id] || '')
        .join(' ')
      const allAuthorNames = [leaderName, memberNames].filter(Boolean).join(' ')
      const adviserName = paper.adviser_id
        ? adviserMap[paper.adviser_id] || ''
        : ''

      return getPaperSearchText(paper, allAuthorNames, adviserName).includes(normalizedQuery)
    })
  }

  if (hasSpecificYearFilter && selectedYear !== null) {
    filteredPapers = filteredPapers.filter((paper) =>
      matchesSpecificYear(resolvePaperYear(paper), selectedYear)
    )
  } else if (hasYearRangeFilter && yearFrom !== null && yearTo !== null) {
    filteredPapers = filteredPapers.filter((paper) =>
      matchesYearRange(resolvePaperYear(paper), yearFrom, yearTo)
    )
  }

  if (yearFilterActive) {
    filteredPapers = [...filteredPapers].sort(compareByAcademicYearDesc)
  } else if (sortFilter === 'oldest') {
    filteredPapers = [...filteredPapers].sort(compareByAcademicYearAsc)
  } else if (sortFilter === 'title_asc') {
    filteredPapers = [...filteredPapers].sort((firstPaper, secondPaper) =>
      (firstPaper.title || '').localeCompare(secondPaper.title || '')
    )
  } else {
    filteredPapers = [...filteredPapers].sort(compareByAcademicYearDesc)
  }

  const totalCount = filteredPapers.length
  const pagedPapers = filteredPapers.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">

      {/* Repository page header introducing the institutional research archive */}
      <div className="flex flex-col gap-2 text-center items-center py-6">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mb-2 shadow-sm">
          <BookOpen size={32} />
        </div>

        <h1 className="text-4xl font-black tracking-tight text-[var(--foreground)]">
          Institutional Repository
        </h1>

        <p className="text-gray-500 max-w-xl">
          Discover, read, and cite published academic research and capstone projects from the university.
        </p>
      </div>

      {/* Search component providing keyword search and filter controls */}
      <RepositorySearch
        key={[
          query,
          typeFilter,
          sortFilter,
          yearMode,
          resolvedParams.year || '',
          resolvedParams.yearFrom || '',
          resolvedParams.yearTo || '',
        ].join(':')}
        initialQuery={query}
        initialType={typeFilter}
        initialSort={sortFilter}
        initialYearMode={yearMode}
        initialSpecificYear={resolvedParams.year || ''}
        initialYearFrom={resolvedParams.yearFrom || ''}
        initialYearTo={resolvedParams.yearTo || ''}
      />

      {/* Displays the total number of search results */}
      <div className="flex items-center justify-between text-sm text-gray-500 font-medium px-2">
        <span>
          Showing {totalCount || 0} result{(totalCount || 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List of research papers displayed in an academic-style result layout */}
      <div className="space-y-6">

        {totalCount === 0 ? (

          <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl text-gray-400 bg-gray-50/50 dark:bg-gray-900/10">
            <Search size={48} className="mx-auto mb-4 opacity-20" />

            <p className="font-bold text-lg text-gray-600 dark:text-gray-300">
              No published research found.
            </p>

            <p className="text-sm mt-1">
              Try adjusting your search terms or filters.
            </p>
          </div>

        ) : (

          pagedPapers.map((paper) => {
            const leaderName = authorsMap[paper.user_id] || 'Unknown Author'
            const memberNames = (paper.members || [])
              .filter((id: string) => id !== paper.user_id)
              .map((id: string) => authorsMap[id] || 'Unknown')

            return (
              <div
                key={paper.id}
                className="group bg-[var(--background)] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all"
              >
                {/* Research title and document type */}
                <div className="flex items-start justify-between gap-4 mb-2">
                  <Link href={`/dashboard/research/${paper.id}?public=true`}>
                    <h2 className="text-xl font-bold text-blue-700 dark:text-blue-400 hover:underline decoration-blue-300 underline-offset-4 leading-tight">
                      {paper.title}
                    </h2>
                  </Link>

                  <span className="shrink-0 text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-md">
                    {paper.type}
                  </span>
                </div>

                {/* Metadata row with Leader and Members */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm font-medium mb-4">
                  <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                    <Crown size={14} className="text-amber-500" />
                    <span className="font-bold">Leader:</span> {leaderName}
                  </span>

                  {memberNames.length > 0 && (
                    <>
                      <span className="text-gray-300 dark:text-gray-700">•</span>
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <Users size={14} className="text-gray-400" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Members:</span> {memberNames.join(', ')}
                      </span>
                    </>
                  )}

                  <span className="text-gray-300 dark:text-gray-700">•</span>

                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Calendar size={14} /> {resolvePaperYear(paper).label}
                  </span>

                  {paper.subject_code && (
                    <>
                      <span className="text-gray-300 dark:text-gray-700">•</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {paper.subject_code}
                      </span>
                    </>
                  )}
                </div>

                {/* Short abstract preview */}
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-4 leading-relaxed">
                  {paper.abstract}
                </p>

                {/* Keywords and usage metrics section */}
                <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  {/* Research keywords */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Hash size={14} className="text-gray-400" />

                    {Array.isArray(paper.keywords) && paper.keywords.length > 0
                      ? paper.keywords.map((kw: string, i: number) => (
                          <span
                            key={i}
                            className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md"
                          >
                            {kw.trim()}
                          </span>
                        ))
                      : (
                          <span className="text-xs text-gray-400 italic">
                            No keywords
                          </span>
                        )}
                  </div>

                  {/* Paper metrics and navigation to full text */}
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-3 text-xs text-gray-400 font-semibold">
                      <span className="flex items-center gap-1.5" title="Views">
                        <Eye size={14} /> {paper.views_count || 0}
                      </span>

                      <span className="flex items-center gap-1.5" title="Downloads">
                        <Download size={14} /> {paper.downloads_count || 0}
                      </span>
                    </div>

                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>

                    <Link
                      href={`/repository/${paper.id}`}
                      className="flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Read Full Text <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <PaginationLinks
        pathname="/dashboard/repository"
        searchParams={{ ...resolvedParams, page: String(page) }}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  )
}
