import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileAccessState, isFacultyRole } from '@/lib/users/access'

export async function requireAdminAccess() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getProfileAccessState(supabase, user.id)

  if (!profile || !profile.is_active || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return { supabase, user }
}

export async function requireFacultyAccess() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getProfileAccessState(supabase, user.id)

  if (!profile || !profile.is_active || !isFacultyRole(profile.role)) {
    redirect('/dashboard')
  }

  return { supabase, user, profile }
}
