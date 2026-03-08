import { createClient } from '@/lib/supabase/server'
import { ResearchSubmissionForm } from '@/components/dashboard/ResearchSubmissionForm'
import { redirect } from 'next/navigation'

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

  const sectionIds = myMemberships?.map(m => m.section_id) || []

  // Prepare containers for the user's sections and classmates
  let classmatesList: { id: string, name: string, sectionName: string }[] = []
  let userSections: { id: string, name: string, course_code: string }[] = []

  // If the user belongs to any sections, fetch related data
  if (sectionIds.length > 0) {

    // Fetch section metadata for the dropdown
    const { data: sectionsData } = await supabase
      .from('sections')
      .select('id, name, course_code')
      .in('id', sectionIds)

    userSections = sectionsData || []

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
        .in('id', classmateIds as string[])

      // Build the classmates list combining membership and profile data
      classmatesList = (sectionMembers || []).map(m => {

        const profile = profiles?.find(p => p.id === m.user_id)

        const sectionData = m.sections as any
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
        classmates={classmatesList}
        sections={userSections}
      />
    </div>
  )
}