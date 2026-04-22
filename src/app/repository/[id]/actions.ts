'use server'

import { createClient } from '@/lib/supabase/server'

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

// Generate a signed URL for reading or downloading a research file
export async function getPublicSignedUrl(
  fileUrl: string,
  isDownload: boolean = false,
  researchId?: string,
  downloadFileName?: string
) {
  // Initialize Supabase and fetch the current user
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Track download events if this request is for a download
  if (isDownload && researchId) {

    // Insert a download record
    // The database trigger handles incrementing the counter
    await supabase.from('research_downloads').insert({
      research_id: researchId,
      user_id: user?.id || null,
    })
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
    return { error: 'Failed to generate download link.' }
  }

  // Return the signed URL
  return { url: data?.signedUrl }
}
