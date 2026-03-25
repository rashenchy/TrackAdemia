'use server'

import { createClient } from '@/lib/supabase/server'

export interface Announcement {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'urgent'
  created_by: string
  created_at: string
  expires_at: string | null
  is_active: boolean
}

export async function createAnnouncement(
  title: string,
  message: string,
  type: 'info' | 'warning' | 'success' | 'urgent',
  expiresAt?: string
): Promise<Announcement | null> {
  try {
    const supabase = await createClient()

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (profile?.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required')
    }

    const { data, error } = await supabase
      .from('announcements')
      .insert([
        {
          title,
          message,
          type,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          expires_at: expiresAt || null,
          is_active: true,
        },
      ])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error creating announcement:', err)
    return null
  }
}

export async function getAnnouncements(): Promise<Announcement[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error fetching announcements:', err)
    return []
  }
}

export async function updateAnnouncement(
  id: string,
  updates: Partial<Announcement>
): Promise<Announcement | null> {
  try {
    const supabase = await createClient()

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (profile?.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required')
    }

    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error updating announcement:', err)
    return null
  }
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (profile?.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required')
    }

    const { error } = await supabase.from('announcements').delete().eq('id', id)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error deleting announcement:', err)
    return false
  }
}

export async function toggleAnnouncementStatus(id: string, isActive: boolean): Promise<boolean> {
  try {
    const supabase = await createClient()

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (profile?.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required')
    }

    const { error } = await supabase
      .from('announcements')
      .update({ is_active: isActive })
      .eq('id', id)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error toggling announcement:', err)
    return false
  }
}

export async function getActiveAnnouncements(): Promise<Announcement[]> {
  try {
    const supabase = await createClient()

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error fetching active announcements:', err)
    return []
  }
}
