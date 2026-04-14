type PublishedResearchAccessRecord = {
  user_id: string
  adviser_id?: string | null
  subject_code?: string | null
}

export async function canTeacherEditPublishedResearch(
  supabase: { from: (table: string) => unknown },
  teacherId: string | null | undefined,
  research: PublishedResearchAccessRecord | null | undefined
) {
  if (!teacherId || !research) {
    return false
  }

  if (research.user_id === teacherId || research.adviser_id === teacherId) {
    return true
  }

  if (!research.subject_code) {
    return false
  }

  const sectionsQuery = supabase.from('sections') as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          maybeSingle: () => Promise<{ data: { teacher_id?: string | null } | null }>
        }
      }
    }
  }

  const { data: linkedSection } = await sectionsQuery
    .select('teacher_id')
    .eq('course_code', research.subject_code)
    .eq('teacher_id', teacherId)
    .maybeSingle()

  return linkedSection?.teacher_id === teacherId
}
