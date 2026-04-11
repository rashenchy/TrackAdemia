'use server'

/* =========================================
   IMPORTS
   - cookies: manage server-side cookies
   - redirect: navigation control
   - createClient: Supabase server client
   - admin view mode constants/types
========================================= */
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  ADMIN_VIEW_COOKIE,
  type AdminViewMode,
} from '@/lib/users/admin-view-mode'

/* =========================================
   ADMIN GUARD (INTERNAL)
   - Ensures user is logged in
   - Ensures user role is admin
   - Redirects if unauthorized
========================================= */
async function requireAdmin() {
  const supabase = await createClient()

  // Get current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect if not logged in
  if (!user) {
    redirect('/login')
  }

  // Fetch user role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Redirect if not admin
  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }
}

/* =========================================
   ENABLE "VIEW AS USER"
   - Stores selected mode in cookie
   - Allows admin to simulate user perspective
========================================= */
export async function beginViewAsUser(mode: AdminViewMode) {
  await requireAdmin()

  const cookieStore = await cookies()

  // Set admin view mode cookie
  cookieStore.set(ADMIN_VIEW_COOKIE, mode, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  })

  // Redirect to dashboard as selected mode
  redirect('/dashboard')
}

/* =========================================
   DISABLE "VIEW AS USER"
   - Removes admin view cookie
   - Returns to admin-specific view page
========================================= */
export async function stopViewAsUser() {
  await requireAdmin()

  const cookieStore = await cookies()

  // Delete admin view mode cookie
  cookieStore.delete(ADMIN_VIEW_COOKIE)

  // Redirect back to admin control page
  redirect('/admin/view-as-user')
}

/* =========================================
   TYPES
   Structure for dashboard statistics
========================================= */
export interface DashboardStats {
  totalResearch: number
  publishedResearch: number
  totalSections: number
  totalUsers: number
  totalMentors: number
}

/* =========================================
   GET DASHBOARD STATS
   - Aggregates system-wide metrics
   - Used for admin "view as user" dashboard
========================================= */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()

  try {
    // Total research count
    const { count: totalResearch } = await supabase
      .from('research')
      .select('*', { count: 'exact', head: true })

    // Published research count
    const { count: publishedResearch } = await supabase
      .from('research')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Published')

    // Total sections count
    const { count: totalSections } = await supabase
      .from('sections')
      .select('*', { count: 'exact', head: true })

    // Total users count
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // Total mentors count
    const { count: totalMentors } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'mentor')

    // Return normalized values (fallback to 0)
    return {
      totalResearch: totalResearch || 0,
      publishedResearch: publishedResearch || 0,
      totalSections: totalSections || 0,
      totalUsers: totalUsers || 0,
      totalMentors: totalMentors || 0,
    }
  } catch (error) {
    console.error('Error getting dashboard stats:', error)

    // Safe fallback response
    return {
      totalResearch: 0,
      publishedResearch: 0,
      totalSections: 0,
      totalUsers: 0,
      totalMentors: 0,
    }
  }
}

/* =========================================
   GET FEATURED RESEARCH
   - Fetches top 5 most viewed research
   - Used for dashboard highlights
========================================= */
export async function getFeaturedResearch() {
  const supabase = await createClient()

  try {
    const { data: research } = await supabase
      .from('research')
      .select('id, title, views_count, downloads_count, status')
      .order('views_count', { ascending: false })
      .limit(5)

    return research || []
  } catch (error) {
    console.error('Error fetching featured research:', error)
    return []
  }
}