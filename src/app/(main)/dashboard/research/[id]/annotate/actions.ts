'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { syncResearchReviewStatus } from '@/lib/research-review-status'

type HighlightArea = {
  pageIndex: number
  top: number
  left: number
  width: number
  height: number
}

type AnnotationHighlightData = {
  selectedText: string
  highlightAreas: HighlightArea[]
}


// Creates a new annotation linked to a highlighted portion of the research document
export async function addAnnotation(
  researchId: string,
  highlightData: AnnotationHighlightData,
  commentText: string
) {

  const supabase = await createClient()


  // Retrieve the currently authenticated user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('User not authenticated')


  // Construct the annotation record to be inserted into the database
  const newAnnotation = {
    research_id: researchId,
    user_id: user.id,
    quote: highlightData.selectedText,
    comment_text: commentText,
    position_data: highlightData.highlightAreas,
  }


  // Insert annotation into the database and return the created record
  const { data, error } = await supabase
    .from('annotations')
    .insert(newAnnotation)
    .select()
    .single()

  if (error) {
    console.error('Insert annotation error:', error)
    throw error
  }

  await syncResearchReviewStatus(supabase, researchId)
  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/research/${researchId}`)
  revalidatePath('/dashboard/tasks')

  return data
}



// Generates a temporary signed URL allowing secure access to the research file
export async function getResearchFile(researchId: string) {

  const supabase = await createClient()


  // Retrieve the storage path of the research file
  const { data: research } = await supabase
    .from('research')
    .select('file_url')
    .eq('id', researchId)
    .single()

  if (!research?.file_url) return null


  // Create a temporary signed URL to access the stored PDF file
  const { data } = await supabase.storage
    .from('trackademiaPapers')
    .createSignedUrl(research.file_url, 3600)

  return data?.signedUrl
}



// Retrieves annotations for a research document while respecting file version changes
export async function getAnnotations(researchId: string) {

  const supabase = await createClient()


  // Fetch the latest uploaded version timestamp of the research file
  const { data: latestVersion } = await supabase
    .from('research_versions')
    .select('created_at')
    .eq('research_id', researchId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()


  // Build the base query for retrieving annotations
  let query = supabase
    .from('annotations')
    .select('*')
    .eq('research_id', researchId)
    .order('created_at', { ascending: true })


  // Filter annotations so only those created after the latest file upload are returned
  if (latestVersion?.created_at) {
    query = query.gte('created_at', latestVersion.created_at)
  }


  // Execute the query
  const { data, error } = await query

  if (error) {
    console.error(error)
    return []
  }

  return data || []
}



// Updates the resolved/unresolved state of a specific annotation
export async function toggleAnnotationResolved(
  annotationId: string,
  newStatus: boolean
) {

  const supabase = await createClient()


  // Update annotation status and return the updated record
  const { data, error } = await supabase
    .from('annotations')
    .update({ is_resolved: newStatus })
    .eq('id', annotationId)
    .select()
    .single()

  if (error) throw error

  await syncResearchReviewStatus(supabase, data.research_id)
  revalidatePath('/dashboard')
  revalidatePath(`/dashboard/research/${data.research_id}`)
  revalidatePath('/dashboard/tasks')

  return data
}



// Retrieves all replies associated with a specific annotation
export async function getReplies(annotationId: string) {

  const supabase = await createClient()


  // Fetch replies along with author profile information
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



// Creates a new reply within an annotation discussion thread
export async function addReply(annotationId: string, message: string) {

  const supabase = await createClient()


  // Ensure the user is authenticated before creating a reply
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('User not authenticated')


  // Insert the reply into the database
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


  // Fetch the author's profile so the UI can immediately display the reply with user info
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, role')
    .eq('id', user.id)
    .single()

  return { ...reply, profiles: profile }
}



// Updates the content of an existing reply while ensuring only the owner can modify it
export async function updateReply(replyId: string, newMessage: string) {

  const supabase = await createClient()


  // Verify the user performing the update
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')


  // Update the reply message and mark it as edited
  const { error } = await supabase
    .from('annotation_replies')
    .update({ message: newMessage, is_edited: true })
    .eq('id', replyId)
    .eq('user_id', user.id)

  if (error) throw error
}



// Deletes a reply while enforcing ownership security
export async function deleteReply(replyId: string) {

  const supabase = await createClient()


  // Verify the user performing the deletion
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')


  // Delete the reply only if it belongs to the authenticated user
  const { error } = await supabase
    .from('annotation_replies')
    .delete()
    .eq('id', replyId)
    .eq('user_id', user.id)

  if (error) throw error
}
