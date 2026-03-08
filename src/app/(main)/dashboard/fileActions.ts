'use server'

import { createClient } from '@/lib/supabase/server'

//Function to OPEN the file in the browser (View)
export async function getSignedViewUrl(filePath: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized request.' }

  const { data, error } = await supabase.storage
    .from('trackademiaPapers')
    .createSignedUrl(filePath, 60)

  if (error || !data) {
    console.error('Signed URL View Error:', error)
    return { error: 'Failed to generate secure view link.' }
  }

  return { url: data.signedUrl }
}

//Function to FORCE DOWNLOAD the file
export async function getSignedDownloadUrl(filePath: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized request.' }

  // Adding { download: true } forces the browser to trigger a file download
  const { data, error } = await supabase.storage
    .from('trackademiaPapers')
    .createSignedUrl(filePath, 60, { download: true })

  if (error || !data) {
    console.error('Signed URL Download Error:', error)
    return { error: 'Failed to generate secure download link.' }
  }

  return { url: data.signedUrl }
}