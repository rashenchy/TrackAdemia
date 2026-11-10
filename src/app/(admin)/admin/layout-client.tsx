'use client'

// @refresh reset

import { useState, useEffect, useTransition, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePopup } from '@/components/ui/PopupProvider'
import {
  ResponsiveAppShell,
  type AppShellNavItem,
} from '@/components/navigation/ResponsiveAppShell'
import {
  Shield,
  Users,
  UserCheck,
  BadgeCheck,
  Database,
  BarChart,
  Megaphone,
  Activity,
  SpellCheck,
  BookOpen,
  Eye,
} from 'lucide-react'

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const [pendingRoute, setPendingRoute] = useState<string | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [userName, setUserName] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isNavigating, startNavigation] = useTransition()
  const [pendingApprovalCounts, setPendingApprovalCounts] = useState({
    faculty: 0,
    students: 0,
    proofreaders: 0,
  })
  const { notify } = usePopup()
  const [supabase] = useState(() => createClient())

  const fetchPendingApprovalCounts = useCallback(async () => {
    const [facultyResult, studentResult, proofreaderResult] = await Promise.all([
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
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'proofreader')
        .eq('is_verified', false)
        .eq('is_active', true),
    ])

    setPendingApprovalCounts({
      faculty: facultyResult.count || 0,
      students: studentResult.count || 0,
      proofreaders: proofreaderResult.count || 0,
    })
  }, [supabase])

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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
    localStorage.setItem('theme', 'light')

    const checkUserRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
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
  }, [supabase, fetchPendingApprovalCounts])

  useEffect(() => {
    const refreshPendingCounts = () => {
      void fetchPendingApprovalCounts()
    }

    window.addEventListener('admin-pending-approvals-changed', refreshPendingCounts)

    return () => {
      window.removeEventListener('admin-pending-approvals-changed', refreshPendingCounts)
    }
  }, [fetchPendingApprovalCounts])

  const handleSidebarNavigation = (href: string) => {
    if (pathname === href || isNavigating) return

    setPendingRoute(href)
    void fetchPendingApprovalCounts()
    startNavigation(() => {
      router.push(href)
    })
  }

  const visualRoute = isNavigating && pendingRoute ? pendingRoute : pathname

  const navItems: AppShellNavItem[] = [
    { name: 'Overview', href: '/admin', icon: Shield },
    {
      name: 'Faculty Creation',
      href: '/admin/faculty-approval',
      icon: UserCheck,
    },
    {
      name: 'Student Verification',
      href: '/admin/student-verification',
      icon: BadgeCheck,
      badgeCount: pendingApprovalCounts.students,
    },
    {
      name: 'Proofreader Verification',
      href: '/admin/proofreader-verification',
      icon: SpellCheck,
      badgeCount: pendingApprovalCounts.proofreaders,
    },
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Master Records', href: '/admin/master-records', icon: Database },
    { name: 'Reports', href: '/admin/reports', icon: BarChart },
    { name: 'Announcements', href: '/admin/announcements', icon: Megaphone },
    { name: 'API Monitoring', href: '/admin/api-monitoring', icon: Activity },
    { name: 'Research Repository', href: '/dashboard/repository', icon: BookOpen },
    { name: 'View As User', href: '/admin/view-as-user', icon: Eye },
  ]

  return (
    <ResponsiveAppShell
      brandTitle="TrackAdemia - Admin"
      navItems={navItems}
      activeHref={visualRoute}
      pendingHref={pendingRoute}
      isNavigating={isNavigating}
      onNavigate={handleSidebarNavigation}
      accentColor="purple"
      maxBadgeCount={99}
      userName={userName}
      userRoleLabel="Administrator"
      isRefreshing={isRefreshing}
      onRefresh={handleRefresh}
      refreshAriaLabel="Refresh admin workspace"
      isLoggingOut={isLoggingOut}
      showLogoutConfirm={showLogoutConfirm}
      onOpenLogoutConfirm={() => setShowLogoutConfirm(true)}
      onCloseLogoutConfirm={() => setShowLogoutConfirm(false)}
      onConfirmLogout={handleLogout}
    >
      {children}
    </ResponsiveAppShell>
  )
}
