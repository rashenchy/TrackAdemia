import { redirect } from 'next/navigation'
import NotificationsList from '@/components/dashboard/NotificationsList'
import { createClient } from '@/lib/supabase/server'
import type { UserNotification } from '@/lib/notifications/types'
import PaginationLinks from '@/components/ui/PaginationLinks'

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const resolvedParams = await searchParams
  const rawPage = Number.parseInt(resolvedParams.page || '1', 10)
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
  const pageSize = 10
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: notifications, count } = await supabase
    .from('user_notifications')
    .select('id, title, message, created_at, is_read, notification_type, reason, reference_id', {
      count: 'exact',
    })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

  return (
    <div className="mx-auto max-w-6xl">
      <NotificationsList notifications={(notifications || []) as UserNotification[]} />
      <PaginationLinks
        pathname="/dashboard/notifications"
        searchParams={{ ...resolvedParams, page: String(page) }}
        totalCount={count || 0}
        pageSize={pageSize}
      />
    </div>
  )
}
