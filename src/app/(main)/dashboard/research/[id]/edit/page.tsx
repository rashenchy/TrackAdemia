import { createClient } from '@/lib/supabase/server'
import { ResearchSubmissionForm } from '@/components/dashboard/ResearchSubmissionForm'
import { BackButton } from '@/components/navigation/BackButton'
import { redirect } from 'next/navigation'

type DraftResearch = {
  id: string
  user_id: string
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
  status?: string
}

type SectionLookupRow = {
  name?: string
} | null

export default async function EditResearchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role, course_program')
    .eq('id', user.id)
    .eq('is_active', true)
    .single()

  const isTeacher = currentProfile?.role === 'mentor'

  const { data: research } = await supabase
    .from('research')
    .select(
      'id, user_id, title, type, abstract, keywords, members, member_roles, subject_code, adviser_id, research_area, start_date, target_defense_date, current_stage, file_url'
      + ', original_file_name, submission_format, content_json, status'
    )
    .eq('id', id)
    .single()

  if (!research) {
    redirect('/dashboard')
  }

  const isAuthor =
    research.user_id === user.id ||
    (Array.isArray(research.members) && research.members.includes(user.id))

  if (!isAuthor) {
    redirect(`/dashboard/research/${id}`)
  }

  const { data: myMemberships } = await supabase
    .from('section_members')
    .select('section_id')
    .eq('user_id', user.id)

  const sectionIds = myMemberships?.map((membership) => membership.section_id) || []

  let classmatesList: { id: string; name: string; sectionName: string }[] = []
  let userSections: { id: string; name: string; course_code: string }[] = []
  let adviserOptions: { id: string; name: string }[] = []
  let sectionAdvisers: Record<string, { id: string; name: string }> = {}

  if (sectionIds.length > 0) {
    const { data: sectionsData } = await supabase
      .from('sections')
      .select('id, name, course_code, teacher_id')
      .in('id', sectionIds)

    userSections = (sectionsData || []).map(({ id: sectionId, name, course_code }) => ({
      id: sectionId,
      name,
      course_code,
    }))

    const { data: sectionMembers } = await supabase
      .from('section_members')
      .select('user_id, section_id, sections(name)')
      .in('section_id', sectionIds)

    const classmateIds = [...new Set(sectionMembers?.map((member) => member.user_id))]

    if (classmateIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('is_active', true)
        .in('id', classmateIds as string[])

      classmatesList = (sectionMembers || [])
        .map((member) => {
          const profile = profiles?.find((candidate) => candidate.id === member.user_id)
          const sectionData = member.sections as SectionLookupRow | SectionLookupRow[]
          const sectionName = Array.isArray(sectionData)
            ? sectionData[0]?.name
            : sectionData?.name
          const isMe = member.user_id === user.id

          return {
            id: member.user_id as string,
            name: profile
              ? `${profile.first_name} ${profile.last_name}${isMe ? ' (You)' : ''}`
              : 'Unknown Student',
            sectionName: sectionName || 'Unknown Section',
          }
        })
        .filter((classmate) => classmate.name !== 'Unknown Student')

      classmatesList = classmatesList.filter(
        (value, index, array) => array.findIndex((item) => item.id === value.id) === index
      )
    }

    const sectionTeacherIds = [...new Set((sectionsData || []).map((section) => section.teacher_id))]

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

      sectionAdvisers = (sectionsData || []).reduce<Record<string, { id: string; name: string }>>(
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

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8 flex items-start gap-4">
        <BackButton fallbackHref="/dashboard" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Submission Details</h1>
          <p className="text-gray-500 mt-1">
            Update your research information before continuing with submission or workspace edits.
          </p>
        </div>
      </div>

      <ResearchSubmissionForm
        isTeacher={isTeacher}
        currentUserId={user.id}
        classmates={classmatesList}
        sections={userSections}
        adviserOptions={adviserOptions}
        sectionAdvisers={sectionAdvisers}
        initialData={research as DraftResearch}
        editId={research.id}
      />
    </div>
  )
}
