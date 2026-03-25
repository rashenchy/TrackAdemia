'use client'

// @refresh reset

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Menu,
  Shield,
  Users,
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
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [theme, setTheme] = useState('light')
  const [pendingRoute, setPendingRoute] = useState<string | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const profileRef = useRef<HTMLDivElement | null>(null)

  const [supabase] = useState(() => createClient())

  // Authentication and Session Handlers
  const handleLogout = async () => {
    if (isLoggingOut) return

    setIsLoggingOut(true)

    try {
      await supabase.auth.signOut()
      setShowLogoutConfirm(false)
      setIsProfileOpen(false)
      window.location.replace('/login')
    } finally {
      setIsLoggingOut(false)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 700)
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

  // Clear pending state on navigation
  useEffect(() => {
    setPendingRoute(null)
  }, [pathname])

  // Theme synchronization and user info
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)

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
    }
    checkUserRole()
  }, [supabase])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  // Admin navigation items
  const navItems = [
    { name: 'Overview', href: '/admin', icon: Shield },
    { name: 'View as User', href: '/admin/view-as-user', icon: Users },
    { name: 'Faculty Approval', href: '/admin/faculty-approval', icon: Users },
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Master Records', href: '/admin/master-records', icon: Database },
    { name: 'Reports', href: '/admin/reports', icon: BarChart },
    { name: 'Announcements', href: '/admin/announcements', icon: Megaphone },
    { name: 'API Monitoring', href: '/admin/api-monitoring', icon: Activity }
  ]

  return (
    <div className="flex h-screen transition-colors duration-300">
      
      {/* Sidebar navigation */}
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

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => {
                  if (pathname !== item.href) setPendingRoute(item.href)
                }}
                className={`flex items-center ${isCollapsed ? 'justify-center' : ''} p-3 rounded-lg transition-colors group relative ${isActive
                  ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 font-bold'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
              >
                <div className="relative">
                  <item.icon size={22} className={`min-w-[22px] ${isActive ? 'text-purple-600' : ''}`} />
                </div>
                {!isCollapsed && <span className="ml-4 font-medium">{item.name}</span>}
                {!isCollapsed && isCurrentlyLoading && (
                  <Loader2 size={16} className="absolute right-3 animate-spin text-purple-500" />
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
                          setIsProfileOpen(false)
                          setShowLogoutConfirm(true)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors text-left font-medium"
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          {children}
        </main>
      </div>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600">
                <LogOut size={24} />
              </div>
              <button onClick={() => setShowLogoutConfirm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:bg-gray-800 rounded-full">
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
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
