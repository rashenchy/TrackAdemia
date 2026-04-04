'use server'

import { createClient } from '@/lib/supabase/server'
import { createNotifications } from '@/lib/notifications/service'

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

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  if (typeof error === 'object' && error !== null) {
    return {
      ...error,
      message: 'message' in error ? String(error.message) : undefined,
      details: 'details' in error ? String(error.details) : undefined,
      hint: 'hint' in error ? String(error.hint) : undefined,
      code: 'code' in error ? String(error.code) : undefined,
    }
  }

  return { message: String(error) }
}

function isAnnouncementsTableMissing(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const code = 'code' in error ? String(error.code) : ''
  const message = 'message' in error ? String(error.message) : ''

  return code === 'PGRST205' && message.includes("public.announcements")
}

async function ensureAdminRole() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    throw authError
  }

  if (!user) {
    throw new Error('Unauthorized: User not authenticated')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    throw profileError
  }

  if (profile?.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }

  return { supabase, user }
}

export async function createAnnouncement(
  title: string,
  message: string,
  type: 'info' | 'warning' | 'success' | 'urgent',
  expiresAt?: string
): Promise<Announcement | null> {
  try {
    const { supabase, user } = await ensureAdminRole()

    const { data, error } = await supabase
      .from('announcements')
      .insert([
        {
          title,
          message,
          type,
          created_by: user.id,
          expires_at: expiresAt || null,
          is_active: true,
        },
      ])
      .select()
      .single()

    if (error) throw error

    const { data: recipients } = await supabase
      .from('profiles')
      .select('id')

    await createNotifications(
      supabase,
      (recipients || [])
        .filter((recipient) => recipient.id !== user.id)
        .map((recipient) => ({
          user_id: recipient.id,
          actor_id: user.id,
          title: `Announcement: ${title}`,
          message,
          notification_type: 'announcement_created',
          reference_id: data.id,
          event_key: `announcement:${data.id}:${recipient.id}`,
        }))
    )

    return data
  } catch (err) {
    console.error('Error creating announcement:', serializeError(err))
    return null
  }
}

export async function getAnnouncements(): Promise<Announcement[]> {
  try {
    const { supabase } = await ensureAdminRole()

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      if (isAnnouncementsTableMissing(error)) {
        console.warn(
          'Announcements table is missing. Run supabase/announcements.sql to enable the admin announcements feature.'
        )
        return []
      }

      console.error('Error fetching announcements:', serializeError(error))
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error fetching announcements:', serializeError(err))
    return []
  }
}

export async function updateAnnouncement(
  id: string,
  updates: Partial<Announcement>
): Promise<Announcement | null> {
  try {
    const { supabase } = await ensureAdminRole()

    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (err) {
    console.error('Error updating announcement:', serializeError(err))
    return null
  }
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  try {
    const { supabase } = await ensureAdminRole()

    const { error } = await supabase.from('announcements').delete().eq('id', id)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error deleting announcement:', serializeError(err))
    return false
  }
}

export async function toggleAnnouncementStatus(id: string, isActive: boolean): Promise<boolean> {
  try {
    const { supabase } = await ensureAdminRole()

    const { error } = await supabase
      .from('announcements')
      .update({ is_active: isActive })
      .eq('id', id)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error toggling announcement:', serializeError(err))
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

    if (error) {
      if (isAnnouncementsTableMissing(error)) {
        console.warn(
          'Announcements table is missing. Run supabase/announcements.sql to enable the announcements feature.'
        )
        return []
      }

      console.error('Error fetching active announcements:', serializeError(error))
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error fetching active announcements:', serializeError(err))
    return []
  }
}
