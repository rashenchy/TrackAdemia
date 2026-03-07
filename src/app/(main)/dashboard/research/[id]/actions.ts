'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateResearchStatus(researchId: string, formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify the user is actually a mentor before allowing the update
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'mentor') {
    throw new Error('Only mentors can update research status.')
  }

  const status = formData.get('status') as string
  const fileUrl = formData.get('fileUrl') as string | null

  // Update research status
  const { error } = await supabase
    .from('research')
    .update({ status })
    .eq('id', researchId)

  if (error) {
    console.error('Error updating status:', error)
    throw new Error('Failed to update status')
  }

  // NEW: Log the version history if a new file is uploaded
  if (fileUrl) {

    // 1. Find highest version
    const { data: existingVersions } = await supabase
      .from('research_versions')
      .select('version_number')
      .eq('research_id', researchId)
      .order('version_number', { ascending: false })
      .limit(1)

    // Determine next version
    const nextVersion =
      existingVersions && existingVersions.length > 0
        ? existingVersions[0].version_number + 1
        : 2

    // 2. Insert version record
    await supabase.from('research_versions').insert({
      research_id: researchId,
      uploaded_by: user.id,
      file_url: fileUrl,
      version_number: nextVersion
    })
  }

  // Refresh pages
  revalidatePath(`/dashboard/research/${researchId}`)
  revalidatePath('/dashboard')
}