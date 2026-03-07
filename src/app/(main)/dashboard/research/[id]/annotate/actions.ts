'use server'

import { createClient } from '@/lib/supabase/server'

export async function addAnnotation(
  researchId: string,
  highlightData: any,
  commentText: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('User not authenticated')

  const newAnnotation = {
    research_id: researchId,
    user_id: user.id,
    quote: highlightData.selectedText,
    comment_text: commentText,
    position_data: highlightData.highlightAreas,
  }

  const { data, error } = await supabase
    .from('annotations')
    .insert(newAnnotation)
    .select()
    .single()

  if (error) {
    console.error('Insert annotation error:', error)
    throw error
  }

  return data
}

export async function getResearchFile(researchId: string) {
  const supabase = await createClient()

  const { data: research } = await supabase
    .from('research')
    .select('file_url')
    .eq('id', researchId)
    .single()

  if (!research?.file_url) return null

  const { data } = await supabase.storage
    .from('trackademiaPapers')
    .createSignedUrl(research.file_url, 3600)

  return data?.signedUrl
}

export async function getAnnotations(researchId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('annotations')
    .select('*')
    .eq('research_id', researchId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error(error)
    return []
  }

  return data || []
}

export async function toggleAnnotationResolved(
  annotationId: string,
  newStatus: boolean
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('annotations')
    .update({ is_resolved: newStatus })
    .eq('id', annotationId)
    .select()
    .single()

  if (error) throw error

  return data
}

export async function getReplies(annotationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('annotation_replies')
    .select(`
      *,
      profiles!inner(first_name, last_name, role)
    `)
    .eq('annotation_id', annotationId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching replies:', error)
    return []
  }

  return data || []
}

export async function addReply(annotationId: string, message: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('User not authenticated')

  const { data: reply, error } = await supabase
    .from('annotation_replies')
    .insert({
      annotation_id: annotationId,
      user_id: user.id,
      message: message
    })
    .select()
    .single()

  if (error) {
    console.error('Error adding reply:', error)
    throw error
  }

  // Fetch the user's profile to immediately return complete data to the UI
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single()

  return { ...reply, profiles: profile }
}

export async function updateReply(replyId: string, newMessage: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('annotation_replies')
    .update({ message: newMessage, is_edited: true })
    .eq('id', replyId)
    .eq('user_id', user.id) // Security check: Only the owner can edit

  if (error) throw error
}

export async function deleteReply(replyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('annotation_replies')
    .delete()
    .eq('id', replyId)
    .eq('user_id', user.id) // Security check: Only the owner can delete

  if (error) throw error
}