import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SectionsPageUI from './SectionsPageUI'
import StudentSectionsUI from '@/components/dashboard/StudentSectionsUI'

export default async function SectionsPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const resolvedParams = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // ======================
  // TEACHER VIEW
  // ======================
  if (profile?.role === 'mentor') {

    // Fetch teacher's sections
    const { data: sections } = await supabase
      .from('sections')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })

    // Fetch analytics and roster for each section
    const sectionsWithAnalytics = await Promise.all((sections || []).map(async (sec) => {

      // Count active students
      const { count: studentCount } = await supabase
        .from('section_members')
        .select('*', { count: 'exact', head: true })
        .eq('section_id', sec.id)
        .eq('status', 'active')

      // Count uploaded research papers
      const { count: paperCount } = await supabase
        .from('research')
        .select('*', { count: 'exact', head: true })
        .eq('subject_code', sec.course_code)

      // Fetch section members
      const { data: members } = await supabase
        .from('section_members')
        .select('user_id, status, joined_at')
        .eq('section_id', sec.id)
        .order('joined_at', { ascending: false })

      // Collect member IDs
      const memberIds = members?.map(m => m.user_id) || []
      let studentProfiles: any[] = []

      // Fetch student profiles separately
      if (memberIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, course_program')
          .in('id', memberIds)

        studentProfiles = profiles || []
      }

      // Combine roster data with profiles
      const roster = (members || []).map(m => {
        const p = studentProfiles.find(profile => profile.id === m.user_id)

        return {
          user_id: m.user_id,
          status: m.status,
          joined_at: m.joined_at,
          name: p ? `${p.first_name} ${p.last_name}` : 'Unknown Student',
          course: p?.course_program || 'N/A'
        }
      })

      return {
        ...sec,
        roster,
        analytics: {
          totalStudents: studentCount || 0,
          papersUploaded: paperCount || 0,
          activeToday: Math.floor((studentCount || 0) * 0.6),
          annotationsMade: (paperCount || 0) * 3,
          notesCreated: Math.floor(Math.random() * 20)
        }
      }
    }))

    return (
      <SectionsPageUI
        success={resolvedParams.success}
        sections={sectionsWithAnalytics}
      />
    )
  }

  // ======================
  // STUDENT VIEW
  // ======================

  // Get student's section memberships
  const { data: memberships } = await supabase
    .from('section_members')
    .select('section_id')
    .eq('user_id', user.id)

  const sectionIds = memberships?.map(m => m.section_id) ?? []

  // If student is not enrolled in any sections
  if (sectionIds.length === 0) {
    return (
      <StudentSectionsUI
        sections={[]}
        classmates={[]}
        currentUserId={user.id}
      />
    )
  }

  console.log('DEBUG memberships:', memberships)
  console.log('DEBUG sectionIds:', sectionIds)

  // Fetch sections
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, course_code, teacher_id')
    .in('id', sectionIds)

  // Fetch teacher profiles
  const teacherIds = sections?.map(s => s.teacher_id) ?? []

  const { data: teachers } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', teacherIds)

  // Attach teacher profile to each section
  const sectionsWithTeacher = sections?.map(section => ({
    ...section,
    profiles: teachers?.find(t => t.id === section.teacher_id) ?? null
  })) ?? []

  // Fetch classmates (safe version without nested join)
  const { data: memberRows } = await supabase
    .from('section_members')
    .select('section_id, user_id')
    .in('section_id', sectionIds)

  const userIds = memberRows?.map(m => m.user_id) ?? []

  // Fetch student profiles
  const { data: studentProfiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, course_program')
    .in('id', userIds)

  // Combine classmates with profiles
  const classmates =
    memberRows?.map(m => ({
      section_id: m.section_id,
      profiles: studentProfiles?.find(p => p.id === m.user_id) ?? null
    })) ?? []

  return (
    <StudentSectionsUI
      sections={sectionsWithTeacher}
      classmates={classmates || []}
      currentUserId={user.id}
    />
  )
}