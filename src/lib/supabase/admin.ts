import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function findAuthUserByEmail(email: string) {
  const adminSupabase = createAdminClient()

  if (!adminSupabase) {
    throw new Error('Admin Supabase client is not configured.')
  }

  const normalizedEmail = email.trim().toLowerCase()
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      throw error
    }

    const matchedUser = data.users.find(
      (user) => user.email?.trim().toLowerCase() === normalizedEmail
    )

    if (matchedUser) {
      return matchedUser
    }

    if (data.users.length < perPage) {
      return null
    }

    page += 1
  }
}
