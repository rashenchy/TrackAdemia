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
   Represents student account data
========================================= */
interface Student {
  id: string
  first_name: string
  last_name: string
  email?: string
  course_program: string
  student_number?: string | null
  is_verified: boolean
  updated_at: string
}

/* =========================================
   GET PENDING STUDENTS
   - Fetches unverified student accounts
   - Enriches with email from auth.users
========================================= */
export async function getPendingStudents(): Promise<Student[]> {
  const supabase = await createClient()

  try {
    /* =========================================
       FETCH STUDENT PROFILES
    ========================================= */
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, course_program, student_number, is_verified, updated_at')
      .eq('role', 'student')
      .eq('is_verified', false)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending students:', error)
      return []
    }

    /* =========================================
       ENRICH DATA WITH EMAILS
    ========================================= */
    const studentsWithEmails: Student[] = []

    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        const {
          data: { user },
        } = await supabase.auth.admin.getUserById(profile.id)

        studentsWithEmails.push({
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: user?.email || 'N/A',
          course_program: profile.course_program,
          student_number: profile.student_number,
          is_verified: profile.is_verified,
          updated_at: profile.updated_at,
        })
      }
    }

    return studentsWithEmails
  } catch (error) {
    console.error('Unexpected error fetching pending students:', error)
    return []
  }
}

/* =========================================
   VERIFY STUDENT
   - Admin-only action
   - Approves student account
   - Sends notification
========================================= */
export async function verifyStudent(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    /* =========================================
       AUTHENTICATION + AUTHORIZATION CHECK
    ========================================= */
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

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
      .update({ is_verified: true, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      console.error('Error verifying student:', error)
      return { success: false, error: error.message }
    }

    /* =========================================
       SEND NOTIFICATION
    ========================================= */
    await createNotification(supabase, {
      user_id: userId,
      actor_id: currentUser.id,
      title: 'Account verified',
      message: 'Your student account has been approved. The academic workspace is now unlocked.',
      notification_type: 'account_verified',
      reference_id: userId,
      event_key: `account-verified:${userId}`,
    })

    return { success: true }
  } catch (error) {
    console.error('Unexpected error verifying student:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

/* =========================================
   REJECT STUDENT
   - Admin-only action
   - Keeps account unverified
   - Sends notification
========================================= */
export async function rejectStudent(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    /* =========================================
       AUTHENTICATION + AUTHORIZATION CHECK
    ========================================= */
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

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
      .update({ is_verified: false, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      console.error('Error rejecting student:', error)
      return { success: false, error: error.message }
    }

    /* =========================================
       SEND NOTIFICATION
    ========================================= */
    await createNotification(supabase, {
      user_id: userId,
      actor_id: currentUser.id,
      title: 'Account review updated',
      message: 'Your student account is still pending approval. Contact an administrator if you need help.',
      notification_type: 'account_rejected',
      reference_id: userId,
      event_key: `account-rejected:${userId}:${new Date().toISOString()}`,
    })

    return { success: true }
  } catch (error) {
    console.error('Unexpected error rejecting student:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}