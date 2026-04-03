'use client'

import { useEffect, useMemo, useState } from 'react'
import { BellRing, ChevronDown, ChevronUp, PanelTopClose, UserMinus } from 'lucide-react'
import { formatNotificationTimestamp, type UserNotification } from '@/lib/notifications'

const STORAGE_KEY = 'dashboard:section-removal-alerts:collapsed'

export default function HomeSectionRemovalAlerts({
  notifications,
}: {
  notifications: UserNotification[]
}) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  })

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(isCollapsed))
  }, [isCollapsed])

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  )

  if (notifications.length === 0) {
    return null
  }

  return (
    <section className="rounded-[1.75rem] border border-red-200 bg-red-50/80 shadow-sm dark:border-red-900/60 dark:bg-red-950/30">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm dark:bg-black/20 dark:text-red-200">
            <BellRing size={18} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-red-700 dark:text-red-200">
                Section Alerts
              </p>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-700 dark:bg-red-900/60 dark:text-red-200">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-sm leading-6 text-red-800/80 dark:text-red-100/80">
              Recent section removal notices stay here for 72 hours, then move to your notification
              history only.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((current) => !current)}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/50 dark:bg-black/20 dark:text-red-100 dark:hover:bg-red-950/40"
        >
          {isCollapsed ? <ChevronDown size={16} /> : <PanelTopClose size={16} />}
          {isCollapsed ? 'Show Alerts' : 'Collapse'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="border-t border-red-200/70 px-5 py-3 dark:border-red-900/50">
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-3 rounded-2xl border border-red-200/80 bg-white/80 px-4 py-3 text-sm text-red-900 shadow-sm dark:border-red-900/50 dark:bg-black/15 dark:text-red-50"
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200">
                  <UserMinus size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{notification.title}</p>
                    {!notification.is_read && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-700 dark:bg-red-900/40 dark:text-red-200">
                        New
                      </span>
                    )}
                  </div>
                  <p className="mt-1 leading-6 text-red-900/80 dark:text-red-50/85">
                    {notification.message}
                  </p>
                </div>

                <div className="shrink-0 text-right text-xs font-medium text-red-700/80 dark:text-red-200/80">
                  {formatNotificationTimestamp(notification.created_at)}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-red-700 transition-colors hover:text-red-800 dark:text-red-200 dark:hover:text-red-100"
          >
            <ChevronUp size={16} />
            Hide for now
          </button>
        </div>
      )}
    </section>
  )
}
