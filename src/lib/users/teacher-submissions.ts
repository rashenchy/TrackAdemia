import type { SupabaseClient } from '@supabase/supabase-js'

export type TeacherSubmissionSection = {
  id: string
  name: string
  course_code: string | null
}

export type TeacherSubmissionFilter = 'all' | 'advisory' | 'external'

export type TeacherSubmissionRecord = {
  id: string
  title: string
  type: string | null
  status: string
  created_at: string
  updated_at: string | null
  file_url: string | null
  user_id: string
  adviser_id: string | null
  subject_code: string | null
  unresolved_feedback_count: number
  section_id: string | null
  section_name: string
  author_name: string
  filter_group: TeacherSubmissionFilter
  is_recent: boolean
  recent_label: 'new' | 'updated' | null
  needs_attention: boolean
}

type ResearchRow = {
  id: string
  title: string
  type: string | null
  status: string
  created_at: string
  updated_at?: string | null
  file_url?: string | null
  user_id: string
  adviser_id?: string | null
  subject_code?: string | null
}

const RECENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 3
const ATTENTION_STATUSES = new Set(['Resubmitted', 'Pending Review'])

function getActivityDate(record: { updated_at?: string | null; created_at: string }) {
  return record.updated_at || record.created_at
}

function isRecentActivity(activityAt: string) {
  return Date.now() - new Date(activityAt).getTime() <= RECENT_WINDOW_MS
}

function getRecentLabel(record: { updated_at?: string | null; created_at: string }) {
  if (!isRecentActivity(getActivityDate(record))) {
    return null
  }

  if (!record.updated_at || record.updated_at === record.created_at) {
    return 'new'
  }

  return 'updated'
}

function needsTeacherAttention(status: string) {
  return ATTENTION_STATUSES.has(status)
}

export async function getTeacherSubmissionData(
  supabase: SupabaseClient,
  teacherId: string
): Promise<{
  sections: TeacherSubmissionSection[]
  submissions: TeacherSubmissionRecord[]
  recentCount: number
  attentionCount: number
}> {
  const { data: sectionsData } = await supabase
    .from('sections')
    .select('id, name, course_code')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })

  const sections: TeacherSubmissionSection[] = sectionsData || []
  const sectionIds = sections.map((section) => section.id)

  const { data: memberships } =
    sectionIds.length > 0
      ? await supabase
          .from('section_members')
          .select('section_id, user_id')
          .in('section_id', sectionIds)
      : { data: [] }

  const memberRows = memberships || []
  const sectionStudentIds = [...new Set(memberRows.map((member) => member.user_id))]

  const [sectionResearchRes, adviseeResearchRes, profileRowsRes] = await Promise.all([
    sectionStudentIds.length > 0
      ? supabase
          .from('research')
          .select('*')
          .in('user_id', sectionStudentIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from('research')
      .select('*')
      .eq('adviser_id', teacherId),
    sectionStudentIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('is_active', true)
          .in('id', sectionStudentIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileRows = profileRowsRes.data || []
  const studentProfiles = new Map(
    profileRows.map((profile) => [
      profile.id,
      `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Unknown Student',
    ])
  )

  const sectionResearch = (sectionResearchRes.data || []) as ResearchRow[]
  const adviseeResearch = (adviseeResearchRes.data || []) as ResearchRow[]
  const sectionLookup = new Map(sections.map((section) => [section.id, section]))

  const mappedSectionSubmissions: TeacherSubmissionRecord[] = sectionResearch
    .map((research) => {
      const studentMemberships = memberRows.filter((member) => member.user_id === research.user_id)

      const matchedSectionId =
        studentMemberships.find((member) => {
          const section = sectionLookup.get(member.section_id)
          return section?.course_code && section.course_code === research.subject_code
        })?.section_id || studentMemberships[0]?.section_id || null

      if (!matchedSectionId) {
        return null
      }

      const activityAt = getActivityDate(research)
      const recentLabel = getRecentLabel(research)

      return {
        ...research,
        updated_at: research.updated_at || null,
        file_url: research.file_url || null,
        adviser_id: research.adviser_id || null,
        subject_code: research.subject_code || null,
        unresolved_feedback_count: 0,
        section_id: matchedSectionId,
        section_name: sectionLookup.get(matchedSectionId)?.name || 'Assigned Section',
        author_name: studentProfiles.get(research.user_id) || 'Unknown Student',
        filter_group: 'advisory',
        is_recent: isRecentActivity(activityAt),
        recent_label: recentLabel,
        needs_attention: needsTeacherAttention(research.status),
      }
    })
    .filter((item): item is TeacherSubmissionRecord => Boolean(item))

  const missingAdviseeIds = adviseeResearch
    .map((item) => item.user_id)
    .filter((id) => !studentProfiles.has(id))

  if (missingAdviseeIds.length > 0) {
    const { data: extraProfiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('is_active', true)
      .in('id', [...new Set(missingAdviseeIds)])

    for (const profile of extraProfiles || []) {
      studentProfiles.set(
        profile.id,
        `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Unknown Student'
      )
    }
  }

  const sectionSubmissionIds = new Set(mappedSectionSubmissions.map((item) => item.id))
  const mappedAdviseeSubmissions: TeacherSubmissionRecord[] = adviseeResearch
    .filter((item) => !sectionSubmissionIds.has(item.id))
    .map((research) => {
      const activityAt = getActivityDate(research)
      const recentLabel = getRecentLabel(research)
      return {
        ...research,
        updated_at: research.updated_at || null,
        file_url: research.file_url || null,
        adviser_id: research.adviser_id || null,
        subject_code: research.subject_code || null,
        unresolved_feedback_count: 0,
        section_id: 'external-advisory',
        section_name: 'External Advisory',
        author_name: studentProfiles.get(research.user_id) || 'Unknown Student',
        filter_group: 'external',
        is_recent: isRecentActivity(activityAt),
        recent_label: recentLabel,
        needs_attention: needsTeacherAttention(research.status),
      }
    })

  const submissions = [...mappedSectionSubmissions, ...mappedAdviseeSubmissions].sort((a, b) => {
    const dateA = new Date(getActivityDate(a)).getTime()
    const dateB = new Date(getActivityDate(b)).getTime()
    return dateB - dateA
  })

  if (submissions.length > 0) {
    const { data: annotations } = await supabase
      .from('annotations')
      .select('research_id, is_resolved')
      .in(
        'research_id',
        submissions.map((submission) => submission.id)
      )

    const unresolvedByResearchId = new Map<string, number>()

    for (const annotation of annotations || []) {
      if (!annotation.is_resolved) {
        unresolvedByResearchId.set(
          annotation.research_id,
          (unresolvedByResearchId.get(annotation.research_id) || 0) + 1
        )
      }
    }

    for (const submission of submissions) {
      submission.unresolved_feedback_count = unresolvedByResearchId.get(submission.id) || 0
    }
  }

  return {
    sections,
    submissions,
    recentCount: submissions.filter((submission) => submission.is_recent).length,
    attentionCount: submissions.filter((submission) => submission.needs_attention).length,
  }
}
