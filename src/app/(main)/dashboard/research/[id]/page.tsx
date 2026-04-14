import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Calendar, GraduationCap, Edit3, FileText, GitCompareArrows, Users } from 'lucide-react'
import { DocumentDownloadButton } from '@/components/dashboard/DocumentDownloadButton'
import { updateResearchStatus } from './actions'
import { ResearchStatusForm } from './research-status-form'
import { ResearchTextWorkspaceCard } from '@/components/dashboard/ResearchTextWorkspaceCard'
import { ResearchRealtimeRefresh } from '@/components/dashboard/ResearchRealtimeRefresh'
import {
  hasResearchTextContent,
  normalizeResearchDocumentContent,
  resolveResearchSubmissionFormat,
} from '@/lib/research/document'
import { getVersionLabel } from '@/lib/research/versioning'
import { BackButton } from '@/components/navigation/BackButton'
import { appendFromParam, buildPathWithSearch } from '@/lib/navigation'

type TeamMember = {
  id: string
  name: string
  course: string
  role: string
}

type DisplayVersion = {
  id: string
  file_url: string | null
  original_file_name: string | null
  content_json?: unknown
  version_number: number
  version_major?: number | null
  version_minor?: number | null
  version_label?: string | null
  created_by_role?: string | null
  change_summary?: string | null
  created_at: string
}

