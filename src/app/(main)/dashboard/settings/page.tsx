import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import {
  BookOpen,
  CircleHelp,
  FolderKanban,
  IdCard,
  LifeBuoy,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
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
          ? 'Faculty Administrator'
          : 'Student'

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#eff6ff_55%,#fff8dc_100%)] p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-blue-700">Settings</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
          Account tools and helpful shortcuts
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          This area now focuses on useful account information and quick actions instead of the duplicate theme switch.
        </p>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Account Snapshot</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <InfoTile
              icon={<Mail size={18} className="text-blue-600" />}
              label="Email"
              value={isAdminPreview ? 'preview@trackademia.local' : user.email || 'No email available'}
            />
            <InfoTile
              icon={<ShieldCheck size={18} className="text-emerald-600" />}
              label="Role"
              value={roleLabel}
            />
            <InfoTile
              icon={<BookOpen size={18} className="text-amber-600" />}
              label="Course / Program"
              value={isAdminPreview ? 'Preview Program' : profile?.course_program || 'Not set'}
            />
            <InfoTile
              icon={<IdCard size={18} className="text-violet-600" />}
              label="Student Number"
              value={
                isAdminPreview
                  ? previewMeta?.role === 'student'
                    ? 'ATC2023-12345'
                    : 'Not assigned'
                  : profile?.student_number || 'Not assigned'
              }
            />
          </div>
        </div>
      </section>

      <div className="mt-4 space-y-4">

        {/* 🔥 USER & ACCESS CONTROL */}
        <ShortcutLink
          href="/dashboard/settings/faculty-approval"
          icon={<ShieldCheck size={18} className="text-emerald-600" />}
          title="Faculty account creation"
          description="Create faculty accounts directly from the admin workspace instead of relying on public registration."
          featured
          accent="emerald"
        />

        <ShortcutLink
          href="/dashboard/settings/users"
          icon={<IdCard size={18} className="text-violet-600" />}
          title="User management"
          description="Review user accounts, roles, and statuses."
          featured
          accent="violet"
        />

        {/* 🧱 CORE SYSTEM DATA */}
        <ShortcutLink
          href="/dashboard/settings/master-records"
          icon={<BookOpen size={18} className="text-amber-600" />}
          title="Master records"
          description="Maintain shared institutional records and reference data."
          featured
          accent="amber"
        />

        {/* 📊 OVERSIGHT */}
        <ShortcutLink
          href="/dashboard/settings/analytics"
          icon={<BookOpen size={18} className="text-indigo-600" />}
          title="Analytics"
          description="Inspect the system-wide analytics dashboard."
          featured
          accent="indigo"
        />

        <ShortcutLink
          href="/dashboard/settings/reports"
          icon={<FolderKanban size={18} className="text-blue-600" />}
          title="Reports"
          description="Open reporting and oversight views for the system."
          featured
          accent="blue"
        />

        {/* 📢 COMMUNICATION */}
        <ShortcutLink
          href="/dashboard/settings/announcements"
          icon={<Mail size={18} className="text-emerald-600" />}
          title="Announcements"
          description="Publish announcements visible throughout the workspace."
          featured
          accent="emerald"
        />

        {/* 🛠 TECHNICAL / LOW PRIORITY */}
        <ShortcutLink
          href="/dashboard/settings/api-monitoring"
          icon={<LifeBuoy size={18} className="text-rose-600" />}
          title="API monitoring"
          description="Review usage and health data for connected services."
          featured
          accent="rose"
        />

      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Helpful Reminders</h2>
          <div className="mt-5 space-y-4">
            <HelpRow
              icon={<BookOpen size={18} className="text-blue-600" />}
              title="Check tasks regularly"
              description="Review your task manager often so revisions, assignments, and feedback do not get missed while notification surfaces are hidden."
            />
            <HelpRow
              icon={<ShieldCheck size={18} className="text-emerald-600" />}
              title="Verification matters for faculty"
              description={
                isAdminPreview
                  ? previewMeta?.role === 'mentor'
                    ? 'In teacher preview, the account is treated as fully verified so faculty-only tools remain visible.'
                    : previewMeta?.isVerified
                      ? 'This preview shows the approved student state with normal student access.'
                      : 'This preview shows the pending student state with the approval hold still active.'
                  : profile?.role === 'mentor' && !profile?.is_verified
                    ? 'Your account is still pending verification. An administrator needs to approve it before full faculty tools unlock.'
                    : 'Your current account status looks good and your access is active.'
              }
            />
            <HelpRow
              icon={<CircleHelp size={18} className="text-amber-600" />}
              title="Profile details stay important"
              description="Accurate names, course information, and student number formatting help keep sections, submissions, and records consistent."
            />
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Need Support?</h2>
          <div className="mt-5 space-y-4">
            <HelpRow
              icon={<LifeBuoy size={18} className="text-blue-600" />}
              title="Start with your profile"
              description="If something looks wrong in your account information, review it in the profile page before continuing with submissions or section work."
            />
            <HelpRow
              icon={<Mail size={18} className="text-emerald-600" />}
              title="Use your account email consistently"
              description="Sticking to one institutional email helps avoid confusion during verification, task assignment, and document tracking."
            />
            <HelpRow
              icon={<BookOpen size={18} className="text-amber-600" />}
              title="Check repository and tasks often"
              description="Those pages give the clearest view of active work, follow-ups, and published outputs tied to your account."
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/85 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        {icon}
        {label}
      </div>
      <p className="mt-2 break-words text-base font-bold text-slate-950">{value}</p>
    </div>
  )
}

