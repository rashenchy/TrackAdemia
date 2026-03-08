/* src/app/(main)/dashboard/layout.tsx */

'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'
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
  BookOpen
} from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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

  // Task & Resubmission badge counts
  const [unresolvedCount, setUnresolvedCount] = useState(0)
  const [resubmittedCount, setResubmittedCount] = useState(0)
  
  // Use a ref for the real-time closure
  const isTeacherRef = useRef(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 700)
  }

  useEffect(() => {
    setPendingRoute(null)
  }, [pathname])

  // Theme + role detection
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)

    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_verified')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'mentor') {
        setIsTeacher(true)
        isTeacherRef.current = true // Keep ref synced for websocket closures
        setIsVerified(profile?.is_verified || false)
      } else if (profile?.role === 'student') {
        setIsStudent(true)
        setIsVerified(true)
      }
    }

    checkUserRole()
  }, [supabase])

  // Fetch counts and subscribe to realtime updates
  useEffect(() => {
    const fetchCounts = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Task Counts
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

      const researchIds = research?.map(r => r.id) || []

      const { count: annotationCount } = await supabase
        .from('annotations')
        .select('*', { count: 'exact', head: true })
        .in('research_id', researchIds)
        .eq('is_resolved', false)

      setUnresolvedCount(
        (personalCount || 0) +
        (teacherCount || 0) +
        (annotationCount || 0)
      )

      // Resubmissions Count (Only for Teachers)
      if (isTeacherRef.current) {
        const { count: resubCount } = await supabase
          .from('research')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Resubmitted') // RLS ensures they only see their students' papers
        
        setResubmittedCount(resubCount || 0)
      }
    }

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }

    fetchCounts()

    const channel = supabase
      .channel('task-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tasks' },
        (payload: any) => {
          if (payload.new?.type === 'teacher') {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('New Assigned Task', {
                body: payload.new.title,
                icon: '/logo.png'
              })
            }
          }
          fetchCounts()
        }
      )
      // NEW: Listen for Resubmissions
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'research' },
        (payload: any) => {
          if (payload.new?.status === 'Resubmitted' && payload.old?.status !== 'Resubmitted') {
            if (isTeacherRef.current && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('Document Resubmitted', {
                body: `"${payload.new.title}" has been resubmitted for your review.`,
                icon: '/logo.png'
              })
            }
            fetchCounts()
            router.refresh() // Instantly updates the dashboard table
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'annotations' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_completions' }, fetchCounts)
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
      ? [{
        name: isTeacher ? 'Manage Sections' : 'My Sections',
        href: '/dashboard/sections',
        icon: GraduationCap
      }]
      : []),
    { name: 'Repository', href: '/dashboard/repository', icon: BookOpen },  
    { name: 'Settings', href: '/dashboard/settings', icon: Settings }
  ]

  return (
    <div className="flex h-screen transition-colors duration-300">
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} flex flex-col transition-all duration-300 border-r border-gray-200 dark:border-gray-800 bg-[var(--sidebar-bg)]`}>
        <div className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <div className="flex items-center ml-2 w-10 h-10 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white flex justify-center items-center">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-125" />
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
            
            // Badge calculation
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
                className={`flex items-center ${isCollapsed ? 'justify-center' : ''} p-3 rounded-lg transition-colors group relative ${isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-bold'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
              >
                <div className="relative">
                  <item.icon size={22} className={`min-w-[22px] ${isActive ? 'text-blue-600' : ''}`} />
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
            onClick={() => setShowLogoutConfirm(true)}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : ''} p-3 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors`}
          >
            <LogOut size={22} className="min-w-[22px]" />
            {!isCollapsed && <span className="ml-4 font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[var(--background)]">
        <header className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 bg-[var(--background)]">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">TrackAdemia</h1>
          <div className="flex items-center gap-4">
            <button onClick={handleRefresh} disabled={isRefreshing} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
              <RefreshCw size={20} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
            </button>
            <button onClick={toggleTheme} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <UserCircle size={28} className="text-gray-500 cursor-pointer" />
          </div>
        </header>

        {isTeacher && !isVerified && (
          <div className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 p-3 text-amber-800 dark:text-amber-400 text-sm font-medium">
            <AlertCircle size={16} />
            Your faculty account is pending verification by an administrator.
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-8 relative">
          {children}
        </main>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600">
                <LogOut size={24} />
              </div>
              <button onClick={() => setShowLogoutConfirm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Confirm Logout</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Are you sure you want to log out of your account?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold">
                Cancel
              </button>
              <button onClick={handleLogout} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}