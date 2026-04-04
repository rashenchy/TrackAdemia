export const ALLOWED_COURSE_PROGRAMS = ['BSIT', 'BSBA', 'BSENTREP'] as const

export type AllowedCourseProgram = (typeof ALLOWED_COURSE_PROGRAMS)[number]

export function isAllowedCourseProgram(value: string): value is AllowedCourseProgram {
  return ALLOWED_COURSE_PROGRAMS.includes(value as AllowedCourseProgram)
}