function ShortcutLink({
  href,
  icon,
  title,
  description,
  featured = false,
  accent = 'blue',
}: {
  href: string
  icon: ReactNode
  title: string
  description: string
  featured?: boolean
  accent?: 'blue' | 'emerald' | 'violet' | 'amber' | 'indigo' | 'rose'
}) {
  const featuredAccentStyles: Record<
    NonNullable<Parameters<typeof ShortcutLink>[0]['accent']>,
    string
  > = {
    blue:
      'border-blue-200 bg-[radial-gradient(circle_at_right_center,rgba(59,130,246,0.12)_0%,rgba(59,130,246,0.07)_22%,transparent_48%),linear-gradient(120deg,#ffffff_0%,#ffffff_62%,#eff6ff_84%,#dbeafe_100%)] hover:border-blue-300',
    emerald:
      'border-emerald-200 bg-[radial-gradient(circle_at_right_center,rgba(16,185,129,0.12)_0%,rgba(16,185,129,0.07)_22%,transparent_48%),linear-gradient(120deg,#ffffff_0%,#ffffff_62%,#ecfdf5_84%,#d1fae5_100%)] hover:border-emerald-300',
    violet:
      'border-violet-200 bg-[radial-gradient(circle_at_right_center,rgba(139,92,246,0.12)_0%,rgba(139,92,246,0.07)_22%,transparent_48%),linear-gradient(120deg,#ffffff_0%,#ffffff_62%,#f5f3ff_84%,#ede9fe_100%)] hover:border-violet-300',
    amber:
      'border-amber-200 bg-[radial-gradient(circle_at_right_center,rgba(245,158,11,0.12)_0%,rgba(245,158,11,0.07)_22%,transparent_48%),linear-gradient(120deg,#ffffff_0%,#ffffff_62%,#fffbeb_84%,#fef3c7_100%)] hover:border-amber-300',
    indigo:
      'border-indigo-200 bg-[radial-gradient(circle_at_right_center,rgba(99,102,241,0.12)_0%,rgba(99,102,241,0.07)_22%,transparent_48%),linear-gradient(120deg,#ffffff_0%,#ffffff_62%,#eef2ff_84%,#e0e7ff_100%)] hover:border-indigo-300',
    rose:
      'border-rose-200 bg-[radial-gradient(circle_at_right_center,rgba(244,63,94,0.10)_0%,rgba(244,63,94,0.06)_22%,transparent_48%),linear-gradient(120deg,#ffffff_0%,#ffffff_62%,#fff1f2_84%,#ffe4e6_100%)] hover:border-rose-300',
  }

  return (
    <Link
      href={href}
      className={`block rounded-2xl border p-4 transition-all hover:-translate-y-0.5 ${featured
          ? `${featuredAccentStyles[accent]} p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]`
          : 'border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white'
        }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center rounded-xl bg-white shadow-sm ${featured ? 'h-12 w-12' : 'h-10 w-10'
            }`}
        >
          {icon}
        </div>
        <div>
          <p className={`${featured ? 'text-lg font-bold' : 'font-semibold'} text-slate-950`}>
            {title}
          </p>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </Link>
  )
}

function HelpRow({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  )
}
