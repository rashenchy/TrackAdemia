export const ADMIN_VIEW_MODES = ['mentor', 'student', 'student-pending'] as const

export type AdminViewMode = (typeof ADMIN_VIEW_MODES)[number]

export const ADMIN_VIEW_COOKIE = 'trackademia_admin_view_mode'

export function isAdminViewMode(value: string | undefined | null): value is AdminViewMode {
  return ADMIN_VIEW_MODES.includes(value as AdminViewMode)
}

export function getAdminViewMeta(mode: AdminViewMode) {
  switch (mode) {
    case 'mentor':
      return {
        role: 'mentor',
        roleLabel: 'Teacher / Adviser',
        displayName: 'Teacher Preview',
        isVerified: true,
      }
    case 'student-pending':
      return {
        role: 'student',
        roleLabel: 'Student',
        displayName: 'Pending Student Preview',
        isVerified: false,
      }
    case 'student':
    default:
      return {
        role: 'student',
        roleLabel: 'Student',
        displayName: 'Student Preview',
        isVerified: true,
      }
  }
}
