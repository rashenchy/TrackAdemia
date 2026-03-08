'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateResearchStatus(researchId: string, formData: FormData) {
  const supabase = await createClient()

  // AUTHENTICATION: Ensure a user is logged in before allowing any action

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // AUTHORIZATION: Verify the user is a mentor before permitting status updates

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'mentor') {
    throw new Error('Only mentors can update research status.')
  }

  // INPUT EXTRACTION: Retrieve status change and optional new file reference

  const status = formData.get('status') as string
  const fileUrl = formData.get('fileUrl') as string | null

  // DATABASE UPDATE: Apply the new research status

  const { error } = await supabase
    .from('research')
    .update({ status })
    .eq('id', researchId)

  if (error) {
    console.error('Error updating status:', error)
    throw new Error('Failed to update status')
  }

  // VERSION TRACKING: If a new document file was uploaded, create a new version entry

  if (fileUrl) {

    // Determine the next version number by checking the latest existing version

    const { data: existingVersions } = await supabase
      .from('research_versions')
      .select('version_number')
      .eq('research_id', researchId)
      .order('version_number', { ascending: false })
      .limit(1)

    const nextVersion =
      existingVersions && existingVersions.length > 0
        ? existingVersions[0].version_number + 1
        : 2

    // Insert a new version record linked to the uploaded file

    await supabase.from('research_versions').insert({
      research_id: researchId,
      uploaded_by: user.id,
      file_url: fileUrl,
      version_number: nextVersion
    })

    // ANNOTATION MANAGEMENT: Mark previous annotations as resolved after a new version upload

    await supabase
      .from('annotations')
      .update({ is_resolved: true })
      .eq('research_id', researchId)
      .eq('is_resolved', false)
  }

  // CACHE REFRESH: Revalidate pages so the updated research status appears immediately

  revalidatePath(`/dashboard/research/${researchId}`)
  revalidatePath('/dashboard')
}