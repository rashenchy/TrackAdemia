import Link from 'next/link'
import { BellRing, ChevronRight } from 'lucide-react'
import {
  formatNotificationTimestamp,
  getNotificationPreview,
  type UserNotification,
} from '@/lib/notifications'

export default function SettingsNotificationsPreview({
  notifications,
}: {
  notifications: UserNotification[]
}) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Notifications</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Recent account activity and section updates from your latest 3 notifications.
          </p>
        </div>

        <Link
          href="/dashboard/notifications"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-white"
        >
          View All
          <ChevronRight size={16} />
        </Link>
      </div>

      {notifications.length > 0 ? (
        <div className="mt-5 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-start gap-3 bg-slate-50/70 px-4 py-3"
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <BellRing size={16} className="text-blue-600" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {notification.title}
                  </p>
                  {!notification.is_read && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                      Unread
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {getNotificationPreview(notification.message, 110)}
                </p>
              </div>

              <div className="shrink-0 text-right text-xs font-medium text-slate-500">
                {formatNotificationTimestamp(notification.created_at)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-600">
          No notifications yet. Updates will appear here before they roll into full history.
        </div>
      )}
    </div>
  )
}
