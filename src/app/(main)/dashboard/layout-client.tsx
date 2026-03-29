'use client'

// @refresh reset

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Menu,
  Home,
  Settings,
  ChevronLeft,
  Sun,
  Moon,
  UserCircle,
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
} from 'lucide-react'

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [theme, setTheme] = useState('light')
  const [isTeacher, setIsTeacher] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [isStudent, setIsStudent] = useState(false)
  const [pendingRoute, setPendingRoute] = useState<string | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [unresolvedCount, setUnresolvedCount] = useState(0)
  const [resubmittedCount, setResubmittedCount] = useState(0)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const profileRef = useRef<HTMLDivElement | null>(null)
  const isTeacherRef = useRef(false)
  const [supabase] = useState(() => createClient())

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
    setPendingRoute(null)
  }, [pathname])

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)

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
        setIsVerified(true)
      }
    }

    checkUserRole()
  }, [supabase])

  useEffect(() => {
    const fetchCounts = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

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

      if (isTeacherRef.current) {
        const { count: resubCount } = await supabase
          .from('research')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Resubmitted')

        setResubmittedCount(resubCount || 0)
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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const navItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Submit Research', href: '/dashboard/submit', icon: FilePlus },
    { name: 'Task Manager', href: '/dashboard/tasks', icon: CheckSquare },
    ...((isTeacher && isVerified) || isStudent
      ? [
          {
            name: isTeacher ? 'Manage Sections' : 'My Sections',
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

  if (userRole === 'admin') {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen transition-colors duration-300">
      <aside
        className={`${isCollapsed ? 'w-20' : 'w-64'} flex flex-col transition-all duration-300 border-r border-gray-200 dark:border-gray-800 bg-[var(--sidebar-bg)]`}
      >
        <div
          className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}
        >
          {!isCollapsed && (
            <div className="flex items-center ml-2 w-10 h-10 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white flex justify-center items-center">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-full h-full object-cover scale-125"
              />
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors ${!isCollapsed ? 'ml-auto' : ''}`}
          >
            {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <nav className="flex-1 mt-4 px-3 space-y-2">
          {navItems.map((item) => {
            const isActive = (pendingRoute || pathname) === item.href
            const isCurrentlyLoading = pendingRoute === item.href
            const isTaskBadge = item.name === 'Task Manager' && unresolvedCount > 0
            const isHomeBadge = item.name === 'Home' && resubmittedCount > 0
            const hasBadge = isTaskBadge || isHomeBadge
            const badgeValue = item.name === 'Home' ? resubmittedCount : unresolvedCount

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => {
                  if (pathname !== item.href) setPendingRoute(item.href)
                }}
                className={`flex items-center ${isCollapsed ? 'justify-center' : ''} p-3 rounded-lg transition-colors group relative ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-bold' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'}`}
              >
                <div className="relative">
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
                {!isCollapsed && <span className="ml-4 font-medium">{item.name}</span>}
                {!isCollapsed && isCurrentlyLoading && (
                  <Loader2 size={16} className="absolute right-3 animate-spin text-blue-500" />
                )}
              </Link>
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
            {!isCollapsed && (
              <span className="ml-4 font-medium">
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </span>
            )}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--background)]">
        <header className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 bg-[var(--background)]">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            TrackAdemia
          </h1>

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
                        {userName || 'Loading...'}
                      </p>
                      <p className="text-xs text-gray-500 capitalize mt-0.5">
                        {userRole === 'mentor' ? 'Teacher / Adviser' : userRole || 'User'}
                      </p>
                    </div>
                    <div className="p-2">
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

        {isTeacher && !isVerified && (
          <div className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 p-3 text-amber-800 dark:text-amber-400 text-sm font-medium">
            <AlertCircle size={16} />
            Your faculty account is pending verification by an administrator.
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-8 relative">{children}</main>
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
