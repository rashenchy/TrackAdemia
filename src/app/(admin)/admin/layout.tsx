'use client'

// @refresh reset

import { useState, useEffect, useRef, useTransition, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePopup } from '@/components/ui/PopupProvider'
import {
  Menu,
  Shield,
  Users,
  Eye,
  UserCheck,
  BadgeCheck,
  Database,
  BarChart,
  LogOut,
  X,
  Sun,
  Moon,
  UserCircle,
  ChevronLeft,
  RefreshCw,
  Loader2,
  Megaphone,
  Activity
} from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  // State initialization
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }

    return localStorage.getItem('theme') || 'light'
  })
  const [pendingRoute, setPendingRoute] = useState<string | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isNavigating, startNavigation] = useTransition()
  const [pendingApprovalCounts, setPendingApprovalCounts] = useState({
    faculty: 0,
    students: 0,
  })
  const { notify } = usePopup()

  const profileRef = useRef<HTMLDivElement | null>(null)

  const [supabase] = useState(() => createClient())

  const fetchPendingApprovalCounts = useCallback(async () => {
    const [facultyResult, studentResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'mentor')
        .eq('is_verified', false)
        .eq('is_active', true),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student')
        .eq('is_verified', false)
        .eq('is_active', true),
    ])

    setPendingApprovalCounts({
      faculty: facultyResult.count || 0,
      students: studentResult.count || 0,
    })
  }, [supabase])

  // Authentication and Session Handlers
  const handleLogout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)
    setShowLogoutConfirm(true)
    setIsProfileOpen(false)

    try {
      await supabase.auth.signOut()
      setShowLogoutConfirm(false)
      setIsProfileOpen(false)
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
    void fetchPendingApprovalCounts()
    notify({
      title: 'Refreshing admin workspace',
      message: 'Loading the latest system data.',
      variant: 'info',
    })
    startNavigation(() => {
      router.refresh()
    })

    setTimeout(() => {
      setIsRefreshing(false)
      notify({
        title: 'Admin workspace refreshed',
        message: 'The latest admin data is now loaded.',
        variant: 'success',
      })
    }, 700)
  }

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Theme synchronization and user info
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)

    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUserName(
          `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Admin'
        )
      }

      await fetchPendingApprovalCounts()
    }
    checkUserRole()
  }, [supabase, theme, fetchPendingApprovalCounts])

  useEffect(() => {
    const refreshPendingCounts = () => {
      void fetchPendingApprovalCounts()
    }

    window.addEventListener('admin-pending-approvals-changed', refreshPendingCounts)

    return () => {
      window.removeEventListener('admin-pending-approvals-changed', refreshPendingCounts)
    }
  }, [fetchPendingApprovalCounts])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const handleSidebarNavigation = (href: string) => {
    if (pathname === href || isNavigating) return

    setPendingRoute(href)
    void fetchPendingApprovalCounts()
    startNavigation(() => {
      router.push(href)
    })
  }

  const visualRoute = isNavigating && pendingRoute ? pendingRoute : pathname

  // Admin navigation items
  const navItems = [
    { name: 'Overview', href: '/admin', icon: Shield },
    { name: 'View as User', href: '/admin/view-as-user', icon: Eye },
    {
      name: 'Faculty Approval',
      href: '/admin/faculty-approval',
      icon: UserCheck,
      badgeCount: pendingApprovalCounts.faculty,
    },
    {
      name: 'Student Verification',
      href: '/admin/student-verification',
      icon: BadgeCheck,
      badgeCount: pendingApprovalCounts.students,
    },
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Master Records', href: '/admin/master-records', icon: Database },
    { name: 'Reports', href: '/admin/reports', icon: BarChart },
    { name: 'Announcements', href: '/admin/announcements', icon: Megaphone },
    { name: 'API Monitoring', href: '/admin/api-monitoring', icon: Activity }
  ]

  return (
    <div className="flex h-screen transition-colors duration-300">
      
      {/* Sidebar navigation */}
      <aside
        onMouseEnter={() => setIsCollapsed(false)}
        onMouseLeave={() => setIsCollapsed(true)}
        className={`${isCollapsed ? 'w-20' : 'w-64'} flex h-screen flex-col overflow-hidden transition-all duration-300 border-r border-gray-200 dark:border-gray-800 bg-[var(--sidebar-bg)]`}
      >
        <div className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div
            className={`overflow-hidden transition-all duration-300 ${
              isCollapsed ? 'w-0 opacity-0 -translate-x-3' : 'ml-2 w-10 opacity-100 translate-x-0'
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-125" />
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
            const hasBadge = (item.badgeCount || 0) > 0

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => handleSidebarNavigation(item.href)}
                className={`group relative flex items-center overflow-hidden p-3 transition-colors ${
                  isCollapsed ? 'justify-center' : 'w-full'
                } rounded-lg ${
                  isActive
                    ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 font-bold'
                    : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                <div
                  className={`relative min-w-[22px] transition-transform duration-300 ${
                    isCollapsed ? 'translate-x-0' : 'translate-x-1'
                  }`}
                >
                  <item.icon size={22} className={`min-w-[22px] ${isActive ? 'text-purple-600' : ''}`} />
                  {hasBadge && (
                    <span className="absolute -top-1.5 -right-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full border-2 border-[var(--sidebar-bg)] bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                      {(item.badgeCount || 0) > 99 ? '99+' : item.badgeCount}
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
                  <span className="ml-auto flex min-w-[1rem] items-center justify-end">
                    {isCurrentlyLoading && (
                      <Loader2 size={16} className="animate-spin text-purple-500" />
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

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--background)]">
        <header className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 bg-[var(--background)]">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">TrackAdemia - Admin</h1>

          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"
            >
              <RefreshCw size={20} className={isRefreshing ? 'animate-spin text-purple-600' : ''} />
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
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{userName || 'Loading...'}</p>
                      <p className="text-xs text-gray-500 capitalize mt-0.5">Administrator</p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          if (isLoggingOut) return
                          setIsProfileOpen(false)
                          setShowLogoutConfirm(true)
                        }}
                        disabled={isLoggingOut}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-all text-left font-medium ${
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

        {/* Page content */}
        <main
          aria-busy={isNavigating}
          className={`relative flex-1 overflow-y-auto p-8 transition-opacity ${
            isNavigating ? 'opacity-70' : 'opacity-100'
          }`}
        >
          {isNavigating && (
            <div className="pointer-events-none absolute inset-x-8 top-4 z-10 h-1 overflow-hidden rounded-full bg-purple-100 dark:bg-purple-950/40">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-purple-500" />
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Logout confirmation modal */}
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
                className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 ${
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
