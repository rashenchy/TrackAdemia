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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const cookieStore = await cookies()
  const previewCookie = cookieStore.get(ADMIN_VIEW_COOKIE)?.value
  const adminPreviewMode = isAdminViewMode(previewCookie) ? previewCookie : null

  if (profile?.role === 'admin') {
    if (!adminPreviewMode) {
      redirect('/admin')
    }
  }

  const previewMeta = adminPreviewMode ? getAdminViewMeta(adminPreviewMode) : null

  return (
    <DashboardLayoutClient
      previewMode={adminPreviewMode}
      previewDisplayName={previewMeta?.displayName}
      previewRole={previewMeta?.role}
      previewIsVerified={previewMeta?.isVerified}
      isAdminPreview={profile?.role === 'admin' && Boolean(adminPreviewMode)}
    >
      {children}
    </DashboardLayoutClient>
  )
}
