'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getProfileAccessState } from '@/lib/users/access'

export interface UserProfile {
  id: string
  first_name: string
  last_name: string
  email?: string
  role: 'student' | 'mentor' | 'admin'
  course_program: string
  is_verified: boolean
  is_active: boolean
  updated_at: string
  deleted_at?: string | null
  sectionsCount?: number
  researchCount?: number
}

/**
 * Fetch all users with filtering options
 */
export async function getAllUsers(
  roleFilter?: string,
  searchTerm?: string,
  statusFilter: 'active' | 'archived' | 'all' = 'active'
): Promise<UserProfile[]> {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  try {
    let query = supabase
      .from('profiles')
      .select('id, first_name, last_name, role, course_program, is_verified, is_active, updated_at, deleted_at')
      .order('updated_at', { ascending: false })

    if (roleFilter && roleFilter !== 'all') {
      query = query.eq('role', roleFilter)
    }

    if (statusFilter !== 'all') {
      query = query.eq('is_active', statusFilter === 'active')
    }

    const { data: profiles, error } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return []
    }

    const users: UserProfile[] = []

    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        // Filter by search term if provided (search in name)
        if (searchTerm) {
          const fullName = `${profile.first_name} ${profile.last_name}`.toLowerCase()
          if (!fullName.includes(searchTerm.toLowerCase())) {
            continue
          }
        }

        // Get email from auth
        const { data: authUser } = adminSupabase
          ? await adminSupabase.auth.admin.getUserById(profile.id)
          : { data: { user: null } }

        // Get workload info for mentors
        let sectionsCount = 0
        let researchCount = 0

        if (profile.role === 'mentor') {
          // Count sections where this mentor is the teacher
          const { count: sectionCount } = await supabase
            .from('sections')
            .select('*', { count: 'exact', head: true })
            .eq('teacher_id', profile.id)

          // Count research where this mentor is the adviser
          const { count: researchCountResult } = await supabase
            .from('research')
            .select('*', { count: 'exact', head: true })
            .eq('adviser_id', profile.id)

          sectionsCount = sectionCount || 0
          researchCount = researchCountResult || 0
        }

        users.push({
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: authUser.user?.email || 'N/A',
          role: profile.role as 'student' | 'mentor' | 'admin',
          course_program: profile.course_program,
          is_verified: profile.is_verified,
          is_active: profile.is_active,
          updated_at: profile.updated_at,
          deleted_at: profile.deleted_at,
          sectionsCount,
          researchCount
        })
      }
    }

    return users
  } catch (error) {
    console.error('Unexpected error fetching users:', error)
    return []
  }
}

/**
 * Delete/suspend a user by removing their profile and disabling auth
 * Note: This soft-deletes the profile and relies on auth disable
 */
export async function deleteOrBanUser(userId: string): Promise<{ success: boolean; error?: string }> {
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

    // Prevent self-deletion
    if (userId === currentUser.id) {
      return { success: false, error: 'Cannot delete your own account' }
    }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', userId)
      .maybeSingle()

    if (!existingProfile) {
      return { success: false, error: 'User profile not found.' }
    }

    if (!existingProfile.is_active) {
      return { success: false, error: 'User is already archived.' }
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: currentUser.id,
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Error archiving user profile:', profileError)
      return { success: false, error: profileError.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error archiving user:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
