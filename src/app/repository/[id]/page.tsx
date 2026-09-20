import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Calendar, GraduationCap, Users, FileText, Hash, Eye, Download, Crown } from 'lucide-react'
import { ResearchAccessControlSection } from '@/components/public/ResearchAccessControlSection'
import { canTeacherEditPublishedResearch } from '@/lib/research/permissions'
import { isFacultyRole } from '@/lib/users/access'
import { getUserResearchAccessState } from '@/lib/research/access-requests/service'
import { TechnicalArtifactsCard } from '@/components/dashboard/research/TechnicalArtifactsCard'
import { DiagramGalleryLightbox } from '@/components/dashboard/research/DiagramGalleryLightbox'

export default async function PublicResearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ token?: string }>
}) {
  // Resolve route parameters and search parameters
  const { id: researchId } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const guestToken = resolvedSearchParams.token || null

  const supabase = await createClient()

  // Fetch the current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch user profile info if logged in
  let currentUserInfo: { id: string; name: string; email: string } | null = null
  if (user) {
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .maybeSingle()

    currentUserInfo = {
      id: user.id,
      name: userProfile
        ? `${userProfile.first_name} ${userProfile.last_name}`
        : user.email?.split('@')[0] || 'User',
      email: user.email || '',
    }
  }

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
          href="/repository"
          className="mt-6 text-blue-600 hover:underline font-medium"
        >
          Return to Repository
        </Link>
      </div>
    )
  }

  // Check access authorization state (author, faculty, approved request, or guest token)
  const accessState = await getUserResearchAccessState(researchId, guestToken)

  // Fetch the research authors (Leader + Members)
  let leaderName = 'Unknown Author'
  let memberNamesList: string[] = []

  const allAuthorIds = Array.from(
    new Set([research.user_id, ...(Array.isArray(research.members) ? research.members : [])])
  ).filter(Boolean)

  if (allAuthorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('is_active', true)
      .in('id', allAuthorIds)

    if (profiles) {
      const leaderProfile = profiles.find((p) => p.id === research.user_id)
      if (leaderProfile) {
        leaderName = `${leaderProfile.first_name} ${leaderProfile.last_name}`
      }

      const memberIds = (research.members || []).filter((id: string) => id !== research.user_id)
      memberNamesList = memberIds
        .map((memberId: string) => {
          const profile = profiles.find((p) => p.id === memberId)
          return profile ? `${profile.first_name} ${profile.last_name}` : null
        })
        .filter(Boolean) as string[]
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
  const academicYearLabel =
    typeof research.academic_year === 'string' && research.academic_year.trim().length > 0
      ? research.academic_year
      : String(new Date(research.created_at).getFullYear())
  let canEditPublishedResearch = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (isFacultyRole(profile?.role)) {
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
          href="/repository"
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

            {/* Authorship Row */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/80 px-3.5 py-2 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
                <Crown size={16} className="shrink-0 text-amber-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Research Leader:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{leaderName}</span>
              </div>

              {memberNamesList.length > 0 && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300">
                  <Users size={16} className="shrink-0 text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Members:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{memberNamesList.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Secondary Metadata Row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-gray-600 dark:text-gray-400 pt-1">
              <span className="flex items-center gap-2">
                <Calendar size={16} /> {academicYearLabel}
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

        {/* Technical Artifacts: Repository & Live Demo */}
        <TechnicalArtifactsCard
          repositoryUrl={research.repository_url}
          demoUrl={research.demo_url}
          sourceCodeUrl={research.source_code_url}
          sourceCodeFilename={research.source_code_filename}
        />

        {/* Technical Diagrams Lightbox Gallery */}
        {Array.isArray(research.diagrams) && research.diagrams.length > 0 && (
          <DiagramGalleryLightbox
            diagrams={research.diagrams}
          />
        )}

        {/* Research Access Control Section */}
        <ResearchAccessControlSection
          researchId={research.id}
          researchTitle={research.title}
          leaderName={leaderName}
          fileUrl={fileUrlToDownload}
          fileName={fileNameToDownload}
          accessState={accessState}
          currentUser={currentUserInfo}
          guestToken={guestToken}
        />

      </div>

    </div>
  )
}
