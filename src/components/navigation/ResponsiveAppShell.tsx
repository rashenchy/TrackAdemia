'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  ChevronLeft,
  IdCard,
  Loader2,
  LogOut,
  Menu,
  RefreshCw,
  UserCircle,
  X,
} from 'lucide-react'

export type AppShellNavItem = {
  name: string
  href: string
  icon: LucideIcon
  badgeCount?: number
}

type ResponsiveAppShellProps = {
  brandTitle: string
  brandSubtitle?: string
  headerAction?: ReactNode
  topBanner?: ReactNode
  navItems: AppShellNavItem[]
  activeHref: string
  pendingHref: string | null
  isNavigating: boolean
  onNavigate: (href: string) => void
  accentColor?: 'blue' | 'purple'
  maxBadgeCount?: number
  userName: string
  userRoleLabel: string
  profileHref?: string
  isRefreshing: boolean
  onRefresh: () => void
  refreshAriaLabel?: string
  isLoggingOut: boolean
  showLogoutConfirm: boolean
  onOpenLogoutConfirm: () => void
  onCloseLogoutConfirm: () => void
  onConfirmLogout: () => void
  mainOverlay?: ReactNode
  children: ReactNode
}

export function ResponsiveAppShell({
  brandTitle,
  brandSubtitle,
  headerAction,
  topBanner,
  navItems,
  activeHref,
  pendingHref,
  isNavigating,
  onNavigate,
  accentColor = 'blue',
  maxBadgeCount = 9,
  userName,
  userRoleLabel,
  profileHref,
  isRefreshing,
  onRefresh,
  refreshAriaLabel = 'Refresh workspace',
  isLoggingOut,
  showLogoutConfirm,
  onOpenLogoutConfirm,
  onCloseLogoutConfirm,
  onConfirmLogout,
  mainOverlay,
  children,
}: ResponsiveAppShellProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement | null>(null)
  const menuButtonRef = useRef<HTMLButtonElement | null>(null)
  const drawerCloseRef = useRef<HTMLButtonElement | null>(null)
  const wasMobileOpenRef = useRef(false)

  // Close mobile drawer when navigation completes
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Close profile dropdown on outside pointer click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Manage Escape dismissal and focus handoff for the mobile drawer
  useEffect(() => {
    if (isMobileOpen) {
      wasMobileOpenRef.current = true
      const timer = window.setTimeout(() => {
        drawerCloseRef.current?.focus()
      }, 20)

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsMobileOpen(false)
        }
      }
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        window.clearTimeout(timer)
        document.removeEventListener('keydown', handleKeyDown)
      }
    }

    if (wasMobileOpenRef.current) {
      wasMobileOpenRef.current = false
      menuButtonRef.current?.focus()
    }
  }, [isMobileOpen])

  const isDesktopViewport = () =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches

  const activeNavClasses =
    accentColor === 'purple'
      ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 font-bold'
      : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 font-bold'

  const activeIconClass = accentColor === 'purple' ? 'text-purple-600' : 'text-blue-600'
  const spinnerColorClass = accentColor === 'purple' ? 'text-purple-500' : 'text-blue-500'
  const progressBarTrackClass =
    accentColor === 'purple'
      ? 'bg-purple-100 dark:bg-purple-950/40'
      : 'bg-blue-100 dark:bg-blue-950/40'
  const progressBarFillClass = accentColor === 'purple' ? 'bg-purple-500' : 'bg-blue-500'

  const handleNavClick = (href: string) => {
    setIsMobileOpen(false)
    onNavigate(href)
  }

  // On mobile drawer open, labels should always be visible regardless of desktop collapse state
  const showExpandedLabels = isMobileOpen || !isCollapsed

  return (
    <div className="relative flex h-dvh w-full overflow-hidden transition-colors duration-300">
      {/* Mobile drawer backdrop */}
      {isMobileOpen && (
        <div
          aria-hidden="true"
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* Sidebar (mobile slide-over drawer below lg; collapsible rail at lg+) */}
      <aside
        id="app-sidebar-nav"
        aria-label="Primary navigation"
        aria-modal={isMobileOpen ? true : undefined}
        role={isMobileOpen ? 'dialog' : undefined}
        onMouseEnter={() => {
          if (isDesktopViewport()) setIsCollapsed(false)
        }}
        onMouseLeave={() => {
          if (isDesktopViewport()) setIsCollapsed(true)
        }}
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[82dvw] flex-col overflow-hidden border-r border-gray-200 bg-[var(--sidebar-bg)] shadow-xl transition-all duration-300 dark:border-gray-800 lg:static lg:z-auto lg:max-w-none lg:shadow-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <div
          className={`flex items-center p-4 ${
            showExpandedLabels ? 'justify-between' : 'lg:justify-center'
          }`}
        >
          <div
            className={`overflow-hidden transition-all duration-300 ${
              showExpandedLabels
                ? 'ml-1 flex items-center gap-3 opacity-100 translate-x-0'
                : 'lg:w-0 lg:opacity-0 lg:-translate-x-3'
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700">
              <img
                src="/logo.png"
                alt="TrackAdemia logo"
                className="h-full w-full scale-125 object-cover"
              />
            </div>
            <span className="text-base font-bold tracking-tight text-gray-900 dark:text-gray-100 lg:hidden">
              TrackAdemia
            </span>
          </div>

          {/* Mobile close button */}
          <button
            ref={drawerCloseRef}
            type="button"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close navigation menu"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 lg:hidden"
          >
            <X size={20} aria-hidden="true" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`hidden min-h-10 min-w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-200 dark:hover:bg-gray-700 lg:inline-flex ${
              !isCollapsed ? 'ml-auto' : ''
            }`}
          >
            {isCollapsed ? <Menu size={20} aria-hidden="true" /> : <ChevronLeft size={20} aria-hidden="true" />}
          </button>
        </div>

        <nav
          className={`mt-2 flex-1 space-y-1.5 px-3 pb-4 ${
            showExpandedLabels ? 'sidebar-scrollbar overflow-y-auto' : 'lg:overflow-y-hidden'
          }`}
        >
          {navItems.map((item) => {
            const isActive = activeHref === item.href
            const isCurrentlyLoading = isNavigating && pendingHref === item.href
            const badgeCount = item.badgeCount || 0
            const hasBadge = badgeCount > 0

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => handleNavClick(item.href)}
                className={`group relative flex min-h-11 items-center overflow-hidden rounded-lg p-3 transition-colors ${
                  showExpandedLabels ? 'w-full' : 'w-full lg:justify-center'
                } ${
                  isActive
                    ? activeNavClasses
                    : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                <div
                  className={`relative min-w-[22px] transition-transform duration-300 ${
                    showExpandedLabels ? 'translate-x-1' : 'translate-x-0'
                  }`}
                >
                  <item.icon
                    size={22}
                    aria-hidden="true"
                    className={`min-w-[22px] ${isActive ? activeIconClass : ''}`}
                  />
                  {hasBadge && (
                    <span className="absolute -right-1.5 -top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full border-2 border-[var(--sidebar-bg)] bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                      {badgeCount > maxBadgeCount ? `${maxBadgeCount}+` : badgeCount}
                    </span>
                  )}
                </div>
                <div
                  className={`overflow-hidden whitespace-nowrap text-left transition-all duration-300 ${
                    showExpandedLabels
                      ? 'ml-4 max-w-[12rem] opacity-100 translate-x-0'
                      : 'lg:ml-0 lg:max-w-0 lg:opacity-0 lg:-translate-x-3'
                  }`}
                >
                  <span className="block text-sm font-medium">{item.name}</span>
                </div>
                {showExpandedLabels && (
                  <span className="ml-auto flex min-w-[1rem] items-center justify-end">
                    {isCurrentlyLoading && (
                      <Loader2 size={16} className={`animate-spin ${spinnerColorClass}`} />
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-gray-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] dark:border-gray-800">
          <button
            type="button"
            onClick={() => {
              if (!isLoggingOut) {
                setIsMobileOpen(false)
                onOpenLogoutConfirm()
              }
            }}
            disabled={isLoggingOut}
            className={`flex min-h-11 w-full items-center rounded-lg p-3 text-red-600 transition-all ${
              showExpandedLabels ? '' : 'lg:justify-center'
            } ${
              isLoggingOut
                ? 'cursor-not-allowed bg-red-50 opacity-60 dark:bg-red-900/10'
                : 'hover:bg-red-50 dark:hover:bg-red-900/10'
            }`}
          >
            {isLoggingOut ? (
              <Loader2 size={22} className="min-w-[22px] animate-spin" />
            ) : (
              <LogOut size={22} className="min-w-[22px]" aria-hidden="true" />
            )}
            <div
              className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                showExpandedLabels
                  ? 'ml-4 max-w-[10rem] opacity-100 translate-x-0'
                  : 'lg:ml-0 lg:max-w-0 lg:opacity-0 lg:-translate-x-3'
              }`}
            >
              <span className="block text-sm font-medium">
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </span>
            </div>
          </button>
        </div>
      </aside>

      {/* Main content shell */}
      <div
        inert={isMobileOpen || undefined}
        className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--background)]"
      >
        <header className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-[var(--background)] px-3 py-2 sm:px-6 dark:border-gray-800">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={isMobileOpen}
              aria-controls="app-sidebar-nav"
              className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 lg:hidden"
            >
              <Menu size={22} aria-hidden="true" />
            </button>

            {headerAction}

            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight text-gray-900 sm:text-xl dark:text-gray-100">
                {brandTitle}
              </h1>
              {brandSubtitle && (
                <p className="truncate text-[11px] font-medium uppercase tracking-[0.16em] text-blue-600 sm:text-xs sm:tracking-[0.2em] dark:text-blue-300">
                  {brandSubtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label={refreshAriaLabel}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <RefreshCw
                size={20}
                aria-hidden="true"
                className={isRefreshing ? `animate-spin ${activeIconClass}` : ''}
              />
            </button>

            <div ref={profileRef} className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-label="Open account menu"
                aria-expanded={isProfileOpen}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <UserCircle size={28} className="text-gray-500" aria-hidden="true" />
              </button>

              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-56 max-w-[calc(100dvw-1.5rem)] rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
                    <div className="border-b border-gray-100 p-4 dark:border-gray-800">
                      <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-100">
                        {userName || 'Loading...'}
                      </p>
                      <p className="mt-0.5 text-xs capitalize text-gray-500">{userRoleLabel}</p>
                    </div>
                    <div className="p-2">
                      {profileHref && (
                        <Link
                          href={profileHref}
                          onClick={() => setIsProfileOpen(false)}
                          className="mb-1 flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          <IdCard size={16} aria-hidden="true" />
                          View Profile
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (isLoggingOut) return
                          setIsProfileOpen(false)
                          onOpenLogoutConfirm()
                        }}
                        disabled={isLoggingOut}
                        className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
                          isLoggingOut
                            ? 'cursor-not-allowed bg-red-50 text-red-500 opacity-60 dark:bg-red-900/10'
                            : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10'
                        }`}
                      >
                        {isLoggingOut ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <LogOut size={16} aria-hidden="true" />
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

        {topBanner}

        <main
          aria-busy={isNavigating}
          className={`relative min-w-0 flex-1 overflow-y-auto p-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] transition-opacity sm:p-6 lg:p-8 ${
            isNavigating ? 'opacity-70' : 'opacity-100'
          }`}
        >
          {isNavigating && (
            <div
              className={`pointer-events-none absolute inset-x-4 top-3 z-10 h-1 overflow-hidden rounded-full sm:inset-x-6 lg:inset-x-8 ${progressBarTrackClass}`}
            >
              <div className={`h-full w-1/3 animate-pulse rounded-full ${progressBarFillClass}`} />
            </div>
          )}
          {children}
          {mainOverlay}
        </main>
      </div>

      {/* Logout confirmation modal */}
      {showLogoutConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <div
            className={`w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl transition-all duration-200 sm:p-6 dark:border-gray-800 dark:bg-gray-900 ${
              isLoggingOut ? 'scale-[0.985] opacity-95' : 'scale-100 opacity-100'
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div
                className={`rounded-lg p-2 text-red-600 transition-all ${
                  isLoggingOut
                    ? 'animate-pulse bg-red-100 dark:bg-red-900/30'
                    : 'bg-red-50 dark:bg-red-900/20'
                }`}
              >
                {isLoggingOut ? <Loader2 size={24} className="animate-spin" /> : <LogOut size={24} />}
              </div>
              <button
                type="button"
                aria-label="Close logout confirmation"
                onClick={() => {
                  if (!isLoggingOut) onCloseLogoutConfirm()
                }}
                disabled={isLoggingOut}
                className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-full transition-colors ${
                  isLoggingOut
                    ? 'cursor-not-allowed text-gray-300 dark:text-gray-700'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:bg-gray-800'
                }`}
              >
                <X size={20} />
              </button>
            </div>
            <h3
              id="logout-modal-title"
              className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100"
            >
              {isLoggingOut ? 'Signing You Out' : 'Confirm Logout'}
            </h3>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
              {isLoggingOut
                ? 'Your logout request is being processed. You will be redirected shortly.'
                : 'Are you sure you want to log out of your account?'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCloseLogoutConfirm}
                disabled={isLoggingOut}
                className={`min-h-11 flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold transition-all dark:border-gray-700 ${
                  isLoggingOut ? 'cursor-not-allowed opacity-50' : ''
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmLogout}
                disabled={isLoggingOut}
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all ${
                  isLoggingOut
                    ? 'cursor-not-allowed bg-red-500 opacity-85'
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

