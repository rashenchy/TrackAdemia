import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubmissionsTable } from '@/components/dashboard/SubmissionsTable'
import { AlertCircle, CheckCircle2, Info, LayoutGrid, Megaphone, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import RotatingQuote from '@/components/dashboard/RotatingQuote'
import { getActiveAnnouncements } from '@/app/(admin)/admin/announcements/actions'

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string, section?: string }>
}) {

  // Resolve query parameters from the URL
  const resolvedSearchParams = await searchParams
  const successMessage = resolvedSearchParams.success
  const activeSectionId = resolvedSearchParams.section

  // Initialize Supabase and verify authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch the user's profile to determine role and display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name')
    .eq('id', user.id)
    .single()

  // Redirect admins to the admin dashboard
  if (profile?.role === 'admin') {
    redirect('/admin')
  }

  const activeAnnouncements = await getActiveAnnouncements()

  let displaySubmissions: any[] = []
  let teacherSections: any[] = []

  const isTeacher = profile?.role === 'mentor'

  // Teacher dashboard logic
  if (isTeacher) {

    // Fetch sections managed by the teacher
    const { data: sections } = await supabase
      .from('sections')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    teacherSections = sections || []

    // If the teacher manages sections, fetch student submissions
    if (teacherSections.length > 0) {

      const sectionIds = teacherSections.map(s => s.id)

      // Fetch section membership records
      const { data: members } = await supabase
        .from('section_members')
        .select('section_id, user_id')
        .in('section_id', sectionIds)

      // Extract unique student IDs
      const studentIds = [...new Set(members?.map(m => m.user_id) || [])]

      if (studentIds.length > 0) {

        // Fetch student research and profile data in parallel
        const [researchRes, profilesRes] = await Promise.all([
          supabase
            .from('research')
            .select('*')
            .in('user_id', studentIds)
            .order('created_at', { ascending: false }),

          supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', studentIds)
        ])

        const studentResearch = researchRes.data || []
        const studentProfiles = profilesRes.data || []

        // Map submissions to their respective sections and authors
        const mappedSubmissions: any[] = []

        studentResearch.forEach(res => {

          const studentMemberships =
            members?.filter(m => m.user_id === res.user_id) || []

          let matchedSectionId = null

          // Match research to a section using course code
          for (const mem of studentMemberships) {

            const sec = teacherSections.find(s => s.id === mem.section_id)

            if (sec && sec.course_code === res.subject_code) {
              matchedSectionId = sec.id
              break
            }
          }

          // Fallback to first membership if no exact course match
          if (!matchedSectionId && studentMemberships.length > 0) {
            matchedSectionId = studentMemberships[0].section_id
          }

          if (matchedSectionId) {

            const sec = teacherSections.find(s => s.id === matchedSectionId)
            const author = studentProfiles.find(p => p.id === res.user_id)

            mappedSubmissions.push({
              ...res,
              section_id: matchedSectionId,
              section_name: sec?.name,
              author_name: author
                ? `${author.first_name} ${author.last_name}`
                : 'Unknown Student'
            })
          }
        })

        // Apply section filter if selected
        if (activeSectionId && activeSectionId !== 'all') {
          displaySubmissions =
            mappedSubmissions.filter(s => s.section_id === activeSectionId)
        } else {
          displaySubmissions = mappedSubmissions
        }
      }
    }

    const { data: adviseeResearch } = await supabase
      .from('research')
      .select('*')
      .eq('adviser_id', user.id)
      .order('created_at', { ascending: false })

    if (adviseeResearch && adviseeResearch.length > 0) {
      const adviseeIds = [...new Set(adviseeResearch.map((item) => item.user_id))]

      const { data: adviseeProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', adviseeIds)

      const mappedAdviseeResearch = adviseeResearch.map((item) => {
        const author = adviseeProfiles?.find((profile) => profile.id === item.user_id)

        return {
          ...item,
          section_id: 'adviser-access',
          section_name: 'Adviser Access',
          author_name: author
            ? `${author.first_name} ${author.last_name}`
            : 'Unknown Student'
        }
      })

      const mergedSubmissions = [
        ...displaySubmissions,
        ...mappedAdviseeResearch.filter(
          (item) => !displaySubmissions.some((existing) => existing.id === item.id)
        )
      ]

      displaySubmissions =
        activeSectionId && activeSectionId !== 'all'
          ? mergedSubmissions.filter(s => s.section_id === activeSectionId)
          : mergedSubmissions
    }

  } else {

    // Student dashboard logic: fetch their own research submissions
    const { data: submissions } = await supabase
      .from('research')
      .select('*')
      .or(`user_id.eq.${user.id},members.cs.{${user.id}}`)
      .order('created_at', { ascending: false })

    displaySubmissions = submissions || []
  }

  // Fetch annotation feedback counts for displayed submissions
  if (displaySubmissions.length > 0) {

    const submissionIds = displaySubmissions.map(s => s.id)

    const { data: annotations } = await supabase
      .from('annotations')
      .select('research_id, is_resolved')
      .in('research_id', submissionIds)

    // Attach unresolved annotation counts to each submission
    displaySubmissions = displaySubmissions.map(sub => {

      const relatedAnnotations =
        annotations?.filter(a => a.research_id === sub.id) || []

      const unresolvedCount =
        relatedAnnotations.filter(a => !a.is_resolved).length

      return {
        ...sub,
        unresolved_feedback_count: unresolvedCount
      }
    })
  }

  // Render the dashboard UI
  return (
    <div className="space-y-8">

      {successMessage && (
        <div className="flex items-center gap-2 p-4 mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {profile?.first_name || user.user_metadata.first_name}!
        </h1>
        <RotatingQuote />
      </div>

      {activeAnnouncements.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-500">
            <Megaphone size={16} />
            Announcements
          </div>

          <div className="space-y-3">
            {activeAnnouncements.map((announcement) => {
              const announcementStyles = {
                info: {
                  wrapper:
                    'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-100',
                  badge:
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/70 dark:text-blue-200',
                  icon: <Info size={18} className="text-blue-600 dark:text-blue-300" />,
                },
                warning: {
                  wrapper:
                    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100',
                  badge:
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/70 dark:text-amber-200',
                  icon: <TriangleAlert size={18} className="text-amber-600 dark:text-amber-300" />,
                },
                success: {
                  wrapper:
                    'border-green-200 bg-green-50 text-green-900 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-100',
                  badge:
                    'bg-green-100 text-green-700 dark:bg-green-900/70 dark:text-green-200',
                  icon: <CheckCircle2 size={18} className="text-green-600 dark:text-green-300" />,
                },
                urgent: {
                  wrapper:
                    'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100',
                  badge:
                    'bg-red-100 text-red-700 dark:bg-red-900/70 dark:text-red-200',
                  icon: <AlertCircle size={18} className="text-red-600 dark:text-red-300" />,
                },
              }[announcement.type]

              return (
                <div
                  key={announcement.id}
                  className={`rounded-2xl border p-5 shadow-sm ${announcementStyles.wrapper}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{announcementStyles.icon}</div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${announcementStyles.badge}`}
                        >
                          {announcement.type}
                        </span>
                        <span className="text-xs opacity-70">
                          {new Date(announcement.created_at).toLocaleDateString()}
                        </span>
                        {announcement.expires_at && (
                          <span className="text-xs opacity-70">
                            Expires {new Date(announcement.expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div>
                        <h2 className="text-lg font-bold">{announcement.title}</h2>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 opacity-90">
                          {announcement.message}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {isTeacher && teacherSections.length > 0 && (
        <div className="space-y-3">

          <h3 className="text-sm font-bold uppercase text-gray-500 flex items-center gap-2">
            <LayoutGrid size={16} /> Filter by Section
          </h3>

          <div className="flex flex-wrap gap-2">

            <Link
              href="/dashboard"
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                !activeSectionId || activeSectionId === 'all'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 dark:shadow-none'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }`}
            >
              All Sections
            </Link>

            {teacherSections.map(sec => (
              <Link
                key={sec.id}
                href={`/dashboard?section=${sec.id}`}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                  activeSectionId === sec.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 dark:shadow-none'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
              >
                {sec.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">

        <h2 className="text-xl font-bold flex items-center gap-2">
          {isTeacher ? 'Student Submissions' : 'My Submissions'}
          <span className="text-xs font-normal bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-500">
            {displaySubmissions?.length || 0}
          </span>
        </h2>

        <SubmissionsTable submissions={displaySubmissions || []} />

      </div>
    </div>
  )
}