export default async function ViewResearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ view?: string; from?: string }>
}) {

  // Initialization
  const resolvedParams = await params
  const resolvedSearchParams = (await searchParams) || {}
  const researchId = resolvedParams.id
  const supabase = await createClient()

  // Authentication and profile
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .eq('is_active', true)
    .single()

  const isTeacher = profile?.role === 'mentor'

  // Fetch research details
  const { data: research } = await supabase
    .from('research')
    .select('*')
    .eq('id', researchId)
    .single()

  if (!research) {
    return <div className="p-8">Research not found or you don&apos;t have access.</div>
  }

  // Access control logic
  const isAuthor =
    research.user_id === user.id ||
    (Array.isArray(research.members) && research.members.includes(user.id))

  // Determine if the user is a viewer-only (Repository access)
  const isViewerOnly = !isAuthor && !isTeacher && research.status === 'Published'

  let sectionAdviserName = 'N/A'
  if (research.subject_code) {
    const { data: sectionAdviserSection } = await supabase
      .from('sections')
      .select('teacher_id')
      .eq('course_code', research.subject_code)
      .limit(1)
      .maybeSingle()

    if (sectionAdviserSection?.teacher_id) {
      const { data: sectionAdviserProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', sectionAdviserSection.teacher_id)
        .eq('is_active', true)
        .single()

      if (sectionAdviserProfile) {
        sectionAdviserName = `${sectionAdviserProfile.first_name} ${sectionAdviserProfile.last_name}`
      }
    }
  }

  let externalAdviserName = 'None'
  if (research.adviser_id) {
    const { data: adviserProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', research.adviser_id)
      .eq('is_active', true)
      .single()

    if (adviserProfile) {
      externalAdviserName = `${adviserProfile.first_name} ${adviserProfile.last_name}`
    }
  }

  // Fetch team member profiles
  let teamMembers: TeamMember[] = []
  if (research.members && research.members.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, course_program')
      .eq('is_active', true)
      .in('id', research.members)

    if (profiles) {
      teamMembers = research.members.map((memberId: string, index: number) => {
        const p = profiles.find(prof => prof.id === memberId)
        return {
          id: memberId,
          name: p ? `${p.first_name} ${p.last_name}` : 'Unknown Student',
          course: p?.course_program || 'N/A',
          role: research.member_roles?.[index] || 'Member'
        }
      })
    }
  }

  // Fetch document versions
  const { data: versions } = await supabase
    .from('research_versions')
    .select('*')
    .eq('research_id', researchId)
    .order('version_number', { ascending: false })

  // Legacy fallback for older uploads (Version 1)
  const displayVersions: DisplayVersion[] = versions && versions.length > 0
    ? versions
    : research.file_url || research.content_json
      ? [{
          id: 'legacy',
          file_url: research.file_url,
          original_file_name: research.original_file_name,
          content_json: research.content_json,
          version_number: 1,
          version_label: '1',
          created_by_role: 'student',
          created_at: research.created_at
        }]
      : []

  const latestVersion = displayVersions[0]
  const latestDocumentContent = normalizeResearchDocumentContent(
    latestVersion?.content_json ?? research.content_json,
    research.type
  )
  const latestHasPdf = Boolean(latestVersion?.file_url || research.file_url)
  const latestHasText = hasResearchTextContent(latestDocumentContent, research.current_stage)
  const latestSubmissionFormat = resolveResearchSubmissionFormat(
    research.submission_format,
    {
      hasPdf: latestHasPdf,
      hasText: latestHasText,
      stage: research.current_stage,
    }
  )
  const activeDocumentView =
    resolvedSearchParams.view === 'text' && latestHasText
      ? 'text'
      : latestHasPdf
        ? 'pdf'
        : 'text'
  const currentPageHref = buildPathWithSearch(`/dashboard/research/${researchId}`, [
    ['view', resolvedSearchParams.view],
    ['from', resolvedSearchParams.from],
  ])
  const latestWorkspaceHref = appendFromParam(
    buildPathWithSearch(`/dashboard/research/${research.id}/annotate`, [
      ['version', latestVersion ? String(latestVersion.version_number) : null],
    ]),
    currentPageHref
  )

  const updateStatusAction = updateResearchStatus.bind(null, researchId)

  // Render
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <ResearchRealtimeRefresh researchId={researchId} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <BackButton fallbackHref={isViewerOnly ? '/dashboard/repository' : '/dashboard'} />
          <h1 className="text-3xl font-bold tracking-tight">Research Details</h1>
        </div>

        {/* Status Update Control */}
        {!isViewerOnly && isTeacher ? (
          <ResearchStatusForm
            action={updateStatusAction}
            currentStatus={research.status}
          />
        ) : (
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase w-fit
              ${research.status === 'Published'
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : research.status === 'Resubmitted'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : research.status === 'Approved'
                    ? 'bg-green-100 text-green-700'
                    : research.status === 'Revision Requested'
                      ? 'bg-amber-100 text-amber-700'
                      : research.status === 'Rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'}`}
          >
            {research.status}
          </span>
        )}
      </div>

      {/* Identity Section */}
      <div className="bg-[var(--background)] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
          <FileText className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold text-[var(--foreground)]">Identity</h2>
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-gray-500">Title</label>
          <p className="text-xl font-semibold text-[var(--foreground)]">{research.title}</p>
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-gray-500">Type</label>
          <p className="text-md capitalize">{research.type}</p>
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-gray-500">Abstract</label>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">{research.abstract}</p>
        </div>
        {research.keywords && research.keywords.length > 0 && (
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Keywords</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {research.keywords.map((kw: string, i: number) => (
                <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg font-medium">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Team Members Section */}
      {teamMembers.length > 0 && (
        <div className="bg-[var(--background)] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
            <Users className="text-blue-600" size={20} />
            <h2 className="text-lg font-bold text-[var(--foreground)]">Researchers</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex flex-col p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">{member.role}</span>
                <span className="font-semibold text-[var(--foreground)]">{member.name}</span>
                <span className="text-xs text-gray-500">{member.course}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Academic & Timeline Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[var(--background)] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
            <GraduationCap className="text-blue-600" size={20} />
            <h2 className="text-lg font-bold">Academic</h2>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Subject Code</label>
            <p className="text-md">{research.subject_code || 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Section Adviser</label>
            <p className="text-md">{sectionAdviserName}</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">External Adviser</label>
            <p className="text-md">{externalAdviserName}</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Research Area</label>
            <p className="text-md">{research.research_area || 'N/A'}</p>
          </div>
        </div>

        <div className="bg-[var(--background)] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
            <Calendar className="text-blue-600" size={20} />
            <h2 className="text-lg font-bold">Timeline</h2>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Stage</label>
            <p className="text-md">{research.current_stage || 'N/A'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-gray-500">Start Date</label>
              <p className="text-sm">{research.start_date || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-500">Defense Date</label>
              <p className="text-sm">{research.target_defense_date || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Manuscript Versions Section */}
      <div className="bg-[var(--background)] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            {isViewerOnly ? 'Research Document' : 'Manuscript Versions'}
          </h2>
          <p className="text-xs text-gray-500">
            {isViewerOnly
              ? 'Read or download the full text of this research.'
              : 'Download the current or previous versions of the manuscript.'}
          </p>
        </div>

        {!isViewerOnly && displayVersions.length > 1 && (
          <div className="flex justify-end">
            <Link
              href={appendFromParam(`/dashboard/research/${researchId}/compare`, currentPageHref)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
                          <GitCompareArrows size={16} />
              Compare Versions
            </Link>
          </div>
        )}

        {(latestSubmissionFormat === 'both' || latestSubmissionFormat === 'text') && (
          <div className="space-y-4">
            {latestSubmissionFormat === 'both' && (
              <div className="flex items-center gap-2">
                <Link
                  href={appendFromParam(
                    buildPathWithSearch(`/dashboard/research/${researchId}`, [
                      ['view', 'pdf'],
                    ]),
                    resolvedSearchParams.from ?? null
                  )}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${activeDocumentView === 'pdf' ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  PDF View
                </Link>
                <Link
                  href={appendFromParam(
                    buildPathWithSearch(`/dashboard/research/${researchId}`, [
                      ['view', 'text'],
                    ]),
                    resolvedSearchParams.from ?? null
                  )}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${activeDocumentView === 'text' ? 'bg-blue-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Text View
                </Link>
              </div>
            )}

            {activeDocumentView === 'text' && latestHasText && (
              <ResearchTextWorkspaceCard
                content={latestDocumentContent}
                workspaceHref={latestWorkspaceHref}
                canEnterWorkspace={!isViewerOnly && (isTeacher || isAuthor)}
              />
            )}
          </div>
        )}

         {/* Viewer Mode: Clean, single document view */}     
        {displayVersions.length > 0 && activeDocumentView === 'pdf' ? (
          <div className="space-y-3 mt-4">
            {isViewerOnly ? (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="text-blue-600" size={20} />
                    <h3 className="font-bold text-gray-700 dark:text-gray-300">Full Text PDF</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Published on {new Date(displayVersions[0].created_at).toLocaleString()}
                  </p>
                  <p className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                    {displayVersions[0].original_file_name || 'Attached manuscript.pdf'}
                  </p>
                </div>
                <div className="w-full md:w-auto">
                  {displayVersions[0].file_url ? (
                    <DocumentDownloadButton
                      fileUrl={displayVersions[0].file_url}
                      downloadFileName={displayVersions[0].original_file_name}
                    />
                  ) : null}
                </div>
              </div>
            ) : (
              // Author/Teacher Mode: Full version history
              displayVersions.map((v, index: number) => {
                const isLatest = index === 0
                const previousVersion = displayVersions[index + 1]
                return (
                  <div
                    key={v.id}
                    className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl border
                    ${isLatest
                      ? 'border-purple-200 bg-purple-50/50 dark:border-purple-900/30 dark:bg-purple-900/10'
                      : 'border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-bold ${isLatest ? 'text-purple-700 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          Version {getVersionLabel(v)}
                        </h3>
                        {isLatest && (
                          <span className="bg-purple-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded">Latest</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Uploaded on {new Date(v.created_at).toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs font-medium text-gray-500">
                        {v.created_by_role === 'teacher' ? 'Teacher review edit' : 'Student submission'}
                      </p>
                      {v.change_summary ? (
                        <p className="mt-1 text-xs text-gray-500">{v.change_summary}</p>
                      ) : null}
                      <p className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                        {v.original_file_name || 'Attached manuscript.pdf'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {previousVersion && (
                          <Link
                            href={appendFromParam(
                              buildPathWithSearch(`/dashboard/research/${research.id}/compare`, [
                                ['target', String(v.version_number)],
                                ['base', String(previousVersion.version_number)],
                              ]),
                              currentPageHref
                            )}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-semibold transition-colors text-sm flex-1"
                          >
                            <GitCompareArrows size={16} /> Compare
                          </Link>
                        )}
                        {(isTeacher || isAuthor) && (
                          <Link
                            href={appendFromParam(
                              buildPathWithSearch(`/dashboard/research/${research.id}/annotate`, [
                                ['version', String(v.version_number)],
                              ]),
                              currentPageHref
                            )}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 rounded-lg font-semibold transition-colors text-sm flex-1"
                        >
                          <Edit3 size={16} /> Annotate
                          </Link>
                      )}
                      {v.file_url ? (
                        <DocumentDownloadButton
                          fileUrl={v.file_url}
                          downloadFileName={v.original_file_name}
                        />
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : displayVersions.length === 0 && activeDocumentView === 'pdf' ? (
          <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-400">
            <span className="text-sm italic">No documents attached yet.</span>
          </div>
        ) : null}
      </div>

    </div>
  )
}
