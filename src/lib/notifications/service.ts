'use server'

import { createAdminClient } from '@/lib/supabase/admin'

type SupabaseClientLike = any

export type AppNotificationType =
  | 'section_removal'
  | 'section_joined'
  | 'join_request_approved'
  | 'join_request_rejected'
  | 'task_assigned'
  | 'task_completed'
  | 'research_submission'
  | 'research_resubmitted'
  | 'research_version_uploaded'
  | 'revision_requested'
  | 'annotation_added'
  | 'annotation_reply'
  | 'account_verified'
  | 'account_rejected'
  | 'announcement_created'
  | 'research_access_request'
  | 'research_access_approved'
  | 'research_access_rejected'

type NotificationInsert = {
  user_id: string
  actor_id: string
  title: string
  message: string
  notification_type: AppNotificationType
  reason?: string | null
  reference_id?: string | null
  section_id?: string | null
  event_key?: string | null
}

function getWriteClient(supabase: SupabaseClientLike) {
  return createAdminClient() ?? supabase
}

export async function createNotifications(
  supabase: SupabaseClientLike,
  notifications: NotificationInsert[]
) {
  const normalizedNotifications = notifications
    .filter((notification) => notification.user_id && notification.actor_id)
    .map((notification) => ({
      ...notification,
      is_read: false,
      reason: notification.reason ?? null,
      reference_id: notification.reference_id ?? null,
      section_id: notification.section_id ?? null,
      event_key: notification.event_key ?? crypto.randomUUID(),
    }))

  if (normalizedNotifications.length === 0) {
    return
  }

  const writeClient = getWriteClient(supabase)
  const { error } = await writeClient
    .from('user_notifications')
    .insert(normalizedNotifications)

  if (error) {
    console.error('Failed to create notifications:', error)
  }
}

export async function createNotification(
  supabase: SupabaseClientLike,
  notification: NotificationInsert
) {
  await createNotifications(supabase, [notification])
}
