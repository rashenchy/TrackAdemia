import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import {
  BookOpen,
  ChevronRight,
  FolderKanban,
  IdCard,
  LifeBuoy,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { GeneralNavigation } from './general-navigation'
import {
  ADMIN_VIEW_COOKIE,
  getAdminViewMeta,
  isAdminViewMode,
} from '@/lib/users/admin-view-mode'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, course_program, role, is_verified, student_number')
    .eq('id', user.id)
    .single()

  const cookieStore = await cookies()
  const previewCookie = cookieStore.get(ADMIN_VIEW_COOKIE)?.value
  const adminPreviewMode = isAdminViewMode(previewCookie) ? previewCookie : null
  const previewMeta = adminPreviewMode ? getAdminViewMeta(adminPreviewMode) : null
  const isAdminPreview = profile?.role === 'admin' && Boolean(previewMeta)
  const effectiveRole = isAdminPreview ? previewMeta?.role : profile?.role
  const canViewAdminShortcuts = effectiveRole === 'mentor' || effectiveRole === 'admin'

  const roleLabel =
    isAdminPreview
      ? previewMeta?.role === 'mentor'
        ? 'Faculty / Adviser'
        : 'Student'
      : profile?.role === 'mentor'
        ? 'Faculty / Adviser'
        : profile?.role === 'admin'
          ? 'Faculty Administrator'
          : 'Student'

  return (
    <div className="mx-auto max-w-3xl py-2">
      {/* ── Page Header ── */}
      <div className="mb-10">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">
          Settings
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
          Manage your account and workspace
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
          Account information, preferences, and administration tools.
        </p>
      </div>

      {/* ── ACCOUNT section ── */}
      <div className="mb-10">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Account
        </p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <SettingsInfoRow
            icon={<Mail size={16} className="text-blue-600" />}
            label="Email"
            value={
              isAdminPreview
                ? 'preview@trackademia.local'
                : user.email || 'No email available'
            }
          />
          <SettingsInfoRow
            icon={<ShieldCheck size={16} className="text-emerald-600" />}
            label="Role"
            value={roleLabel}
          />
          <SettingsInfoRow
            icon={<BookOpen size={16} className="text-amber-600" />}
            label="Course / Program"
            value={
              isAdminPreview
                ? 'Preview Program'
                : profile?.course_program || 'Not set'
            }
          />
          <SettingsInfoRow
            icon={<IdCard size={16} className="text-violet-600" />}
            label="Student Number"
            value={
              isAdminPreview
                ? previewMeta?.role === 'student'
                  ? 'ATC2023-12345'
                  : 'Not assigned'
                : profile?.student_number || 'Not assigned'
            }
            last
          />
        </div>
      </div>

      {/* ── ADMINISTRATION section (mentor + admin only) ── */}
      {canViewAdminShortcuts && (
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Administration
          </p>
          <GeneralNavigation>
            <SettingsLinkRow
              href="/dashboard/settings/faculty-approval"
              icon={<ShieldCheck size={16} className="text-emerald-600" />}
              title="Faculty account creation"
              description="Create faculty accounts directly from the admin workspace."
            />
            <SettingsLinkRow
              href="/dashboard/settings/users"
              icon={<IdCard size={16} className="text-violet-600" />}
              title="User management"
              description="Review user accounts, roles, and statuses."
            />
            <SettingsLinkRow
              href="/dashboard/settings/master-records"
              icon={<BookOpen size={16} className="text-amber-600" />}
              title="Master records"
              description="Maintain shared institutional records and reference data."
            />
            <SettingsLinkRow
              href="/dashboard/settings/analytics"
              icon={<BookOpen size={16} className="text-indigo-600" />}
              title="Analytics"
              description="Inspect the system-wide analytics dashboard."
            />
            <SettingsLinkRow
              href="/dashboard/settings/reports"
              icon={<FolderKanban size={16} className="text-blue-600" />}
              title="Reports"
              description="Open reporting and oversight views."
            />
            <SettingsLinkRow
              href="/dashboard/settings/announcements"
              icon={<Mail size={16} className="text-emerald-600" />}
              title="Announcements"
              description="Publish announcements visible throughout the workspace."
            />
            <SettingsLinkRow
              href="/dashboard/settings/api-monitoring"
              icon={<LifeBuoy size={16} className="text-rose-600" />}
              title="API monitoring"
              description="Review usage and health data for connected services."
              last
            />
          </GeneralNavigation>
        </div>
      )}
    </div>
  )
}

/* ── Local components ─────────────────────────────────────────────────── */

function SettingsInfoRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon: ReactNode
  label: string
  value: string
  last?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3.5 ${
        !last ? 'border-b border-slate-100' : ''
      }`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50">
        {icon}
      </div>
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className="ml-auto max-w-[55%] truncate text-right text-sm font-semibold text-slate-900">
        {value}
      </span>
    </div>
  )
}

function SettingsLinkRow({
  href,
  icon,
  title,
  description,
  last = false,
}: {
  href: string
  icon: ReactNode
  title: string
  description: string
  last?: boolean
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/80 ${
        !last ? 'border-b border-slate-100' : ''
      }`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 transition-colors group-hover:bg-white">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{title}</p>
        <p className="truncate text-xs text-slate-500">{description}</p>
      </div>
      <ChevronRight
        size={16}
        className="shrink-0 text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-slate-400"
      />
    </Link>
  )
}
