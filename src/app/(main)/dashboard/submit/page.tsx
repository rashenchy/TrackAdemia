import { createClient } from '@/lib/supabase/server'
import { ResearchSubmissionForm } from '@/components/dashboard/ResearchSubmissionForm'
import { redirect } from 'next/navigation'

type DraftResearch = {
  id: string
  title?: string
  type?: string
  abstract?: string
  keywords?: string[] | string
  members?: string[]
  member_roles?: string[]
  subject_code?: string
  adviser_id?: string | null
  research_area?: string | null
  start_date?: string | null
  target_defense_date?: string | null
  current_stage?: string | null
  file_url?: string | null
  original_file_name?: string | null
  submission_format?: string | null
  content_json?: unknown
}

type SectionLookupRow = {
  name?: string
} | null

export default async function SubmitResearchPage() {

  // Initialize Supabase and verify authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch the sections the current user belongs to
  const { data: myMemberships } = await supabase
    .from('section_members')
    .select('section_id')
    .eq('user_id', user.id)

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role, course_program')
    .eq('id', user.id)
    .eq('is_active', true)
    .single()

  const isTeacher = currentProfile?.role === 'mentor'

  const sectionIds = myMemberships?.map(m => m.section_id) || []

  // Prepare containers for the user's sections and classmates
  let classmatesList: { id: string, name: string, sectionName: string }[] = []
  let userSections: { id: string, name: string, course_code: string }[] = []
  let adviserOptions: { id: string, name: string }[] = []
  let sectionAdvisers: Record<string, { id: string, name: string }> = {}
  let draftResearch: DraftResearch | null = null

  const { data: draftData } = await supabase
    .from('research')
    .select(
      'id, title, type, abstract, keywords, members, member_roles, subject_code, adviser_id, research_area, start_date, target_defense_date, current_stage, file_url'
      + ', original_file_name, submission_format, content_json'
    )
    .eq('user_id', user.id)
    .eq('status', 'Draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (draftData) {
    draftResearch = draftData as unknown as DraftResearch
  }

  // If the user belongs to any sections, fetch related data
  if (sectionIds.length > 0) {

    // Fetch section metadata for the dropdown
    const { data: sectionsData } = await supabase
      .from('sections')
      .select('id, name, course_code, teacher_id')
      .in('id', sectionIds)

    userSections = (sectionsData || []).map(({ id, name, course_code }) => ({
      id,
      name,
      course_code,
    }))

    // Fetch all members of those sections (including the current user)
    const { data: sectionMembers } = await supabase
      .from('section_members')
      .select('user_id, section_id, sections(name)')
      .in('section_id', sectionIds)

    // Extract unique user IDs from the membership list
    const classmateIds = [...new Set(sectionMembers?.map(m => m.user_id))]

    // Fetch profile data for those users
    if (classmateIds.length > 0) {

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .in('id', classmateIds as string[])

      // Build the classmates list combining membership and profile data
      classmatesList = (sectionMembers || []).map(m => {

        const profile = profiles?.find(p => p.id === m.user_id)

        const sectionData = m.sections as SectionLookupRow | SectionLookupRow[]
        const sectionName = Array.isArray(sectionData)
          ? sectionData[0]?.name
          : sectionData?.name

        // Mark the current user in the list
        const isMe = m.user_id === user.id

        return {
          id: m.user_id as string,
          name: profile
            ? `${profile.first_name} ${profile.last_name}${isMe ? ' (You)' : ''}`
            : 'Unknown Student',
          sectionName: sectionName || 'Unknown Section'
        }
      }).filter(c => c.name !== 'Unknown Student')

      // Remove duplicate classmates (students may share multiple sections)
      classmatesList = classmatesList.filter(
        (v, i, a) => a.findIndex(t => (t.id === v.id)) === i
      )
    }

    const sectionTeacherIds = [
      ...new Set((sectionsData || []).map((section) => section.teacher_id))
    ]

    let mentorQuery = supabase
      .from('profiles')
      .select('id, first_name, last_name, role, is_verified, course_program')
      .eq('role', 'mentor')
      .eq('is_verified', true)
      .eq('is_active', true)

    if (currentProfile?.course_program) {
      mentorQuery = mentorQuery.eq('course_program', currentProfile.course_program)
    }

    const { data: mentorProfiles } = await mentorQuery

    const mergedTeacherIds = [
      ...new Set([
        ...sectionTeacherIds,
        ...((mentorProfiles || []).map((mentor) => mentor.id)),
      ]),
    ]

    const teacherProfilesById = new Map(
      (mentorProfiles || []).map((mentor) => [
        mentor.id,
        `${mentor.first_name} ${mentor.last_name}`,
      ])
    )

    if (mergedTeacherIds.length > 0) {
      const missingTeacherIds = mergedTeacherIds.filter(
        (teacherId) => !teacherProfilesById.has(teacherId)
      )

      if (missingTeacherIds.length > 0) {
        const { data: extraTeacherProfiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('is_active', true)
          .in('id', missingTeacherIds)

        extraTeacherProfiles?.forEach((teacher) => {
          teacherProfilesById.set(teacher.id, `${teacher.first_name} ${teacher.last_name}`)
        })
      }

      adviserOptions = mergedTeacherIds
        .map((teacherId) => ({
          id: teacherId,
          name: teacherProfilesById.get(teacherId) || 'Unknown Adviser',
        }))
        .sort((first, second) => first.name.localeCompare(second.name))

      sectionAdvisers = (sectionsData || []).reduce<Record<string, { id: string, name: string }>>(
        (accumulator, section) => {
          if (!accumulator[section.course_code]) {
            accumulator[section.course_code] = {
              id: section.teacher_id,
              name: teacherProfilesById.get(section.teacher_id) || 'Unknown Adviser',
            }
          }

          return accumulator
        },
        {}
      )
    }
  }

  // Render the research submission page
  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Submit Research</h1>
        <p className="text-gray-500 mt-1">
          Provide your capstone or thesis details to start tracking.
        </p>
      </div>

      <ResearchSubmissionForm
        isTeacher={isTeacher}
        classmates={classmatesList}
        sections={userSections}
        adviserOptions={adviserOptions}
        sectionAdvisers={sectionAdvisers}
        initialData={draftResearch}
        editId={draftResearch?.id ?? null}
      />
    </div>
  )
}
