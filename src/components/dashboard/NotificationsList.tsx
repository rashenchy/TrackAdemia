import { CheckCheck, Circle } from 'lucide-react'
import { markAllNotificationsAsRead, markNotificationAsRead } from '@/app/(main)/dashboard/notifications/actions'
import {
  formatNotificationTimestamp,
  getNotificationTypeLabel,
  type UserNotification,
} from '@/lib/notifications'

export default function NotificationsList({
  notifications,
}: {
  notifications: UserNotification[]
}) {
  const unreadCount = notifications.filter((notification) => !notification.is_read).length

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">Notifications</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Full notification history for your account, sorted from newest to oldest.
          </p>
        </div>

        {unreadCount > 0 && (
          <form action={markAllNotificationsAsRead}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
            >
              <CheckCheck size={16} />
              Mark All Read
            </button>
          </form>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_170px_120px_110px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                <span>Title</span>
                <span>Message</span>
                <span>Timestamp</span>
                <span>Status</span>
                <span className="text-right">Action</span>
              </div>

              <div className="divide-y divide-slate-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_170px_120px_110px] gap-4 px-4 py-4 text-sm text-slate-700"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">{notification.title}</p>
                      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                        {getNotificationTypeLabel(notification.notification_type)}
                      </p>
                    </div>

                    <p className="leading-6 text-slate-600">{notification.message}</p>

                    <div className="text-xs font-medium leading-5 text-slate-500">
                      {formatNotificationTimestamp(notification.created_at)}
                    </div>

                    <div>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
                          notification.is_read
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        <Circle size={8} className="fill-current" />
                        {notification.is_read ? 'Read' : 'Unread'}
                      </span>
                    </div>

                    <div className="text-right">
                      {notification.is_read ? (
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Read
                        </span>
                      ) : (
                        <form action={markNotificationAsRead.bind(null, notification.id)}>
                          <button
                            type="submit"
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                          >
                            Mark Read
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-sm text-slate-600">
          No notifications yet. When activity reaches your account, it will appear here.
        </div>
      )}
    </section>
  )
}
