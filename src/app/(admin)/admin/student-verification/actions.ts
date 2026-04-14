'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications/service'
import { getProfileAccessState } from '@/lib/users/access'

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

export async function getPendingStudents(): Promise<Student[]> {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, course_program, student_number, is_verified, updated_at')
      .eq('role', 'student')
      .eq('is_verified', false)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending students:', error)
      return []
    }

    const studentsWithEmails: Student[] = []

    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        const { data: authUser } = adminSupabase
          ? await adminSupabase.auth.admin.getUserById(profile.id)
          : { data: { user: null } }

        studentsWithEmails.push({
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: authUser.user?.email || 'N/A',
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

export async function verifyStudent(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      return { success: false, error: 'Not authenticated' }
    }

    const adminProfile = await getProfileAccessState(supabase, currentUser.id)

    if (!adminProfile?.is_active || adminProfile.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: true, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      console.error('Error verifying student:', error)
      return { success: false, error: error.message }
    }

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

export async function rejectStudent(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      return { success: false, error: 'Not authenticated' }
    }

    const adminProfile = await getProfileAccessState(supabase, currentUser.id)

    if (!adminProfile?.is_active || adminProfile.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        is_verified: false,
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: currentUser.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      console.error('Error rejecting student:', error)
      return { success: false, error: error.message }
    }

    await createNotification(supabase, {
      user_id: userId,
      actor_id: currentUser.id,
      title: 'Account registration rejected',
      message: 'Your student registration was not approved and the account has been archived. Contact an administrator if you need help.',
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
