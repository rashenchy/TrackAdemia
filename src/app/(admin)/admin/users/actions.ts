'use server'

import { createClient } from '@/lib/supabase/server'

export interface UserProfile {
  id: string
  first_name: string
  last_name: string
  email?: string
  role: 'student' | 'mentor' | 'admin'
  course_program: string
  is_verified: boolean
  updated_at: string
  sectionsCount?: number
  researchCount?: number
}

/**
 * Fetch all users with filtering options
 */
export async function getAllUsers(roleFilter?: string, searchTerm?: string): Promise<UserProfile[]> {
  const supabase = await createClient()

  try {
    let query = supabase
      .from('profiles')
      .select('id, first_name, last_name, role, course_program, is_verified, updated_at')
      .order('updated_at', { ascending: false })

    if (roleFilter && roleFilter !== 'all') {
      query = query.eq('role', roleFilter)
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
        const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)

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
          email: user?.email || 'N/A',
          role: profile.role as 'student' | 'mentor' | 'admin',
          course_program: profile.course_program,
          is_verified: profile.is_verified,
          updated_at: profile.updated_at,
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
 * Update a user's role
 */
export async function updateUserRole(userId: string, newRole: 'student' | 'mentor' | 'admin'): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    // Verify the current user is an admin
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

    // Prevent self-demotion
    if (userId === currentUser.id && newRole !== 'admin') {
      return { success: false, error: 'Cannot change your own admin role' }
    }

    // Update the user's role
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      console.error('Error updating user role:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error updating user role:', error)
    return { success: false, error: 'An unexpected error occurred' }
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

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (!adminProfile || adminProfile.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Prevent self-deletion
    if (userId === currentUser.id) {
      return { success: false, error: 'Cannot delete your own account' }
    }

    // Delete the user from auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
    
    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError)
      return { success: false, error: deleteError.message }
    }

    // Also delete the profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting user profile:', profileError)
      // Don't fail completely if profile deletion fails, user is already deleted from auth
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error deleting user:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
