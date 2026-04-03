'use client'

// @refresh reset

import { useState, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { stopViewAsUser } from '@/app/(admin)/admin/view-as-user/actions'
import {
  ArrowLeft,
  Menu,
  Home,
  Settings,
  ChevronLeft,
  Sun,
  Moon,
  UserCircle,
  IdCard,
  FilePlus,
  GraduationCap,
  AlertCircle,
  LogOut,
  X,
  RefreshCw,
  Loader2,
  CheckSquare,
  BookOpen,
  Sparkles,
  ShieldAlert,
  Files,
  BellRing,
} from 'lucide-react'

export default function DashboardLayoutClient({
  children,
  previewMode = null,
  previewDisplayName = '',
  previewRole = '',
  previewIsVerified = false,
  isAdminPreview = false,
}: {
  children: React.ReactNode
  previewMode?: 'mentor' | 'student' | 'student-pending' | null
  previewDisplayName?: string
  previewRole?: string
  previewIsVerified?: boolean
  isAdminPreview?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }

    return localStorage.getItem('theme') || 'light'
  })
  const [isTeacher, setIsTeacher] = useState(previewRole === 'mentor')
  const [isVerified, setIsVerified] = useState(previewIsVerified)
  const [isStudent, setIsStudent] = useState(previewRole === 'student')
  const [pendingRoute, setPendingRoute] = useState<string | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [userName, setUserName] = useState(previewDisplayName)
  const [userRole, setUserRole] = useState(previewRole)
  const [unresolvedCount, setUnresolvedCount] = useState(0)
  const [notificationCount, setNotificationCount] = useState(0)
  const [submissionAlertCount, setSubmissionAlertCount] = useState(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isNavigating, startNavigation] = useTransition()
  const profileRef = useRef<HTMLDivElement | null>(null)
  const isTeacherRef = useRef(false)
  const [supabase] = useState(() => createClient())
  const effectiveUserName = isAdminPreview ? previewDisplayName : userName
  const effectiveUserRole = isAdminPreview ? previewRole : userRole
  const effectiveIsTeacher = isAdminPreview ? previewRole === 'mentor' : isTeacher
  const effectiveIsStudent = isAdminPreview ? previewRole === 'student' : isStudent
  const effectiveIsVerified = isAdminPreview ? previewIsVerified : isVerified
  const effectiveUnresolvedCount = isAdminPreview ? 0 : unresolvedCount
  const effectiveNotificationCount = isAdminPreview ? 0 : notificationCount
  const effectiveSubmissionAlertCount = isAdminPreview ? 0 : submissionAlertCount
  const studentAllowedPaths = [
    '/dashboard/repository',
    '/dashboard/profile',
    '/dashboard/settings',
    '/dashboard/notifications',
  ]
  const isStudentPendingApproval = effectiveIsStudent && !effectiveIsVerified
  const isStudentAccessLocked =
    isStudentPendingApproval &&
    !studentAllowedPaths.some(
      (allowedPath) => pathname === allowedPath || pathname.startsWith(`${allowedPath}/`)
    )

  const handleLogout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    setShowLogoutConfirm(true)
    setIsProfileOpen(false)

    try {
      await supabase.auth.signOut()
      window.location.replace('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 700)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)

    if (isAdminPreview) {
      isTeacherRef.current = previewRole === 'mentor'
      return
    }

    const checkUserRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

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

      if (profile?.role === 'mentor') {
        setIsTeacher(true)
        isTeacherRef.current = true
        setIsVerified(profile.is_verified || false)
      } else if (profile?.role === 'student') {
        setIsStudent(true)
        setIsVerified(profile.is_verified || false)
      }
    }

    checkUserRole()
  }, [isAdminPreview, previewRole, supabase, theme])

  useEffect(() => {
    if (isAdminPreview) return

    const fetchCounts = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { count: unreadNotificationTotal } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

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
        .select('id')
        .or(`user_id.eq.${user.id},members.cs.{${user.id}}`)

      const researchIds = research?.map((item) => item.id) || []

      const { count: annotationCount } = await supabase
        .from('annotations')
        .select('*', { count: 'exact', head: true })
        .in('research_id', researchIds)
        .eq('is_resolved', false)

      setUnresolvedCount((personalCount || 0) + (teacherCount || 0) + (annotationCount || 0))
      setNotificationCount(unreadNotificationTotal || 0)

      if (isTeacherRef.current) {
        const { data: teacherSections } = await supabase
          .from('sections')
          .select('id')
          .eq('teacher_id', user.id)

        const sectionIds = teacherSections?.map((section) => section.id) || []

        let sectionStudentIds: string[] = []

        if (sectionIds.length > 0) {
          const { data: members } = await supabase
            .from('section_members')
            .select('user_id')
            .in('section_id', sectionIds)

          sectionStudentIds = [...new Set((members || []).map((member) => member.user_id))]
        }

        const recentIds = new Set<string>()

        if (sectionStudentIds.length > 0) {
          const { data: sectionResearch } = await supabase
            .from('research')
            .select('id, status')
            .in('user_id', sectionStudentIds)

          for (const item of sectionResearch || []) {
            if (item.status === 'Resubmitted' || item.status === 'Pending Review') {
              recentIds.add(item.id)
            }
          }
        }

        const { data: advisoryResearch } = await supabase
          .from('research')
          .select('id, status')
          .eq('adviser_id', user.id)

        for (const item of advisoryResearch || []) {
          if (item.status === 'Resubmitted' || item.status === 'Pending Review') {
            recentIds.add(item.id)
          }
        }

        setSubmissionAlertCount(recentIds.size)
      }
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    fetchCounts()

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
              isTeacherRef.current &&
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
        { event: '*', schema: 'public', table: 'user_notifications' },
        fetchCounts
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdminPreview, supabase, router])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const handleSidebarNavigation = (href: string) => {
    if (pathname === href || isNavigating) return

    setPendingRoute(href)
    startNavigation(() => {
      router.push(href)
    })
  }

  const visualRoute = isNavigating && pendingRoute ? pendingRoute : pathname

  const navItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Submit Research', href: '/dashboard/submit', icon: FilePlus },
    { name: 'Task Manager', href: '/dashboard/tasks', icon: CheckSquare },
    ...((effectiveIsTeacher && effectiveIsVerified) || effectiveIsStudent
      ? [
          {
            name: effectiveIsTeacher ? 'Manage Sections' : 'My Sections',
            href: '/dashboard/sections',
            icon: GraduationCap,
          },
        ]
      : []),
    ...(effectiveIsTeacher
      ? [
          {
            name: 'Student Submissions',
            href: '/dashboard/student-submissions',
            icon: Files,
          },
        ]
      : []),
    { name: 'Notifications', href: '/dashboard/notifications', icon: BellRing },
    { name: 'Grammar Checker', href: '/dashboard/grammar', icon: Sparkles },
    { name: 'Plagiarism Checker', href: '/dashboard/plagiarism', icon: ShieldAlert },
    { name: 'Repository', href: '/dashboard/repository', icon: BookOpen },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  if (userRole === 'admin') {
    if (!isAdminPreview) {
      return <>{children}</>
    }
  }

  if (effectiveUserRole === 'admin' && !isAdminPreview) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen transition-colors duration-300">
      <aside
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
        className={`${isCollapsed ? 'w-20' : 'w-64'} flex h-screen flex-col overflow-hidden transition-all duration-300 border-r border-gray-200 dark:border-gray-800 bg-[var(--sidebar-bg)]`}
      >
        <div
          className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}
        >
          <div
            className={`overflow-hidden transition-all duration-300 ${
              isCollapsed ? 'w-0 opacity-0 -translate-x-3' : 'ml-2 w-10 opacity-100 translate-x-0'
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-full h-full object-cover scale-125"
              />
            </div>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors ${!isCollapsed ? 'ml-auto' : ''}`}
          >
            {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav
          className={`mt-4 flex-1 px-3 pb-4 space-y-2 ${
            isCollapsed ? 'overflow-y-hidden' : 'sidebar-scrollbar overflow-y-auto'
          }`}
        >
          {navItems.map((item) => {
            const isActive = visualRoute === item.href
            const isCurrentlyLoading = isNavigating && pendingRoute === item.href
            const isTaskBadge = item.name === 'Task Manager' && effectiveUnresolvedCount > 0
            const isSubmissionBadge =
              item.name === 'Student Submissions' && effectiveSubmissionAlertCount > 0
            const isNotificationBadge =
              item.name === 'Notifications' && effectiveNotificationCount > 0
            const hasBadge = isTaskBadge || isNotificationBadge || isSubmissionBadge
            const badgeValue =
              item.name === 'Notifications'
                ? effectiveNotificationCount
                : item.name === 'Student Submissions'
                  ? effectiveSubmissionAlertCount
                  : effectiveUnresolvedCount

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => handleSidebarNavigation(item.href)}
                className={`group relative flex items-center overflow-hidden p-3 transition-colors ${
                  isCollapsed ? 'justify-center' : 'w-full'
                } rounded-lg ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 font-bold'
                    : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                <div
                  className={`relative min-w-[22px] transition-transform duration-300 ${
                    isCollapsed ? 'translate-x-0' : 'translate-x-1'
                  }`}
                >
                  <item.icon
                    size={22}
                    className={`min-w-[22px] ${isActive ? 'text-blue-600' : ''}`}
                  />
                  {hasBadge && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-[var(--sidebar-bg)]">
                      {badgeValue > 9 ? '9+' : badgeValue}
                    </span>
                  )}
                </div>
                <div
                  className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                    isCollapsed ? 'ml-0 max-w-0 opacity-0 -translate-x-3' : 'ml-4 max-w-[11rem] opacity-100 translate-x-0'
                  }`}
                >
                  <span className="block font-medium">{item.name}</span>
                </div>
                {!isCollapsed && (
                  <span className="ml-auto flex h-4 w-4 items-center justify-center">
                    {isCurrentlyLoading && (
                      <Loader2 size={16} className="animate-spin text-blue-500" />
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => {
              if (!isLoggingOut) setShowLogoutConfirm(true)
            }}
            disabled={isLoggingOut}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : ''} p-3 rounded-lg text-red-600 transition-all ${
              isLoggingOut
                ? 'cursor-not-allowed opacity-60 bg-red-50 dark:bg-red-900/10'
                : 'hover:bg-red-50 dark:hover:bg-red-900/10'
            }`}
          >
            {isLoggingOut ? (
              <Loader2 size={22} className="min-w-[22px] animate-spin" />
            ) : (
              <LogOut size={22} className="min-w-[22px]" />
            )}
            <div
              className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                isCollapsed ? 'ml-0 max-w-0 opacity-0 -translate-x-3' : 'ml-4 max-w-[10rem] opacity-100 translate-x-0'
              }`}
            >
              <span className="block font-medium">
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </span>
            </div>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--background)]">
        <header className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 bg-[var(--background)]">
          <div className="flex items-center gap-3">
            {isAdminPreview && (
              <button
                onClick={() => stopViewAsUser()}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200 dark:hover:bg-blue-950/50"
              >
                <ArrowLeft size={16} />
                Return to Admin
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                TrackAdemia
              </h1>
              {isAdminPreview && (
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">
                  Previewing {previewMode === 'mentor' ? 'teacher' : previewMode === 'student-pending' ? 'unapproved student' : 'student'} mode
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"
            >
              <RefreshCw
                size={20}
                className={isRefreshing ? 'animate-spin text-blue-600' : ''}
              />
            </button>

            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <div ref={profileRef} className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center justify-center p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <UserCircle size={28} className="text-gray-500" />
              </button>

              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 z-50">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        {effectiveUserName || 'Loading...'}
                      </p>
                      <p className="text-xs text-gray-500 capitalize mt-0.5">
                        {effectiveUserRole === 'mentor'
                          ? 'Teacher / Adviser'
                          : effectiveUserRole || 'User'}
                      </p>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/dashboard/profile"
                        onClick={() => setIsProfileOpen(false)}
                        className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        <IdCard size={16} />
                        View Profile
                      </Link>
                      <button
                        onClick={() => {
                          if (isLoggingOut) return
                          setIsProfileOpen(false)
                          setShowLogoutConfirm(true)
                        }}
                        disabled={isLoggingOut}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left font-medium rounded-lg transition-all ${
                          isLoggingOut
                            ? 'cursor-not-allowed text-red-500 opacity-60 bg-red-50 dark:bg-red-900/10'
                            : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10'
                        }`}
                      >
                        {isLoggingOut ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <LogOut size={16} />
                        )}{' '}
                        {isLoggingOut ? 'Logging out...' : 'Logout'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {effectiveIsTeacher && !effectiveIsVerified && (
          <div className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 p-3 text-amber-800 dark:text-amber-400 text-sm font-medium">
            <AlertCircle size={16} />
            Your faculty account is pending verification by an administrator.
          </div>
        )}

        {isStudentPendingApproval && (
          <div className="flex items-center justify-center gap-2 border-b border-blue-200 bg-blue-50 p-3 text-center text-sm font-medium text-blue-800 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
            <AlertCircle size={16} />
            Your student account is awaiting admin approval. Repository access stays available while the rest of the academic workspace is on hold.
          </div>
        )}

        <main
          aria-busy={isNavigating}
          className={`relative flex-1 overflow-y-auto p-8 transition-opacity ${
            isNavigating ? 'opacity-70' : 'opacity-100'
          }`}
        >
          {isNavigating && (
            <div className="pointer-events-none absolute inset-x-8 top-4 z-10 h-1 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-950/40">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-blue-500" />
            </div>
          )}
          {children}

          {isStudentAccessLocked && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[color:color-mix(in_srgb,var(--background)_84%,white_16%)]/95 p-6 backdrop-blur-sm">
              <div className="w-full max-w-2xl rounded-[1.75rem] border border-blue-200 bg-white p-8 text-center shadow-xl dark:border-blue-900/40 dark:bg-gray-950">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  <AlertCircle size={28} />
                </div>
                <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                  Approval Pending
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Your student account is still being reviewed by an administrator. You can explore the repository now, and the rest of the workspace will unlock automatically after approval.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/dashboard/repository"
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                  >
                    Open Repository
                  </Link>
                  <Link
                    href="/dashboard/profile"
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div
            className={`bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-800 transition-all duration-200 ${
              isLoggingOut ? 'scale-[0.985] opacity-95' : 'scale-100 opacity-100'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`p-2 rounded-lg text-red-600 transition-all ${
                  isLoggingOut
                    ? 'bg-red-100 dark:bg-red-900/30 animate-pulse'
                    : 'bg-red-50 dark:bg-red-900/20'
                }`}
              >
                {isLoggingOut ? <Loader2 size={24} className="animate-spin" /> : <LogOut size={24} />}
              </div>
              <button
                onClick={() => {
                  if (!isLoggingOut) setShowLogoutConfirm(false)
                }}
                disabled={isLoggingOut}
                className={`rounded-full transition-colors ${
                  isLoggingOut
                    ? 'cursor-not-allowed text-gray-300 dark:text-gray-700'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:bg-gray-800'
                }`}
              >
                <X size={20} />
              </button>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {isLoggingOut ? 'Signing You Out' : 'Confirm Logout'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              {isLoggingOut
                ? 'Your logout request is being processed. You will be redirected shortly.'
                : 'Are you sure you want to log out of your account?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                disabled={isLoggingOut}
                className={`flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold transition-all ${
                  isLoggingOut ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all inline-flex items-center justify-center gap-2 ${
                  isLoggingOut
                    ? 'bg-red-500 opacity-85 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isLoggingOut && <Loader2 size={16} className="animate-spin" />}
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
