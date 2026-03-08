'use server'

import { createClient } from '@/lib/supabase/server'

// Function to record a page view
export async function recordResearchView(researchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Prevent duplicate views in the last minute
  const { data: existing } = await supabase
    .from('research_views')
    .select('id')
    .eq('research_id', researchId)
    .eq('user_id', user?.id || null)
    .gte('created_at', new Date(Date.now() - 60000).toISOString())
    .limit(1)

  if (existing && existing.length > 0) return

  await supabase.from('research_views').insert({
    research_id: researchId,
    user_id: user?.id || null
  })
}

// Generate Download Link and Track Download
export async function getPublicSignedUrl(fileUrl: string, isDownload: boolean = false, researchId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Track Downloads
  if (isDownload && researchId) {
    // 1. Insert into tracking table
    // (The SQL Trigger handles the +1 increment automatically)
    await supabase.from('research_downloads').insert({ 
      research_id: researchId,
      user_id: user?.id || null
    })
  }

  const { data, error } = await supabase.storage
    .from('trackademiaPapers')
    .createSignedUrl(fileUrl, 3600, {
      download: isDownload 
    })

  if (error) {
    console.error('Error generating signed URL:', error)
    return { error: 'Failed to generate download link.' }
  }

  return { url: data?.signedUrl }
}