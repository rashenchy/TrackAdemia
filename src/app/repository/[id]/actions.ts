'use server'

import { createClient } from '@/lib/supabase/server'

export async function getPublicSignedUrl(fileUrl: string, isDownload: boolean = false) {
  const supabase = await createClient()

  // Generate a signed URL valid for 1 hour (3600 seconds)
  // Passing { download: isDownload } tells the browser whether to view inline or force download
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