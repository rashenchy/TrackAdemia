import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayoutClient from './layout-client'
import { cookies } from 'next/headers'
import {
  ADMIN_VIEW_COOKIE,
  getAdminViewMeta,
  isAdminViewMode,
} from '@/lib/users/admin-view-mode'
import { getProfileAccessState } from '@/lib/users/access'

export default async function DashboardLayout({
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

  if (!profile?.is_active) {
    await supabase.auth.signOut()
    redirect('/login?error=' + encodeURIComponent('This account has been deactivated. Please contact an administrator.'))
  }

  const cookieStore = await cookies()
  const previewCookie = cookieStore.get(ADMIN_VIEW_COOKIE)?.value
  const adminPreviewMode = isAdminViewMode(previewCookie) ? previewCookie : null

  const previewMeta = adminPreviewMode ? getAdminViewMeta(adminPreviewMode) : null

  return (
    <DashboardLayoutClient
      previewMode={adminPreviewMode}
      previewDisplayName={previewMeta?.displayName}
      previewRole={previewMeta?.role}
      previewIsVerified={previewMeta?.isVerified}
      isAdminPreview={profile.role === 'admin' && Boolean(adminPreviewMode)}
    >
      {children}
    </DashboardLayoutClient>
  )
}
