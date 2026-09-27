import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isFacultyRole } from '@/lib/users/access'
import { getAllLeaderAccessRequests } from '@/lib/research/access-requests/service'
import AccessRequestsClient from './access-requests-client'

export const metadata = {
  title: 'Research Access Requests | TrackAdemia',
  description: 'Manage permissions for peers and guests requesting to access your research manuscripts.',
}

export default async function AccessRequestsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_verified, first_name, last_name')
    .eq('id', user.id)
    .single()

  const isFaculty = isFacultyRole(profile?.role)
  const isStudent = profile?.role === 'student'

  // Access requests are available to students (authors/leaders) and faculty
  if (!isFaculty && !isStudent) {
    redirect('/dashboard')
  }

  const res = await getAllLeaderAccessRequests(user.id, isFaculty)
  const requests = res.data || []

  return (
    <AccessRequestsClient
      initialRequests={requests}
      currentUserId={user.id}
    />
  )
}
