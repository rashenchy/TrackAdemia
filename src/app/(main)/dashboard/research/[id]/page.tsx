import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, GraduationCap, Edit3, FileText, Users, User } from 'lucide-react'
import { DocumentDownloadButton } from '@/components/dashboard/DocumentDownloadButton'
import { updateResearchStatus } from './actions'

export default async function ViewResearchPage({ params }: { params: Promise<{ id: string }> }) {

  // Initialization
  const resolvedParams = await params
  const researchId = resolvedParams.id
  const supabase = await createClient()

  // Authentication and profile
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isTeacher = profile?.role === 'mentor'

  // Fetch research details
  const { data: research } = await supabase
    .from('research')
    .select('*')
    .eq('id', researchId)
    .single()

  if (!research) {
    return <div className="p-8">Research not found or you don't have access.</div>
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
      .single()

    if (adviserProfile) {
      externalAdviserName = `${adviserProfile.first_name} ${adviserProfile.last_name}`
    }
  }

  // Fetch team member profiles
  let teamMembers: any[] = []
  if (research.members && research.members.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, course_program')
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
  const displayVersions = versions && versions.length > 0
    ? versions
    : research.file_url
      ? [{
          id: 'legacy',
          file_url: research.file_url,
          version_number: 1,
          created_at: research.created_at
        }]
      : []

  const updateStatusAction = updateResearchStatus.bind(null, researchId)

  // Render
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link
            href={isViewerOnly ? '/dashboard/repository' : '/dashboard'}
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Research Details</h1>
        </div>

        {/* Status Update Control */}
        {!isViewerOnly && isTeacher ? (
          <form
            action={updateStatusAction}
            className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm w-fit"
          >
            <select
              name="status"
              defaultValue={research.status}
              className="text-sm font-semibold bg-transparent border-none outline-none cursor-pointer pl-2"
            >
              <option value="Pending Review">Pending Review</option>
              <option value="Resubmitted">Resubmitted</option>
              <option value="Revision Requested">Revision Requested</option>
              <option value="Approved">Approved (Internal)</option>
              <option value="Published">Published (Public Repository)</option>
              <option value="Rejected">Rejected</option>
            </select>
            <button
              type="submit"
              className="text-xs font-bold bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Update
            </button>
          </form>
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

         {/* Viewer Mode: Clean, single document view */}     
        {displayVersions.length > 0 ? (
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
                </div>
                <div className="w-full md:w-auto">
                  <DocumentDownloadButton fileUrl={displayVersions[0].file_url} />
                </div>
              </div>
            ) : (
              // Author/Teacher Mode: Full version history
              displayVersions.map((v: any, index: number) => {
                const isLatest = index === 0
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
                          Version {v.version_number}
                        </h3>
                        {isLatest && (
                          <span className="bg-purple-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded">Latest</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Uploaded on {new Date(v.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                      {isLatest && (
                        <Link
                          href={`/dashboard/research/${research.id}/annotate`}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 rounded-lg font-semibold transition-colors text-sm flex-1"
                        >
                          <Edit3 size={16} /> Annotate
                        </Link>
                      )}
                      <DocumentDownloadButton fileUrl={v.file_url} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          <div className="p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-400">
            <span className="text-sm italic">No documents attached yet.</span>
          </div>
        )}
      </div>

    </div>
  )
}
