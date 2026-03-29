import { createClient } from '@/lib/supabase/server'
import { ResearchSubmissionForm } from '@/components/dashboard/ResearchSubmissionForm'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditResearchPage({ params }: { params: Promise<{ id: string }> }) {
  
  // INITIALIZATION

  const resolvedParams = await params
  const researchId = resolvedParams.id
  const supabase = await createClient()

  // AUTHENTICATION

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // DATA FETCHING: RESEARCH

  const { data: research } = await supabase
    .from('research')
    .select('*')
    .eq('id', researchId)
    .single()

  if (!research) redirect('/dashboard')

  // DATA FETCHING: SECTIONS & CLASSMATES

  const { data: myMemberships } = await supabase
    .from('section_members')
    .select('section_id')
    .eq('user_id', user.id)

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('course_program')
    .eq('id', user.id)
    .single()
  
  const sectionIds = myMemberships?.map(m => m.section_id) || []

  let classmatesList: { id: string, name: string, sectionName: string }[] = []
  let userSections: { id: string, name: string, course_code: string }[] = []
  let adviserOptions: { id: string, name: string }[] = []
  let sectionAdvisers: Record<string, { id: string, name: string }> = {}

  if (sectionIds.length > 0) {
    // Fetch section metadata
    const { data: sectionsData } = await supabase
      .from('sections')
      .select('id, name, course_code, teacher_id')
      .in('id', sectionIds)
      
    userSections = (sectionsData || []).map(({ id, name, course_code }) => ({
      id,
      name,
      course_code,
    }))

    // Fetch all members in those sections
    const { data: sectionMembers } = await supabase
      .from('section_members')
      .select('user_id, section_id, sections(name)')
      .in('section_id', sectionIds)

    const classmateIds = [...new Set(sectionMembers?.map(m => m.user_id))]

    // Map profiles to classmates list
    if (classmateIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', classmateIds as string[])

      classmatesList = (sectionMembers || []).map(m => {
        const profile = profiles?.find(p => p.id === m.user_id)
        const sectionData = m.sections as any
        const sectionName = Array.isArray(sectionData) ? sectionData[0]?.name : sectionData?.name
        
        // Flag current user
        const isMe = m.user_id === user.id

        return {
          id: m.user_id as string,
          name: profile ? `${profile.first_name} ${profile.last_name}${isMe ? ' (You)' : ''}` : 'Unknown Student',
          sectionName: sectionName || 'Unknown Section'
        }
      }).filter(c => c.name !== 'Unknown Student')
      
      // Deduplicate entries
      classmatesList = classmatesList.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i)
    }

    const sectionTeacherIds = [
      ...new Set((sectionsData || []).map((section) => section.teacher_id))
    ]

    let mentorQuery = supabase
      .from('profiles')
      .select('id, first_name, last_name, role, is_verified, course_program')
      .eq('role', 'mentor')
      .eq('is_verified', true)

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

  // RENDER

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/dashboard`} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Research</h1>
          <p className="text-gray-500 mt-1">Update your capstone or thesis details.</p>
        </div>
      </div>
      
      <ResearchSubmissionForm 
        classmates={classmatesList} 
        sections={userSections} 
        adviserOptions={adviserOptions}
        sectionAdvisers={sectionAdvisers}
        initialData={research}
        editId={researchId}
      />
    </div>
  )
}
