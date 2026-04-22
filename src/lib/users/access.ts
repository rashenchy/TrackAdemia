import type { SupabaseClient } from '@supabase/supabase-js'

export type AppProfileRole = 'student' | 'mentor' | 'admin'

type ProfileAccessState = {
  id: string
  role: AppProfileRole
  is_active: boolean
}

export function isFacultyRole(role: AppProfileRole | null | undefined) {
  return role === 'mentor' || role === 'admin'
}

export function isElevatedFacultyRole(role: AppProfileRole | null | undefined) {
  return role === 'admin'
}

export async function getProfileAccessState(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileAccessState | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as ProfileAccessState
}
