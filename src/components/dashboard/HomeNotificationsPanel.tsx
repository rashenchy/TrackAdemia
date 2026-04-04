'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { BellRing, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  formatNotificationTimestamp,
  getNotificationPreview,
  getNotificationRoute,
  getNotificationTypeLabel,
  type UserNotification,
} from '@/lib/notifications'

const STORAGE_KEY = 'dashboard:notifications:collapsed'

export default function HomeNotificationsPanel({
  initialNotifications,
}: {
  initialNotifications: UserNotification[]
}) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    setIsCollapsed(window.localStorage.getItem(STORAGE_KEY) === 'true')
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(isCollapsed))
  }, [isCollapsed])

  useEffect(() => {
    const supabase = createClient()

    async function refreshNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return
      }

      const { data } = await supabase
        .from('user_notifications')
        .select('id, title, message, created_at, is_read, notification_type, reason, reference_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      setNotifications((data || []) as UserNotification[])
    }

    const channel = supabase
      .channel('dashboard-home-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_notifications' },
        refreshNotifications
      )
      .subscribe()

    refreshNotifications()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  )

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <BellRing size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-950">Notifications</h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Latest system activity for your account, kept in sync with your notifications center.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/notifications"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-white"
          >
            View All
          </Link>
          <button
            type="button"
            onClick={() => setIsCollapsed((current) => !current)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            {isCollapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="border-t border-slate-200 px-6 py-4">
          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const route = getNotificationRoute(notification)
                return (
                  <div
                    key={notification.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-950">
                            {notification.title}
                          </p>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                            {getNotificationTypeLabel(notification.notification_type)}
                          </span>
                          {!notification.is_read && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                              Unread
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          {getNotificationPreview(notification.message, 160)}
                        </p>
                      </div>

                      <div className="text-right text-xs font-medium text-slate-500">
                        <div>{formatNotificationTimestamp(notification.created_at)}</div>
                        {route && (
                          <Link
                            href={route}
                            className="mt-2 inline-flex text-xs font-semibold text-blue-700 hover:text-blue-800"
                          >
                            Open
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-sm text-slate-600">
              No notifications yet. Updates from tasks, reviews, sections, and system events will appear here.
            </div>
          )}
        </div>
      )}
    </section>
  )
}
