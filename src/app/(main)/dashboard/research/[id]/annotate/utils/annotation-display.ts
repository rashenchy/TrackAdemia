import { getResearchSectionLabel, isTextAnnotationPosition } from '@/lib/research/document'
import { type AnnotationRecord } from '../types'

export function summarizeQuote(text: string, maxLength = 120) {
  if (!text) return ''
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, maxLength)}...`
}

export function getAnnotationLocationLabel(annotation: AnnotationRecord) {
  if (isTextAnnotationPosition(annotation.position_data)) {
    return (
      annotation.position_data.sectionTitle ||
      getResearchSectionLabel(annotation.position_data.sectionKey)
    )
  }

  if (Array.isArray(annotation.position_data)) {
    const pageIndex =
      annotation.position_data[0] &&
      typeof annotation.position_data[0] === 'object' &&
      annotation.position_data[0] !== null &&
      'pageIndex' in annotation.position_data[0]
        ? Number((annotation.position_data[0] as { pageIndex?: number }).pageIndex)
        : 0

    return `Page ${pageIndex + 1}`
  }

  return 'Document'
}

export type AuthorRoleBadgeInfo = {
  label: string
  shortLabel: string
  badgeClass: string
  iconType: 'teacher' | 'critique' | 'admin' | 'student' | 'reviewer'
}

export function getAuthorRoleBadge(role?: string | null): AuthorRoleBadgeInfo {
  switch (role) {
    case 'mentor':
      return {
        label: 'Teacher / Adviser',
        shortLabel: 'Teacher',
        badgeClass:
          'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
        iconType: 'teacher',
      }
    case 'proofreader':
      return {
        label: 'English Critique / Proofreader',
        shortLabel: 'English Critique',
        badgeClass:
          'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
        iconType: 'critique',
      }
    case 'admin':
      return {
        label: 'Administrator',
        shortLabel: 'Admin',
        badgeClass:
          'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
        iconType: 'admin',
      }
    case 'student':
      return {
        label: 'Student Author',
        shortLabel: 'Student',
        badgeClass:
          'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
        iconType: 'student',
      }
    default:
      return {
        label: 'Reviewer',
        shortLabel: 'Reviewer',
        badgeClass:
          'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        iconType: 'reviewer',
      }
  }
}

export function getAuthorDisplayName(
  profiles?: { first_name?: string | null; last_name?: string | null } | null
) {
  if (!profiles) return 'Reviewer'
  const full = `${profiles.first_name || ''} ${profiles.last_name || ''}`.trim()
  return full || 'Reviewer'
}
