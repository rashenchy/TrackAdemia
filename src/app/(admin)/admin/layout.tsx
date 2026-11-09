import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfileAccessState } from '@/lib/users/access'
import AdminLayoutClient from './layout-client'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await getProfileAccessState(supabase, user.id)

  if (!profile?.is_active || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
