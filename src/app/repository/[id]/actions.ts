'use server'

import { createClient } from '@/lib/supabase/server'

import { createAccessRequest } from '@/lib/research/access-requests/service'
import { revalidatePath } from 'next/cache'

// Record a research page view
export async function recordResearchView(researchId: string) {
  // Initialize Supabase and get the current user
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.id) {
    // Count a logged-in viewer only once per research.
    const { data: existing } = await supabase
      .from('research_views')
      .select('id')
      .eq('research_id', researchId)
      .eq('user_id', user.id)
      .limit(1)

    if (existing && existing.length > 0) return
  }

  // Insert the view record
  await supabase.from('research_views').insert({
    research_id: researchId,
    user_id: user?.id || null,
  })
}

// Submit a request for full research access
export async function submitAccessRequestAction(input: {
  researchId: string
  guestName?: string
  guestEmail?: string
  message: string
}) {
  const result = await createAccessRequest({
    researchId: input.researchId,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    message: input.message,
  })

  if (result.success) {
    revalidatePath(`/repository/${input.researchId}`)
  }

  return result
}

// Generate a signed URL for reading or downloading a research file
export async function getPublicSignedUrl(
  fileUrl: string,
  isDownload: boolean = false,
  researchId?: string,
  downloadFileName?: string,
  guestToken?: string
) {
  const supabase = await createClient()

  // Authorization Check:
  // If researchId is provided, check user or guest token authorization
  if (researchId) {
    const { getUserResearchAccessState } = await import('@/lib/research/access-requests/service')
    const accessState = await getUserResearchAccessState(researchId, guestToken)

    if (!accessState.hasFullAccess) {
      return {
        error: 'You do not have authorization to access this research manuscript. Please submit an access request.',
      }
    }
  } else {
    // If no researchId, require authenticated session as fallback
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Please log in or provide a valid access link to view this research file.' }
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Track download events if this request is for a download
  if (isDownload && researchId) {
    try {
      await supabase.from('research_downloads').insert({
        research_id: researchId,
        user_id: user?.id || null,
      })
    } catch (e) {
      console.error('Error tracking research download:', e)
    }
  }

  // Generate a temporary signed URL for the file
  const { data, error } = await supabase.storage
    .from('trackademiaPapers')
    .createSignedUrl(fileUrl, 3600, {
      download: isDownload ? (downloadFileName || true) : false,
    })

  // Handle signed URL generation errors
  if (error) {
    console.error('Error generating signed URL:', error)
    return { error: 'Failed to generate secure document link.' }
  }

  // Return the signed URL
  return { url: data?.signedUrl }
}
