'use server'

import { createClient } from '@/lib/supabase/server'
import {
  getPublishedAtForStatusChange,
  researchHasPublishablePdf,
} from '@/lib/research/publication'
import { isManualResearchStatus } from '@/lib/research/status'
import {
  isResearchReviewer,
} from '@/lib/research/permissions'
import { revalidateResearchOverviewPaths } from '@/lib/research/cache'
import { redirect } from 'next/navigation'

export async function updateResearchStatus(researchId: string, formData: FormData) {
  const supabase = await createClient()

  // Run user auth and current research lookup in parallel
  const [{ data: { user } }, { data: currentResearch, error: currentResearchError }] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('research')
        .select('status, published_at, file_url')
        .eq('id', researchId)
        .single(),
    ])

  if (!user) throw new Error('Unauthorized')
  if (currentResearchError || !currentResearch) {
    throw new Error('Research record not found.')
  }

  // Verify the user is a mentor before permitting status updates
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!isResearchReviewer(profile?.role)) {
    throw new Error('Only reviewers can update research status.')
  }

  const status = formData.get('status') as string
  const fileUrl = formData.get('fileUrl') as string | null

  if (!isManualResearchStatus(status)) {
    throw new Error('Only final review decisions can be updated manually.')
  }

  if (status === 'Published') {
    const hasPublishablePdf =
      Boolean(currentResearch.file_url) ||
      (await researchHasPublishablePdf(supabase, researchId))

    if (!hasPublishablePdf) {
      throw new Error('A PDF manuscript is required before this research can be published.')
    }
  }

  // Apply the new research status
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

  // If a new document file was uploaded, create a new version entry
  if (fileUrl) {
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

    await supabase.from('research_versions').insert({
      research_id: researchId,
      uploaded_by: user.id,
      file_url: fileUrl,
      version_number: nextVersion
    })
  }

  // Revalidate paths so the updated research status appears immediately
  revalidateResearchOverviewPaths(researchId)
}

export async function reviewAccessRequestAction(input: {
  researchId: string
  requestId: string
  status: 'approved' | 'rejected'
  reviewerNotes?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized. Please log in.' }
  }

  const { reviewAccessRequest } = await import('@/lib/research/access-requests/service')
  const result = await reviewAccessRequest(
    {
      requestId: input.requestId,
      status: input.status,
      reviewerNotes: input.reviewerNotes,
    },
    user.id
  )

  if (result.success) {
    revalidateResearchOverviewPaths(input.researchId)
  }

  return result
}
