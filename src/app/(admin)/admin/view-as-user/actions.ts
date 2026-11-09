'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  ADMIN_VIEW_COOKIE,
  type AdminViewMode,
} from '@/lib/users/admin-view-mode'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/dashboard')
  }
}

export async function beginViewAsUser(mode: AdminViewMode) {
  await requireAdmin()

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_VIEW_COOKIE, mode, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  })

  redirect('/dashboard')
}

export async function stopViewAsUser() {
  await requireAdmin()

  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_VIEW_COOKIE)

  redirect('/admin/view-as-user')
}

export interface DashboardStats {
  totalResearch: number
  publishedResearch: number
  totalSections: number
  totalUsers: number
  totalMentors: number
}

/**
 * Get system-wide statistics for admin "View as User" perspective
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()

  try {
    const { count: totalResearch } = await supabase
      .from('research')
      .select('*', { count: 'exact', head: true })

    // Get published research
    const { count: publishedResearch } = await supabase
      .from('research')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Published')

    // Get total sections
    const { count: totalSections } = await supabase
      .from('sections')
      .select('*', { count: 'exact', head: true })

    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    // Get total mentors
    const { count: totalMentors } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'mentor')

    return {
      totalResearch: totalResearch || 0,
      publishedResearch: publishedResearch || 0,
      totalSections: totalSections || 0,
      totalUsers: totalUsers || 0,
      totalMentors: totalMentors || 0,
    }
  } catch (error) {
    console.error('Error getting dashboard stats:', error)
    return {
      totalResearch: 0,
      publishedResearch: 0,
      totalSections: 0,
      totalUsers: 0,
      totalMentors: 0,
    }
  }
}

/**
 * Get featured/popular research
 */
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
