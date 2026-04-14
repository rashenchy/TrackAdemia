'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications/service'
import { getProfileAccessState } from '@/lib/users/access'

interface Faculty {
  id: string
  first_name: string
  last_name: string
  email?: string
  course_program: string
  is_verified: boolean
  updated_at: string
}

/**
 * Fetch all pending faculty/mentor accounts awaiting verification
 */
export async function getPendingFaculty(): Promise<Faculty[]> {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  try {
    // Get pending faculty (mentors with is_verified = false)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, course_program, is_verified, updated_at')
      .eq('role', 'mentor')
      .eq('is_verified', false)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending faculty:', error)
      return []
    }

    // Fetch user emails from auth.users table
    const facultyWithEmails: Faculty[] = []
    
    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        const { data: authUser } = adminSupabase
          ? await adminSupabase.auth.admin.getUserById(profile.id)
          : { data: { user: null } }
        
        facultyWithEmails.push({
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: authUser.user?.email || 'N/A',
          course_program: profile.course_program,
          is_verified: profile.is_verified,
          updated_at: profile.updated_at
        })
      }
    }

    return facultyWithEmails
  } catch (error) {
    console.error('Unexpected error fetching pending faculty:', error)
    return []
  }
}

/**
 * Verify a faculty member by updating their is_verified status to true
 */
export async function verifyFaculty(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    // Verify the current user is an admin
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' }
    }

    const adminProfile = await getProfileAccessState(supabase, currentUser.id)

    if (!adminProfile?.is_active || adminProfile.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Update the faculty member's verification status
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: true, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      console.error('Error verifying faculty:', error)
      return { success: false, error: error.message }
    }

    await createNotification(supabase, {
      user_id: userId,
      actor_id: currentUser.id,
      title: 'Account verified',
      message: 'Your faculty account has been approved. Teacher tools are now available.',
      notification_type: 'account_verified',
      reference_id: userId,
      event_key: `account-verified:${userId}`,
    })

    return { success: true }
  } catch (error) {
    console.error('Unexpected error verifying faculty:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Reject/un-verify a faculty member
 */
export async function rejectFaculty(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    // Verify the current user is an admin
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      return { success: false, error: 'Not authenticated' }
    }

    const adminProfile = await getProfileAccessState(supabase, currentUser.id)

    if (!adminProfile?.is_active || adminProfile.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Update the faculty member's verification status to false
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: false, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      console.error('Error rejecting faculty:', error)
      return { success: false, error: error.message }
    }

    await createNotification(supabase, {
      user_id: userId,
      actor_id: currentUser.id,
      title: 'Account review updated',
      message: 'Your faculty account is still pending approval. Contact an administrator if you need help.',
      notification_type: 'account_rejected',
      reference_id: userId,
      event_key: `account-rejected:${userId}:${new Date().toISOString()}`,
    })

    return { success: true }
  } catch (error) {
    console.error('Unexpected error rejecting faculty:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
