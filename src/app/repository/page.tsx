import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { RepositorySearch } from '@/components/dashboard/repository/RepositorySearch'
import { BookOpen, Calendar, Users, Hash, ChevronRight, Search, Crown } from 'lucide-react'
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

export default async function PublicRepositoryPage({
  searchParams,
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

      profiles?.forEach((profile) => {
        const fullName = `${profile.first_name} ${profile.last_name}`
        authorsMap[profile.id] = fullName
        adviserMap[profile.id] = fullName
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
      const adviserName = paper.adviser_id ? adviserMap[paper.adviser_id] || '' : ''

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
    <div className="max-w-5xl mx-auto space-y-8 px-4 pb-12 pt-10 sm:px-6">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-blue-100 bg-[linear-gradient(180deg,#ffffff_0%,#eef6ff_100%)] px-6 py-8 text-center shadow-[0_24px_70px_rgba(148,163,184,0.14)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-sm">
          <BookOpen size={32} />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-slate-950">
            Public Research Repository
          </h1>
          <p className="mx-auto max-w-2xl text-gray-600">
            Browse published research metadata, abstracts, and academic years. Full manuscript access is available after login.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
          >
            Log In for Full Access
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-blue-100 bg-white px-6 py-3 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-50"
          >
            Create an Account
          </Link>
        </div>
      </div>

      <RepositorySearch
        basePath="/repository"
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

      <div className="flex items-center justify-between px-2 text-sm font-medium text-gray-500">
        <span>
          Showing {totalCount || 0} result{(totalCount || 0) !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-6">
        {totalCount === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/50 py-20 text-center text-gray-400">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-bold text-gray-600">No published research found.</p>
            <p className="mt-1 text-sm">Try adjusting your search terms or filters.</p>
          </div>
        ) : (
          pagedPapers.map((paper) => {
            const leaderName = authorsMap[paper.user_id] || 'Unknown Author'
            const memberNames = (paper.members || [])
              .filter((id: string) => id !== paper.user_id)
              .map((id: string) => authorsMap[id] || 'Unknown')

            return (
              <article
                key={paper.id}
                className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
              >
                <div className="mb-2 flex items-start justify-between gap-4">
                  <Link href={`/repository/${paper.id}`}>
                    <h2 className="text-xl font-bold leading-tight text-blue-700 decoration-blue-300 underline-offset-4 hover:underline">
                      {paper.title}
                    </h2>
                  </Link>

                  <span className="shrink-0 rounded-md bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                    {paper.type}
                  </span>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm font-medium">
                  <span className="flex items-center gap-1.5 text-blue-700">
                    <Crown size={14} className="text-amber-500" />
                    <span className="font-bold">Leader:</span> {leaderName}
                  </span>
                  {memberNames.length > 0 && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="flex items-center gap-1.5 text-slate-600">
                        <Users size={14} className="text-gray-400" />
                        <span className="font-semibold text-slate-700">Members:</span> {memberNames.join(', ')}
                      </span>
                    </>
                  )}
                  <span className="text-gray-300">•</span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Calendar size={14} className="text-gray-400" /> {resolvePaperYear(paper).label}
                  </span>
                  {paper.subject_code && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-gray-500">{paper.subject_code}</span>
                    </>
                  )}
                </div>

                <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-gray-600">
                  {paper.abstract}
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Hash size={14} className="text-gray-400" />
                    {Array.isArray(paper.keywords) && paper.keywords.length > 0 ? (
                      paper.keywords.map((keyword: string, index: number) => (
                        <span
                          key={index}
                          className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600"
                        >
                          {keyword.trim()}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs italic text-gray-400">No keywords</span>
                    )}
                  </div>

                  <Link
                    href={`/repository/${paper.id}`}
                    className="flex items-center gap-1.5 text-sm font-bold text-blue-600 transition-colors hover:text-blue-800"
                  >
                    View Details <ChevronRight size={16} />
                  </Link>
                </div>
              </article>
            )
          })
        )}
      </div>

      <PaginationLinks
        pathname="/repository"
        searchParams={{ ...resolvedParams, page: String(page) }}
        totalCount={totalCount}
        pageSize={pageSize}
      />
    </div>
  )
}
