import type { SupabaseClient } from '@supabase/supabase-js'

type ProfileAccessState = {
  id: string
  role: 'student' | 'mentor' | 'admin'
  is_active: boolean
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
