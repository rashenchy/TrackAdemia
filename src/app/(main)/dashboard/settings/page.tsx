import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import {
  BellRing,
  BookOpen,
  CircleHelp,
  FolderKanban,
  IdCard,
  LifeBuoy,
  LogIn,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import SettingsNotificationsPreview from '@/components/dashboard/SettingsNotificationsPreview'
import { createClient } from '@/lib/supabase/server'
import {
  ADMIN_VIEW_COOKIE,
  getAdminViewMeta,
  isAdminViewMode,
} from '@/lib/users/admin-view-mode'
import type { UserNotification } from '@/lib/notifications/types'

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
        ? 'Teacher / Adviser'
        : 'Student'
      : profile?.role === 'mentor'
      ? 'Teacher / Adviser'
      : profile?.role === 'admin'
        ? 'Administrator'
        : 'Student'

  const { data: notifications } = await supabase
    .from('user_notifications')
    .select('id, title, message, created_at, is_read, notification_type, reason')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(3)

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

      <section className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
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

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Quick Links</h2>
          <div className="mt-5 space-y-3">
            <ShortcutLink
              href="/dashboard/profile"
              icon={<IdCard size={18} className="text-blue-600" />}
              title="View profile"
              description="See your full account details and academic identity."
            />
            <ShortcutLink
              href="/dashboard/tasks"
              icon={<FolderKanban size={18} className="text-emerald-600" />}
              title="Open task manager"
              description="Catch unresolved work and deadlines faster."
            />
            <ShortcutLink
              href="/dashboard/submit"
              icon={<LogIn size={18} className="text-amber-600" />}
              title="Go to submissions"
              description="Start or continue your research workflow."
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <SettingsNotificationsPreview
          notifications={(notifications || []) as UserNotification[]}
        />

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Helpful Reminders</h2>
          <div className="mt-5 space-y-4">
            <HelpRow
              icon={<BellRing size={18} className="text-blue-600" />}
              title="Keep task notifications enabled"
              description="Your top bar already surfaces updates, so checking tasks regularly helps you catch revisions and new assignments quickly."
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
}: {
  href: string
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
          {icon}
        </div>
        <div>
          <p className="font-semibold text-slate-950">{title}</p>
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
