export const HOME_SECTION_REMOVAL_WINDOW_HOURS = 72
export const HOME_SECTION_REMOVAL_WINDOW_MS = HOME_SECTION_REMOVAL_WINDOW_HOURS * 60 * 60 * 1000

export type UserNotification = {
  id: string
  title: string
  message: string
  created_at: string
  is_read: boolean
  notification_type: string
  reason?: string | null
  reference_id?: string | null
}

export function getHomeSectionRemovalCutoff(now: Date = new Date()) {
  return new Date(now.getTime() - HOME_SECTION_REMOVAL_WINDOW_MS).toISOString()
}

export function formatNotificationTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

export function getNotificationPreview(message: string, maxLength = 96) {
  if (message.length <= maxLength) {
    return message
  }

  return `${message.slice(0, maxLength - 1).trimEnd()}...`
}

export function getNotificationTypeLabel(notificationType: string) {
  return notificationType
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function getNotificationRoute(notification: UserNotification) {
  switch (notification.notification_type) {
    case 'task_assigned':
    case 'task_completed':
      return '/dashboard/tasks'
    case 'research_submission':
    case 'research_resubmitted':
    case 'research_version_uploaded':
    case 'revision_requested':
      return notification.reference_id
        ? `/dashboard/research/${notification.reference_id}`
        : '/dashboard'
    case 'annotation_added':
    case 'annotation_reply':
      return notification.reference_id
        ? `/dashboard/research/${notification.reference_id}/annotate`
        : '/dashboard'
    case 'section_joined':
    case 'section_removal':
    case 'join_request_approved':
    case 'join_request_rejected':
      return '/dashboard/sections'
    case 'account_verified':
    case 'account_rejected':
      return '/dashboard/settings'
    case 'announcement_created':
      return '/dashboard'
    default:
      return null
  }
}
