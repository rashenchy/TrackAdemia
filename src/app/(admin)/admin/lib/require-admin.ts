import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/* =========================================
   REQUIRE ADMIN ACCESS
   - Validates authenticated user
   - Checks if user has admin role
   - Redirects if unauthorized
========================================= */
export async function requireAdminAccess() {

  /* =========================================
     INITIALIZE SUPABASE CLIENT
  ========================================= */
  const supabase = await createClient()

  /* =========================================
     AUTHENTICATION CHECK
     Retrieves current logged-in user
  ========================================= */
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  /* =========================================
     ROLE VALIDATION
     Ensures user has admin privileges
  ========================================= */
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  /* =========================================
     RETURN CONTEXT
     Provides supabase client and user info
  ========================================= */
  return { supabase, user }
}