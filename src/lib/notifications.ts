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
