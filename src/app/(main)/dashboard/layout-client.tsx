'use client'

// @refresh reset

import { useState, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { stopViewAsUser } from '@/app/(admin)/admin/view-as-user/actions'
import { getTeacherSubmissionData } from '@/lib/users/teacher-submissions'
import { usePopup } from '@/components/ui/PopupProvider'
import {
  ResponsiveAppShell,
  type AppShellNavItem,
} from '@/components/navigation/ResponsiveAppShell'
import {
  ArrowLeft,
  Home,
  Settings,
  FilePlus,
  GraduationCap,
  AlertCircle,
  CheckSquare,
  BookOpen,
  Sparkles,
  ShieldAlert,
  Files,
  BadgeCheck,
  SpellCheck,
  KeyRound,
} from 'lucide-react'

export default function DashboardLayoutClient({
  children,
  previewMode = null,
  previewDisplayName = '',
  previewRole = '',
  previewIsVerified = false,
  isAdminPreview = false,
  initialDisplayName = '',
  initialRole = '',
  initialIsVerified = false,
}: {
  children: React.ReactNode
  previewMode?: 'mentor' | 'student' | 'student-pending' | null
  previewDisplayName?: string
  previewRole?: string
  previewIsVerified?: boolean
  isAdminPreview?: boolean
  initialDisplayName?: string
  initialRole?: string
  initialIsVerified?: boolean
}) {
  const effectiveInitialRole = isAdminPreview ? previewRole : initialRole
  const effectiveInitialVerified = isAdminPreview ? previewIsVerified : initialIsVerified
  const effectiveInitialDisplayName = isAdminPreview ? previewDisplayName : initialDisplayName

  const router = useRouter()
  const pathname = usePathname()
  const [isFaculty, setIsFaculty] = useState(
    effectiveInitialRole === 'mentor' || effectiveInitialRole === 'admin'
  )
  const [isVerified, setIsVerified] = useState(effectiveInitialVerified)
  const [isStudent, setIsStudent] = useState(effectiveInitialRole === 'student')
  const [pendingRoute, setPendingRoute] = useState<string | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [userName, setUserName] = useState(effectiveInitialDisplayName)
  const [userRole, setUserRole] = useState(effectiveInitialRole)
  const [unresolvedCount, setUnresolvedCount] = useState(0)
  const [submissionAlertCount, setSubmissionAlertCount] = useState(0)
  const [pendingStudentCount, setPendingStudentCount] = useState(0)
  const [pendingProofreaderCount, setPendingProofreaderCount] = useState(0)
  const [pendingAccessRequestsCount, setPendingAccessRequestsCount] = useState(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isNavigating, startNavigation] = useTransition()
  const { notify } = usePopup()
  const isFacultyRef = useRef(false)
  const currentUserIdRef = useRef<string | null>(null)
  const [supabase] = useState(() => createClient())
  const effectiveUserName = isAdminPreview ? previewDisplayName : userName
  const effectiveUserRole = isAdminPreview ? previewRole : userRole
  const effectiveIsFaculty = isAdminPreview
    ? previewRole === 'mentor' || previewRole === 'admin'
    : isFaculty
  const effectiveIsStudent = isAdminPreview ? previewRole === 'student' : isStudent
  const effectiveIsVerified =
    isAdminPreview && previewRole === 'admin' ? true : isAdminPreview ? previewIsVerified : isVerified
  const effectiveUnresolvedCount = isAdminPreview ? 0 : unresolvedCount
  const effectiveSubmissionAlertCount = isAdminPreview ? 0 : submissionAlertCount
  const effectivePendingStudentCount = isAdminPreview ? 0 : pendingStudentCount
  const effectivePendingProofreaderCount = isAdminPreview ? 0 : pendingProofreaderCount
  const effectivePendingAccessRequestsCount = isAdminPreview ? 0 : pendingAccessRequestsCount
  const pendingAccessAllowedPaths = [
    '/dashboard/repository',
    '/dashboard/profile',
    '/dashboard/settings',
  ]
  const isFacultyPendingApproval =
    effectiveIsFaculty && effectiveUserRole !== 'admin' && !effectiveIsVerified
  const isStudentPendingApproval = effectiveIsStudent && !effectiveIsVerified
  const isProofreaderPendingApproval = effectiveUserRole === 'proofreader' && !effectiveIsVerified
  const isPendingAccessLocked =
    (isStudentPendingApproval || isFacultyPendingApproval || isProofreaderPendingApproval) &&
    !pendingAccessAllowedPaths.some(
      (allowedPath) => pathname === allowedPath || pathname.startsWith(`${allowedPath}/`)
    )

  const handleLogout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    setShowLogoutConfirm(true)

    try {
      await supabase.auth.signOut()
      setShowLogoutConfirm(false)
      router.replace('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
    }
  }

  const handleRefresh = () => {
    if (isRefreshing) return

    setIsRefreshing(true)
    notify({
      title: 'Refreshing dashboard',
      message: 'Loading the latest page data.',
      variant: 'info',
    })
    startNavigation(() => {
      router.refresh()
    })

    setTimeout(() => {
      setIsRefreshing(false)
      notify({
        title: 'Dashboard refreshed',
        message: 'Your workspace is up to date.',
        variant: 'success',
      })
    }, 700)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    localStorage.setItem('theme', 'light')

    if (isAdminPreview) {
      isFacultyRef.current = previewRole === 'mentor' || previewRole === 'admin'
      return
    }

    const checkUserRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      currentUserIdRef.current = user.id

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_verified, first_name, last_name')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserName(
          `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'User'
        )
        setUserRole(profile.role)
      }

      if (profile?.role === 'mentor' || profile?.role === 'admin') {
        setIsFaculty(true)
        setIsStudent(false)
        isFacultyRef.current = true
        setIsVerified(profile.role === 'admin' ? true : profile.is_verified || false)
      } else if (profile?.role === 'student') {
        setIsFaculty(false)
        setIsStudent(true)
        isFacultyRef.current = false
        setIsVerified(profile.is_verified || false)
      } else if (profile?.role === 'guest') {
        setIsFaculty(false)
        setIsStudent(false)
        isFacultyRef.current = false
        setIsVerified(true)
      } else if (profile?.role === 'proofreader') {
        setIsFaculty(false)
        setIsStudent(false)
        isFacultyRef.current = false
        setIsVerified(profile.is_verified || false)
      } else {
        setIsFaculty(false)
        setIsStudent(false)
        isFacultyRef.current = false
      }
    }

    checkUserRole()
  }, [isAdminPreview, previewRole, supabase])

  useEffect(() => {
    if (isAdminPreview) return

    const fetchCounts = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      currentUserIdRef.current = user.id

      const { count: personalCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('created_by', user.id)
        .eq('type', 'student')
        .eq('status', 'unresolved')

      const { count: teacherCount } = await supabase
        .from('task_completions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id)
        .eq('is_completed', false)

      const { data: research } = await supabase
        .from('research')
        .select('id, user_id')
        .or(`user_id.eq.${user.id},members.cs.{${user.id}}`)

      const researchIds = research?.map((item) => item.id) || []

      const { count: annotationCount } = await supabase
        .from('annotations')
        .select('*', { count: 'exact', head: true })
        .in('research_id', researchIds)
        .eq('is_resolved', false)

      setUnresolvedCount((personalCount || 0) + (teacherCount || 0) + (annotationCount || 0))

      // Access requests count for research owned by the user (or taught/advised if faculty)
      const leaderResearchIds = research?.filter((r) => r.user_id === user.id).map((r) => r.id) || []

      if (isFacultyRef.current) {
        const { data: sections } = await supabase
          .from('sections')
          .select('id, course_code')
          .eq('teacher_id', user.id)

        const sectionIds = (sections || []).map((s: any) => s.id)
        const courseCodes = (sections || []).map((s: any) => s.course_code).filter(Boolean) as string[]

        let sectionStudentIds: string[] = []
        if (sectionIds.length > 0) {
          const { data: memberships } = await supabase
            .from('section_members')
            .select('user_id')
            .in('section_id', sectionIds)

          if (memberships) {
            sectionStudentIds = Array.from(new Set(memberships.map((m: any) => m.user_id).filter(Boolean)))
          }
        }

        const facultyFilters = [`user_id.eq.${user.id}`, `adviser_id.eq.${user.id}`]
        if (sectionStudentIds.length > 0) {
          facultyFilters.push(`user_id.in.(${sectionStudentIds.join(',')})`)
        }
        if (courseCodes.length > 0) {
          facultyFilters.push(`subject_code.in.(${courseCodes.join(',')})`)
        }

        const { data: facultyResearches } = await supabase
          .from('research')
          .select('id')
          .or(facultyFilters.join(','))

        if (facultyResearches) {
          facultyResearches.forEach((fr: any) => {
            if (!leaderResearchIds.includes(fr.id)) leaderResearchIds.push(fr.id)
          })
        }
      }

      if (leaderResearchIds.length > 0) {
        const { count: pendingReqs } = await supabase
          .from('research_access_requests')
          .select('*', { count: 'exact', head: true })
          .in('research_id', leaderResearchIds)
          .eq('status', 'pending')
        setPendingAccessRequestsCount(pendingReqs || 0)
      } else {
        setPendingAccessRequestsCount(0)
      }

      if (isFacultyRef.current) {
        const { attentionCount } = await getTeacherSubmissionData(supabase, user.id)
        setSubmissionAlertCount(attentionCount)

        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student')
          .eq('is_verified', false)
          .eq('is_active', true)

        setPendingStudentCount(count || 0)

        const { count: proofCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'proofreader')
          .eq('is_verified', false)
          .eq('is_active', true)

        setPendingProofreaderCount(proofCount || 0)
      } else {
        setSubmissionAlertCount(0)
        setPendingStudentCount(0)
        setPendingProofreaderCount(0)
      }
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    fetchCounts()

    const refreshFacultyCounts = () => {
      fetchCounts()
    }
    const refreshAccessRequests = () => {
      fetchCounts()
    }

    window.addEventListener('faculty-pending-approvals-changed', refreshFacultyCounts)
    window.addEventListener('access-requests-changed', refreshAccessRequests)

    const channel = supabase
      .channel('task-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasks' },
        (payload: { new?: { type?: string; title?: string } }) => {
          if (payload.new?.type === 'teacher') {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Assigned Task', {
                body: payload.new.title,
                icon: '/logo.png',
              })
            }
          }
          fetchCounts()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'research' },
        (payload: { new?: { status?: string; title?: string }; old?: { status?: string } }) => {
          if (payload.new?.status === 'Resubmitted' && payload.old?.status !== 'Resubmitted') {
            if (
              isFacultyRef.current &&
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              new Notification('Document Resubmitted', {
                body: `"${payload.new.title}" has been resubmitted for your review.`,
                icon: '/logo.png',
              })
            }
            fetchCounts()
            router.refresh()
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'annotations' }, fetchCounts)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_completions' },
        fetchCounts
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'research_access_requests' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Research Access Request', {
                body: payload.new?.message
                  ? `Access requested: "${payload.new.message.slice(0, 60)}"`
                  : 'You have a new access request awaiting review.',
                icon: '/logo.png',
              })
            }
          }
          fetchCounts()
        }
      )
      .subscribe()

    return () => {
      window.removeEventListener('faculty-pending-approvals-changed', refreshFacultyCounts)
      window.removeEventListener('access-requests-changed', refreshAccessRequests)
      supabase.removeChannel(channel)
    }
  }, [isAdminPreview, supabase, router, userRole])

  const handleSidebarNavigation = (href: string) => {
    if (pathname === href || isNavigating) return

    setPendingRoute(href)
    startNavigation(() => {
      router.push(href)
    })
  }

  const visualRoute = isNavigating && pendingRoute ? pendingRoute : pathname

  const effectiveIsGuest = effectiveUserRole === 'guest'
  const effectiveIsProofreader = effectiveUserRole === 'proofreader'

  const navItems: AppShellNavItem[] = effectiveIsGuest
    ? [
        { name: 'Home', href: '/dashboard', icon: Home },
        { name: 'Repository', href: '/dashboard/repository', icon: BookOpen },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
      ]
    : effectiveIsProofreader
      ? [
          { name: 'Home', href: '/dashboard', icon: Home },
          { name: 'Grammar Checker', href: '/dashboard/grammar', icon: Sparkles },
          { name: 'Plagiarism Checker', href: '/dashboard/plagiarism', icon: ShieldAlert },
          { name: 'Repository', href: '/dashboard/repository', icon: BookOpen },
          { name: 'Settings', href: '/dashboard/settings', icon: Settings },
        ]
      : [
          { name: 'Home', href: '/dashboard', icon: Home },
          { name: 'Submit Research', href: '/dashboard/submit', icon: FilePlus },

          ...(effectiveIsFaculty && effectiveIsVerified
            ? [
                {
                  name: 'Student Submissions',
                  href: '/dashboard/student-submissions',
                  icon: Files,
                  badgeCount: effectiveSubmissionAlertCount,
                },
                {
                  name: 'Access Requests',
                  href: '/dashboard/access-requests',
                  icon: KeyRound,
                  badgeCount: effectivePendingAccessRequestsCount,
                },
              ]
            : effectiveIsStudent
              ? [
                  {
                    name: 'Access Requests',
                    href: '/dashboard/access-requests',
                    icon: KeyRound,
                    badgeCount: effectivePendingAccessRequestsCount,
                  },
                ]
              : []),

          {
            name: 'Task Manager',
            href: '/dashboard/tasks',
            icon: CheckSquare,
            badgeCount: effectiveUnresolvedCount,
          },

          ...(effectiveIsFaculty && effectiveIsVerified
            ? [
                {
                  name: 'Student Verification',
                  href: '/dashboard/student-verification',
                  icon: BadgeCheck,
                  badgeCount: effectivePendingStudentCount,
                },
                {
                  name: 'Proofreader Verification',
                  href: '/dashboard/proofreader-verification',
                  icon: SpellCheck,
                  badgeCount: effectivePendingProofreaderCount,
                },
              ]
            : []),

          ...((effectiveIsFaculty && effectiveIsVerified) || effectiveIsStudent
            ? [
                {
                  name: effectiveIsFaculty ? 'Manage Sections' : 'My Sections',
                  href: '/dashboard/sections',
                  icon: GraduationCap,
                },
              ]
            : []),

          { name: 'Grammar Checker', href: '/dashboard/grammar', icon: Sparkles },
          { name: 'Plagiarism Checker', href: '/dashboard/plagiarism', icon: ShieldAlert },
          { name: 'Repository', href: '/dashboard/repository', icon: BookOpen },
          { name: 'Settings', href: '/dashboard/settings', icon: Settings },
        ]

  const roleLabel =
    effectiveUserRole === 'mentor' || effectiveUserRole === 'admin'
      ? 'Faculty / Adviser'
      : effectiveUserRole === 'guest'
        ? 'Guest Researcher'
        : effectiveUserRole === 'proofreader'
          ? 'Language Editor / Proofreader'
          : effectiveUserRole || 'User'

  const previewSubtitle = isAdminPreview
    ? `Previewing ${
        previewMode === 'mentor'
          ? 'faculty'
          : previewMode === 'student-pending'
            ? 'unapproved student'
            : 'student'
      } mode`
    : undefined

  const headerAction = isAdminPreview ? (
    <button
      type="button"
      onClick={() => stopViewAsUser()}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 sm:px-3 sm:py-2 sm:text-sm dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200 dark:hover:bg-blue-950/50"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      <span className="hidden sm:inline">Return to Admin</span>
      <span className="sm:hidden">Exit Preview</span>
    </button>
  ) : undefined

  const topBanner =
    effectiveIsFaculty && effectiveUserRole !== 'admin' && !effectiveIsVerified ? (
      <div className="flex items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs font-medium text-amber-800 sm:text-sm dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
        <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
        <span>Your faculty account is pending verification by an administrator.</span>
      </div>
    ) : isStudentPendingApproval ? (
      <div className="flex items-center justify-center gap-2 border-b border-blue-200 bg-blue-50 px-4 py-2.5 text-center text-xs font-medium text-blue-800 sm:text-sm dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
        <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
        <span>
          Your student account is awaiting admin approval. Repository access stays available while the rest of the academic workspace is on hold.
        </span>
      </div>
    ) : undefined

  const pendingOverlay = isPendingAccessLocked ? (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[color:color-mix(in_srgb,var(--background)_84%,white_16%)]/95 p-4 backdrop-blur-sm sm:p-6">
      <div className="w-full max-w-2xl rounded-2xl border border-blue-200 bg-white p-5 text-center shadow-xl sm:rounded-[1.75rem] sm:p-8 dark:border-blue-900/40 dark:bg-gray-950">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 sm:h-14 sm:w-14 dark:bg-blue-900/30 dark:text-blue-300">
          <AlertCircle size={26} aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-xl font-black tracking-tight text-slate-950 sm:mt-5 sm:text-2xl dark:text-white">
          {isProofreaderPendingApproval
            ? 'Proofreader Verification Pending'
            : isFacultyPendingApproval
              ? 'Verification Pending'
              : 'Approval Pending'}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:leading-7 dark:text-slate-300">
          {isProofreaderPendingApproval
            ? 'Your Language Editor / Proofreader account is currently awaiting faculty verification. You can check your profile, settings, and the repository while you wait. Full manuscript annotation and review tools will unlock automatically once approved.'
            : isFacultyPendingApproval
              ? 'Your faculty account is still being reviewed by an administrator. You can check your profile, settings, notifications, and the repository while you wait. Full faculty tools will unlock automatically after approval.'
              : 'Your student account is still being reviewed by an administrator. You can explore the repository now, and the rest of the workspace will unlock automatically after approval.'}
        </p>
        <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link
            href="/dashboard/repository"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
          >
            Open Repository
          </Link>
          <Link
            href="/dashboard/profile"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            View Profile
          </Link>
        </div>
      </div>
    </div>
  ) : undefined

  return (
    <ResponsiveAppShell
      brandTitle="TrackAdemia"
      brandSubtitle={previewSubtitle}
      headerAction={headerAction}
      topBanner={topBanner}
      navItems={navItems}
      activeHref={visualRoute}
      pendingHref={pendingRoute}
      isNavigating={isNavigating}
      onNavigate={handleSidebarNavigation}
      accentColor="blue"
      maxBadgeCount={9}
      userName={effectiveUserName}
      userRoleLabel={roleLabel}
      profileHref="/dashboard/profile"
      isRefreshing={isRefreshing}
      onRefresh={handleRefresh}
      refreshAriaLabel="Refresh dashboard"
      isLoggingOut={isLoggingOut}
      showLogoutConfirm={showLogoutConfirm}
      onOpenLogoutConfirm={() => setShowLogoutConfirm(true)}
      onCloseLogoutConfirm={() => setShowLogoutConfirm(false)}
      onConfirmLogout={handleLogout}
      mainOverlay={pendingOverlay}
    >
      {children}
    </ResponsiveAppShell>
  )
}
