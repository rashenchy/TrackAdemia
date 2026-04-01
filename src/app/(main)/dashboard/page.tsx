import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { SubmissionsTable } from '@/components/dashboard/SubmissionsTable'
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  Info,
  LayoutGrid,
  Megaphone,
  TriangleAlert,
  UserMinus,
} from 'lucide-react'
import Link from 'next/link'
import RotatingQuote from '@/components/dashboard/RotatingQuote'
import { getActiveAnnouncements } from '@/app/(admin)/admin/announcements/actions'
import {
  ADMIN_VIEW_COOKIE,
  getAdminViewMeta,
  isAdminViewMode,
} from '@/lib/admin-view-mode'

type DashboardSubmission = {
  id: string
  user_id: string
  subject_code?: string | null
  unresolved_feedback_count?: number
  [key: string]: unknown
}

type TeacherSection = {
  id: string
  name: string
  course_code?: string | null
  [key: string]: unknown
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; section?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const successMessage = resolvedSearchParams.success
  const activeSectionId = resolvedSearchParams.section

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name')
    .eq('id', user.id)
    .single()

  const cookieStore = await cookies()
  const previewCookie = cookieStore.get(ADMIN_VIEW_COOKIE)?.value
  const adminPreviewMode = isAdminViewMode(previewCookie) ? previewCookie : null
  const previewMeta = adminPreviewMode ? getAdminViewMeta(adminPreviewMode) : null
  const isAdminPreview = profile?.role === 'admin' && Boolean(previewMeta)

  if (profile?.role === 'admin') {
    if (!isAdminPreview) {
      redirect('/admin')
    }
  }

  const activeAnnouncements = await getActiveAnnouncements()

  let displaySubmissions: DashboardSubmission[] = []
  let teacherSections: TeacherSection[] = []
  let sectionRemovalNotifications: Array<{
    id: string
    title: string
    message: string
    reason: string | null
    created_at: string
  }> = []

  const isTeacher = isAdminPreview ? previewMeta?.role === 'mentor' : profile?.role === 'mentor'

  if (isAdminPreview) {
    return (
      <div className="space-y-8">
        <div className="rounded-[1.75rem] border border-blue-200 bg-blue-50 p-6 text-blue-900 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-100">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-700 dark:text-blue-300">
            Preview Mode
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">
            Welcome back, {previewMeta?.displayName || 'User Preview'}!
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 opacity-90">
            This dashboard is being rendered as a{' '}
            {previewMeta?.role === 'mentor'
              ? 'teacher / adviser'
              : previewMeta?.isVerified
                ? 'verified student'
                : 'student awaiting approval'}{' '}
            so you can inspect navigation, access state, and the overall user-facing shell before
            returning to admin tools.
          </p>
        </div>

        {activeAnnouncements.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-500">
              <Megaphone size={16} />
              Announcements
            </div>

            <div className="space-y-3">
              {activeAnnouncements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                    <span>{announcement.type}</span>
                    <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                  </div>
                  <h2 className="mt-3 text-lg font-bold text-slate-950 dark:text-white">
                    {announcement.title}
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {announcement.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">
            {isTeacher ? 'Teacher dashboard preview is active' : 'Student dashboard preview is active'}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            Use the sidebar to inspect how the interface behaves for this account type. Data-heavy
            tools in preview mode intentionally stay lightweight so the layout, access rules, and
            messaging are easier to verify.
          </p>
        </div>
      </div>
    )
  }

  if (isTeacher) {
    const { data: sections } = await supabase
      .from('sections')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    teacherSections = sections || []

    if (teacherSections.length > 0) {
      const sectionIds = teacherSections.map((section) => section.id)

      const { data: members } = await supabase
        .from('section_members')
        .select('section_id, user_id')
        .in('section_id', sectionIds)

      const studentIds = [...new Set(members?.map((member) => member.user_id) || [])]

      if (studentIds.length > 0) {
        const [researchRes, profilesRes] = await Promise.all([
          supabase
            .from('research')
            .select('*')
            .in('user_id', studentIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', studentIds),
        ])

        const studentResearch = researchRes.data || []
        const studentProfiles = profilesRes.data || []
        const mappedSubmissions: DashboardSubmission[] = []

        studentResearch.forEach((research) => {
          const studentMemberships =
            members?.filter((member) => member.user_id === research.user_id) || []

          let matchedSectionId = null

          for (const membership of studentMemberships) {
            const section = teacherSections.find((item) => item.id === membership.section_id)

            if (section && section.course_code === research.subject_code) {
              matchedSectionId = section.id
              break
            }
          }

          if (!matchedSectionId && studentMemberships.length > 0) {
            matchedSectionId = studentMemberships[0].section_id
          }

          if (matchedSectionId) {
            const section = teacherSections.find((item) => item.id === matchedSectionId)
            const author = studentProfiles.find((item) => item.id === research.user_id)

            mappedSubmissions.push({
              ...research,
              section_id: matchedSectionId,
              section_name: section?.name,
              author_name: author
                ? `${author.first_name} ${author.last_name}`
                : 'Unknown Student',
            })
          }
        })

        if (activeSectionId && activeSectionId !== 'all') {
          displaySubmissions = mappedSubmissions.filter(
            (submission) => submission.section_id === activeSectionId
          )
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
        const author = adviseeProfiles?.find((profileItem) => profileItem.id === item.user_id)

        return {
          ...item,
          section_id: 'adviser-access',
          section_name: 'Adviser Access',
          author_name: author
            ? `${author.first_name} ${author.last_name}`
            : 'Unknown Student',
        }
      })

      const mergedSubmissions = [
        ...displaySubmissions,
        ...mappedAdviseeResearch.filter(
          (item) => !displaySubmissions.some((existing) => existing.id === item.id)
        ),
      ]

      displaySubmissions =
        activeSectionId && activeSectionId !== 'all'
          ? mergedSubmissions.filter((submission) => submission.section_id === activeSectionId)
          : mergedSubmissions
    }
  } else {
    const { data: notifications } = await supabase
      .from('user_notifications')
      .select('id, title, message, reason, created_at, is_read')
      .eq('user_id', user.id)
      .eq('notification_type', 'section_removal')
      .order('created_at', { ascending: false })
      .limit(6)

    sectionRemovalNotifications = notifications || []

    const unreadNotificationIds = (notifications || [])
      .filter((item) => !item.is_read)
      .map((item) => item.id)

    if (unreadNotificationIds.length > 0) {
      await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .in('id', unreadNotificationIds)
    }

    const { data: submissions } = await supabase
      .from('research')
      .select('*')
      .or(`user_id.eq.${user.id},members.cs.{${user.id}}`)
      .order('created_at', { ascending: false })

    displaySubmissions = submissions || []
  }

  if (displaySubmissions.length > 0) {
    const submissionIds = displaySubmissions.map((submission) => submission.id)

    const { data: annotations } = await supabase
      .from('annotations')
      .select('research_id, is_resolved')
      .in('research_id', submissionIds)

    displaySubmissions = displaySubmissions.map((submission) => {
      const relatedAnnotations =
        annotations?.filter((annotation) => annotation.research_id === submission.id) || []

      return {
        ...submission,
        unresolved_feedback_count: relatedAnnotations.filter(
          (annotation) => !annotation.is_resolved
        ).length,
      }
    })
  }

  return (
    <div className="space-y-8">
      {successMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 animate-in fade-in slide-in-from-top-2">
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

      {!isTeacher && sectionRemovalNotifications.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-500">
            <BellRing size={16} />
            Notifications
          </div>

          <div className="space-y-3">
            {sectionRemovalNotifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900 shadow-sm dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <UserMinus size={18} className="text-red-600 dark:text-red-300" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-red-700 dark:bg-red-900/70 dark:text-red-200">
                        section removal
                      </span>
                      <span className="text-xs opacity-70">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-lg font-bold">{notification.title}</h2>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 opacity-90">
                        {notification.message}
                      </p>
                      {notification.reason && (
                        <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-sm font-medium text-red-800 dark:bg-black/20 dark:text-red-100">
                          Reason: {notification.reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase text-gray-500">
            <LayoutGrid size={16} /> Filter by Section
          </h3>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                !activeSectionId || activeSectionId === 'all'
                  ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-900/20'
              }`}
            >
              All Sections
            </Link>

            {teacherSections.map((section) => (
              <Link
                key={section.id}
                href={`/dashboard?section=${section.id}`}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                  activeSectionId === section.id
                    ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-900/20'
                }`}
              >
                {section.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          {isTeacher ? 'Student Submissions' : 'My Submissions'}
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500 dark:bg-gray-800">
            {displaySubmissions?.length || 0}
          </span>
        </h2>

        <SubmissionsTable submissions={displaySubmissions || []} />
      </div>
    </div>
  )
}
