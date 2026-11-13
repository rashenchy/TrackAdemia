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
  const isAdminPreview = profile.role === 'admin' && Boolean(adminPreviewMode)

  const { data: layoutProfile } = await supabase
    .from('profiles')
    .select('is_verified, first_name, last_name')
    .eq('id', user.id)
    .maybeSingle()

  const initialDisplayName =
    [layoutProfile?.first_name, layoutProfile?.last_name].filter(Boolean).join(' ').trim() ||
    user.email?.split('@')[0] ||
    ''
  const initialIsVerified =
    profile.role === 'admin' || profile.role === 'guest'
      ? true
      : Boolean(layoutProfile?.is_verified)

  return (
    <DashboardLayoutClient
      previewMode={adminPreviewMode}
      previewDisplayName={previewMeta?.displayName}
      previewRole={previewMeta?.role}
      previewIsVerified={previewMeta?.isVerified}
      isAdminPreview={isAdminPreview}
      initialDisplayName={initialDisplayName}
      initialRole={profile.role}
      initialIsVerified={initialIsVerified}
    >
      {children}
    </DashboardLayoutClient>
  )
}
