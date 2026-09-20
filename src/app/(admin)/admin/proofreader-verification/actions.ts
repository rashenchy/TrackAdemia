'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/lib/notifications/service'
import { getProfileAccessState, isFacultyRole } from '@/lib/users/access'

export interface PendingProofreader {
  id: string
  first_name: string
  last_name: string
  email?: string
  course_program: string // department / specialization
  institution?: string | null
  is_verified: boolean
  updated_at: string
}

export async function getPendingProofreaders(): Promise<PendingProofreader[]> {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, course_program, institution, is_verified, updated_at')
      .eq('role', 'proofreader')
      .eq('is_verified', false)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending proofreaders:', error)
      return []
    }

    const proofreadersWithEmails: PendingProofreader[] = []

    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        const { data: authUser } = adminSupabase
          ? await adminSupabase.auth.admin.getUserById(profile.id)
          : { data: { user: null } }

        proofreadersWithEmails.push({
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: authUser?.user?.email || 'N/A',
          course_program: profile.course_program,
          institution: (profile as any).institution || null,
          is_verified: profile.is_verified,
          updated_at: profile.updated_at,
        })
      }
    }

    return proofreadersWithEmails
  } catch (error) {
    console.error('Unexpected error fetching pending proofreaders:', error)
    return []
  }
}

export async function getPendingProofreadersCount(): Promise<number> {
  const supabase = await createClient()

  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'proofreader')
      .eq('is_verified', false)
      .eq('is_active', true)

    if (error) {
      return 0
    }

    return count || 0
  } catch {
    return 0
  }
}

export async function verifyProofreader(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      return { success: false, error: 'Not authenticated' }
    }

    const facultyProfile = await getProfileAccessState(supabase, currentUser.id)

    if (!facultyProfile?.is_active || !isFacultyRole(facultyProfile.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: true, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      console.error('Error verifying proofreader:', error)
      return { success: false, error: error.message }
    }

    await createNotification(supabase, {
      user_id: userId,
      actor_id: currentUser.id,
      title: 'Proofreader Account Approved',
      message: 'Your Language Editor / Proofreader account has been approved by the faculty. You can now access and annotate assigned manuscripts.',
      notification_type: 'account_verified',
      reference_id: userId,
      event_key: `proofreader-verified:${userId}`,
    })

    return { success: true }
  } catch (error) {
    console.error('Unexpected error verifying proofreader:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function rejectProofreader(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      return { success: false, error: 'Not authenticated' }
    }

    const facultyProfile = await getProfileAccessState(supabase, currentUser.id)

    if (!facultyProfile?.is_active || !isFacultyRole(facultyProfile.role)) {
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
      console.error('Error rejecting proofreader:', error)
      return { success: false, error: error.message }
    }

    await createNotification(supabase, {
      user_id: userId,
      actor_id: currentUser.id,
      title: 'Proofreader Registration Declined',
      message: 'Your Language Editor / Proofreader registration was not approved by the faculty. Please contact an administrator for assistance.',
      notification_type: 'account_rejected',
      reference_id: userId,
      event_key: `proofreader-rejected:${userId}:${new Date().toISOString()}`,
    })

    return { success: true }
  } catch (error) {
    console.error('Unexpected error rejecting proofreader:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
