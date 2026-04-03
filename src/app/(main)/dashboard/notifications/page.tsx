import { redirect } from 'next/navigation'
import NotificationsList from '@/components/dashboard/NotificationsList'
import { createClient } from '@/lib/supabase/server'
import type { UserNotification } from '@/lib/notifications'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: notifications } = await supabase
    .from('user_notifications')
    .select('id, title, message, created_at, is_read, notification_type, reason')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-6xl">
      <NotificationsList notifications={(notifications || []) as UserNotification[]} />
    </div>
  )
}
