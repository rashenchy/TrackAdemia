'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return
  }

  const { error } = await supabase
    .from('user_notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) {
    return
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/notifications')

}

export async function markAllNotificationsAsRead() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return
  }

  const { error } = await supabase
    .from('user_notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) {
    return
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard/notifications')

}
