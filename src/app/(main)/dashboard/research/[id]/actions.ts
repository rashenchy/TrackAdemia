'use server'

import { createClient } from '@/lib/supabase/server'
import {
  getPublishedAtForStatusChange,
  researchHasPublishablePdf,
} from '@/lib/research/publication'
import { isManualResearchStatus } from '@/lib/research/status'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

  if (!isManualResearchStatus(status)) {
    throw new Error('Only final review decisions can be updated manually.')
  }

  if (status === 'Published') {
    const hasPublishablePdf = await researchHasPublishablePdf(supabase, researchId)

    if (!hasPublishablePdf) {
      throw new Error('A PDF manuscript is required before this research can be published.')
    }
  }

  const { data: currentResearch, error: currentResearchError } = await supabase
    .from('research')
    .select('status, published_at')
    .eq('id', researchId)
    .single()

  if (currentResearchError || !currentResearch) {
    throw new Error('Research record not found.')
  }

  // DATABASE UPDATE: Apply the new research status

  const { error } = await supabase
    .from('research')
    .update({
      status,
      published_at: getPublishedAtForStatusChange(
        currentResearch.status,
        status,
        currentResearch.published_at
      ),
    })
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
  }

  // CACHE REFRESH: Revalidate pages so the updated research status appears immediately

  revalidatePath(`/dashboard/research/${researchId}`)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/dashboard/student-submissions')
  revalidatePath('/dashboard/repository')

  redirect(`/dashboard/research/${researchId}?updated=${Date.now()}`)
}
