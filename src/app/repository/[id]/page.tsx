import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Calendar, GraduationCap, Users, FileText, Hash, Eye, Download } from 'lucide-react'
import { PublicDownloadButton } from '@/components/public/PublicDownloadButton'
import { canTeacherEditPublishedResearch } from '@/lib/research/permissions'

export default async function PublicResearchPage({ params }: { params: Promise<{ id: string }> }) {

  // Resolve the research ID from route parameters
  const resolvedParams = await params
  const researchId = resolvedParams.id

  // Initialize Supabase
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch the research entry and enforce public access (Published only)
  const { data: research, error } = await supabase
    .from('research')
    .select('*')
    .eq('id', researchId)
    .eq('status', 'Published')
    .single()

  // Handle missing or unpublished research
  if (error || !research) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <BookOpen size={48} className="text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Research Not Found</h1>
        <p className="text-gray-500 mt-2">
          This paper may not exist or has not been published yet.
        </p>

        <Link
          href="/dashboard/repository"
          className="mt-6 text-blue-600 hover:underline font-medium"
        >
          Return to Repository
        </Link>
      </div>
    )
  }

  // Fetch the research authors based on member IDs
  let authorNames = 'Unknown Authors'
  const authorIds =
    research.members && research.members.length > 0 ? research.members : [research.user_id]

  if (authorIds.length > 0) {

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('is_active', true)
      .in('id', authorIds)

    if (profiles) {
      authorNames = authorIds
        .map((authorId: string) => {
          const profile = profiles.find((candidate) => candidate.id === authorId)
          return profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Author'
        })
        .join(', ')
    }
  }

  // Fetch the latest manuscript version
  const { data: latestVersion } = await supabase
    .from('research_versions')
    .select('file_url, created_at, original_file_name')
    .eq('research_id', researchId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  // Determine which file URL should be used for download
  const fileUrlToDownload = latestVersion?.file_url || research.file_url
  const fileNameToDownload = latestVersion?.original_file_name || research.original_file_name
  let canEditPublishedResearch = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (profile?.role === 'mentor') {
      canEditPublishedResearch = await canTeacherEditPublishedResearch(
        supabase,
        user.id,
        research
      )
    }
  }

  // Render the public research page
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-[var(--foreground)] py-12 px-4 sm:px-6">

      <div className="max-w-4xl mx-auto space-y-8">

        {/* Navigation */}
        <Link
          href="/dashboard/repository"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Repository Search
        </Link>

        {canEditPublishedResearch ? (
          <div className="flex justify-end">
            <Link
              href={`/dashboard/research/${research.id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-100"
            >
              <FileText size={16} />
              Edit Published Research
            </Link>
          </div>
        ) : null}

        {/* Research Header */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">

          <div className="space-y-4">

            {/* Research Type & Area Tags */}
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-black uppercase tracking-widest rounded-md">
                {research.type}
              </span>

              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-black uppercase tracking-widest rounded-md">
                {research.research_area || 'General'}
              </span>
            </div>

            {/* Research Title */}
            <h1 className="text-3xl md:text-4xl font-black leading-tight text-gray-900 dark:text-gray-100">
              {research.title}
            </h1>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400 font-medium pt-2">

              <span className="flex items-center gap-2">
                <Users size={16} /> {authorNames}
              </span>

              <span className="flex items-center gap-2">
                <Calendar size={16} /> {new Date(research.created_at).getFullYear()}
              </span>

              {research.subject_code && (
                <span className="flex items-center gap-2">
                  <GraduationCap size={16} /> {research.subject_code}
                </span>
              )}

              {/* Views & Downloads Metrics */}
              <div className="flex items-center gap-4 sm:ml-auto bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700">

                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <Eye size={16} /> {research.views_count || 0} Views
                </span>

                <div className="w-px h-3 bg-gray-300 dark:bg-gray-600"></div>

                <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <Download size={16} /> {research.downloads_count || 0} Downloads
                </span>

              </div>

            </div>

          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* Abstract Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText size={18} className="text-blue-600" /> Abstract
            </h3>

            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {research.abstract}
            </p>
          </div>

          {/* Keywords Section */}
          {research.keywords && research.keywords.length > 0 && (
            <div className="pt-4 flex flex-wrap items-center gap-2">

              <Hash size={16} className="text-gray-400" />

              {(Array.isArray(research.keywords)
                ? research.keywords
                : research.keywords.split(',')
              ).map((kw: string, i: number) => (

                <span
                  key={i}
                  className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg font-medium"
                >
                  {kw.trim()}
                </span>

              ))}

            </div>
          )}

        </div>

        {/* Download Section */}
        <div className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-3xl border border-blue-100 dark:border-blue-900/30 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">

          <div>
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
              Read the full research
            </h3>

            <p className="text-sm text-blue-700/80 dark:text-blue-300/80 mt-1">
              Download the latest published manuscript.
            </p>
            <p className="mt-2 text-xs font-medium text-blue-800/80 dark:text-blue-200/80">
              {fileNameToDownload || 'No file name available'}
            </p>
          </div>

          {fileUrlToDownload ? (
            <PublicDownloadButton
              fileUrl={fileUrlToDownload}
              researchId={research.id}
              downloadFileName={fileNameToDownload}
            />
          ) : (
            <span className="text-sm text-gray-500 italic">
              No manuscript available
            </span>
          )}

        </div>

      </div>

    </div>
  )
}
