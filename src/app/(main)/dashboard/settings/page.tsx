import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import {
  BookOpen,
  IdCard,
  Mail,
  ShieldCheck,
  Shield,
  ArrowRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ChangePasswordCard } from '@/components/dashboard/profile/ChangePasswordCard'
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

  const roleLabel =
    isAdminPreview
      ? previewMeta?.role === 'mentor'
        ? 'Faculty / Adviser'
        : 'Student'
      : profile?.role === 'mentor'
        ? 'Faculty / Adviser'
        : profile?.role === 'admin'
          ? 'Administrator'
          : profile?.role === 'proofreader'
            ? 'Proofreader'
            : profile?.role === 'guest'
              ? 'Guest Researcher'
              : 'Student'

  return (
    <div className="mx-auto max-w-3xl py-2">
      {/* ── Page Header ── */}
      <div className="mb-10">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">
          Settings
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          Manage your account and workspace
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Account information, profile details, and preferences.
        </p>
      </div>

      {/* ── ACCOUNT section ── */}
      <div className="mb-8">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Account Information
        </p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm">
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

      {/* ── SECURITY section (All authenticated users) ── */}
      <div className="mb-8">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Security
        </p>
        <ChangePasswordCard disabled={isAdminPreview} />
      </div>

      {/* ── Administrator Workspace Shortcut (Admin only) ── */}
      {profile?.role === 'admin' && (
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/80 to-indigo-50/50 p-6 dark:border-purple-900/40 dark:bg-purple-950/20">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm">
              <Shield size={20} />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Admin Dashboard
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                You are signed in as an administrator. Manage users, master records, system announcements, analytics, and platform operations in the Admin Dashboard.
              </p>
              <div className="mt-4">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
                >
                  Open Admin Dashboard
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
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
        !last ? 'border-b border-slate-100 dark:border-gray-800' : ''
      }`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 dark:bg-gray-800">
        {icon}
      </div>
      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className="ml-auto max-w-[55%] truncate text-right text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </span>
    </div>
  )
}
