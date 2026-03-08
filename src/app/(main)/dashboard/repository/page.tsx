import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { RepositorySearch } from '@/components/dashboard/RepositorySearch'
import { BookOpen, Calendar, Users, Hash, ChevronRight, Search, Eye, Download } from 'lucide-react'

export default async function RepositoryPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string, type?: string, sort?: string }>
}) {

  const resolvedParams = await searchParams
  const query = resolvedParams.q || ''
  const typeFilter = resolvedParams.type || 'all'
  const sortFilter = resolvedParams.sort || 'newest'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let dbQuery = supabase
    .from('research')
    .select('*')
    .eq('status', 'Published')

  if (query) {
    dbQuery = dbQuery.or(
      `title.ilike.%${query}%,abstract.ilike.%${query}%`
    )
  }

  if (typeFilter !== 'all') {
    dbQuery = dbQuery.eq('type', typeFilter)
  }

  if (sortFilter === 'oldest') {
    dbQuery = dbQuery.order('created_at', { ascending: true })
  } else if (sortFilter === 'title_asc') {
    dbQuery = dbQuery.order('title', { ascending: true })
  } else {
    dbQuery = dbQuery.order('created_at', { ascending: false })
  }

  const { data: papers } = await dbQuery

  let authorsMap: Record<string, string> = {}

  if (papers && papers.length > 0) {

    const allMemberIds = new Set<string>()

    papers.forEach(p =>
      p.members?.forEach((m: string) =>
        allMemberIds.add(m)
      )
    )

    if (allMemberIds.size > 0) {

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', Array.from(allMemberIds))

      profiles?.forEach(p => {
        authorsMap[p.id] = `${p.first_name} ${p.last_name}`
      })

    }

  }

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
      <RepositorySearch />

      {/* Displays the total number of search results */}
      <div className="flex items-center justify-between text-sm text-gray-500 font-medium px-2">
        <span>
          Showing {papers?.length || 0} result{(papers?.length || 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List of research papers displayed in an academic-style result layout */}
      <div className="space-y-6">

        {papers?.length === 0 ? (

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

          papers?.map((paper) => {

            const authorNames =
              paper.members?.map((id: string) =>
                authorsMap[id] || 'Unknown'
              ).join(', ')

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

                {/* Citation-style metadata (authors, year, subject code) */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-green-700 dark:text-green-500 font-medium mb-4">
                  <span className="flex items-center gap-1.5">
                    <Users size={14} /> {authorNames || 'Unknown Authors'}
                  </span>

                  <span>-</span>

                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} /> {new Date(paper.created_at).getFullYear()}
                  </span>

                  <span>-</span>

                  <span className="text-gray-500 dark:text-gray-400">
                    {paper.subject_code}
                  </span>
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

    </div>
  )
}