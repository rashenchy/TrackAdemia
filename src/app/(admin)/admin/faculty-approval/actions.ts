'use server'

/* =========================================
   IMPORTS
   - Supabase server client
   - Notification service
========================================= */
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/lib/notifications/service'

/* =========================================
   TYPES
   Represents a faculty/mentor account
========================================= */
interface Faculty {
  id: string
  first_name: string
  last_name: string
  email?: string
  course_program: string
  is_verified: boolean
  updated_at: string
}

/* =========================================
   GET PENDING FACULTY
   - Retrieves all mentors awaiting approval
   - Enriches with email from auth.users
========================================= */
export async function getPendingFaculty(): Promise<Faculty[]> {
  const supabase = await createClient()

  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, course_program, is_verified, updated_at')
      .eq('role', 'mentor')
      .eq('is_verified', false)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending faculty:', error)
      return []
    }

    /* =========================================
       ENRICH DATA WITH EMAIL
       Uses admin API to fetch auth user emails
    ========================================= */
    const facultyWithEmails: Faculty[] = []

    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)

        facultyWithEmails.push({
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: user?.email || 'N/A',
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

/* =========================================
   VERIFY FACULTY
   - Admin-only action
   - Sets is_verified = true
   - Sends notification to user
========================================= */
export async function verifyFaculty(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    /* =========================================
       AUTHORIZATION CHECK
       Ensures current user is admin
    ========================================= */
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (!adminProfile || adminProfile.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' }
    }

    /* =========================================
       UPDATE VERIFICATION STATUS
    ========================================= */
    const { error } = await supabase
      .from('profiles')
      .update({
        is_verified: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      console.error('Error verifying faculty:', error)
      return { success: false, error: error.message }
    }

    /* =========================================
       NOTIFICATION
       Informs user of approval
    ========================================= */
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

/* =========================================
   REJECT FACULTY
   - Admin-only action
   - Keeps is_verified = false
   - Sends notification to user
========================================= */
export async function rejectFaculty(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    /* =========================================
       AUTHORIZATION CHECK
    ========================================= */
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (!adminProfile || adminProfile.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' }
    }

    /* =========================================
       UPDATE STATUS (REJECT)
    ========================================= */
    const { error } = await supabase
      .from('profiles')
      .update({
        is_verified: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      console.error('Error rejecting faculty:', error)
      return { success: false, error: error.message }
    }

    /* =========================================
       NOTIFICATION
    ========================================= */
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