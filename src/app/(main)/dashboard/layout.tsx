import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardLayoutClient from './layout-client'
import { cookies } from 'next/headers'
import {
  ADMIN_VIEW_COOKIE,
  getAdminViewMeta,
  isAdminViewMode,
} from '@/lib/users/admin-view-mode'

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

  const [{ data: userProfile }, cookieStore] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, role, is_active, is_verified, first_name, last_name')
      .eq('id', user.id)
      .maybeSingle(),
    cookies(),
  ])

  if (!userProfile?.is_active) {
    await supabase.auth.signOut()
    redirect('/login?error=' + encodeURIComponent('This account has been deactivated. Please contact an administrator.'))
  }

  const previewCookie = cookieStore.get(ADMIN_VIEW_COOKIE)?.value
  const adminPreviewMode = isAdminViewMode(previewCookie) ? previewCookie : null

  const previewMeta = adminPreviewMode ? getAdminViewMeta(adminPreviewMode) : null
  const isAdminPreview = userProfile.role === 'admin' && Boolean(adminPreviewMode)

  const initialDisplayName =
    [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ').trim() ||
    user.email?.split('@')[0] ||
    ''
  const initialIsVerified =
    userProfile.role === 'admin' || userProfile.role === 'guest'
      ? true
      : Boolean(userProfile.is_verified)

  return (
    <DashboardLayoutClient
      previewMode={adminPreviewMode}
      previewDisplayName={previewMeta?.displayName}
      previewRole={previewMeta?.role}
      previewIsVerified={previewMeta?.isVerified}
      isAdminPreview={isAdminPreview}
      initialDisplayName={initialDisplayName}
      initialRole={userProfile.role}
      initialIsVerified={initialIsVerified}
    >
      {children}
    </DashboardLayoutClient>
  )
}
