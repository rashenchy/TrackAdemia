'use server'

/* =========================================
   IMPORTS
   - Supabase server client
========================================= */
import { createClient } from '@/lib/supabase/server'

/* =========================================
   TYPES
   Represents user profile with optional metrics
========================================= */
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

/* =========================================
   GET ALL USERS
   - Fetches users with optional role + search filters
   - Enriches with email and mentor workload stats
========================================= */
export async function getAllUsers(
  roleFilter?: string,
  searchTerm?: string
): Promise<UserProfile[]> {
  const supabase = await createClient()

  try {
    /* =========================================
       BASE QUERY
    ========================================= */
    let query = supabase
      .from('profiles')
      .select('id, first_name, last_name, role, course_program, is_verified, updated_at')
      .order('updated_at', { ascending: false })

    /* =========================================
       ROLE FILTER
    ========================================= */
    if (roleFilter && roleFilter !== 'all') {
      query = query.eq('role', roleFilter)
    }

    const { data: profiles, error } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return []
    }

    /* =========================================
       DATA PROCESSING + ENRICHMENT
    ========================================= */
    const users: UserProfile[] = []

    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {

        /* =========================================
           SEARCH FILTER (NAME MATCH)
        ========================================= */
        if (searchTerm) {
          const fullName = `${profile.first_name} ${profile.last_name}`.toLowerCase()
          if (!fullName.includes(searchTerm.toLowerCase())) continue
        }

        /* =========================================
           FETCH EMAIL FROM AUTH
        ========================================= */
        const {
          data: { user },
        } = await supabase.auth.admin.getUserById(profile.id)

        /* =========================================
           MENTOR WORKLOAD CALCULATION
           - sections handled
           - research advised
        ========================================= */
        let sectionsCount = 0
        let researchCount = 0

        if (profile.role === 'mentor') {
          const { count: sectionCount } = await supabase
            .from('sections')
            .select('*', { count: 'exact', head: true })
            .eq('teacher_id', profile.id)

          const { count: researchCountResult } = await supabase
            .from('research')
            .select('*', { count: 'exact', head: true })
            .eq('adviser_id', profile.id)

          sectionsCount = sectionCount || 0
          researchCount = researchCountResult || 0
        }

        /* =========================================
           FINAL OBJECT BUILD
        ========================================= */
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
          researchCount,
        })
      }
    }

    return users

  } catch (error) {
    console.error('Unexpected error fetching users:', error)
    return []
  }
}

/* =========================================
   DELETE OR BAN USER
   - Admin-only action
   - Deletes auth account + profile
   - Prevents self-deletion
========================================= */
export async function deleteOrBanUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    /* =========================================
       AUTHENTICATION + AUTHORIZATION CHECK
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
       PREVENT SELF-DELETION
    ========================================= */
    if (userId === currentUser.id) {
      return { success: false, error: 'Cannot delete your own account' }
    }

    /* =========================================
       DELETE FROM AUTH SYSTEM
    ========================================= */
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError)
      return { success: false, error: deleteError.message }
    }

    /* =========================================
       DELETE PROFILE RECORD
    ========================================= */
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Error deleting user profile:', profileError)
      // Do not fail completely if profile deletion fails
    }

    return { success: true }

  } catch (error) {
    console.error('Unexpected error deleting user:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}