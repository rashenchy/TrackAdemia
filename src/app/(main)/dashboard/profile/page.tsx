import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  BadgeCheck,
  BookOpen,
  GraduationCap,
  IdCard,
  Mail,
  Settings,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, middle_name, last_name, course_program, role, is_verified, student_number')
    .eq('id', user.id)
    .single()

  const fullName = [profile?.first_name, profile?.middle_name, profile?.last_name]
    .filter(Boolean)
    .join(' ')

  const roleLabel =
    profile?.role === 'mentor'
      ? 'Teacher / Adviser'
      : profile?.role === 'admin'
        ? 'Administrator'
        : 'Student'

  const statusLabel =
    profile?.role === 'mentor'
      ? profile?.is_verified
        ? 'Verified faculty account'
        : 'Pending faculty verification'
      : 'Active account'

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_45%,#fff7d6_100%)] shadow-sm">
        <div className="grid gap-6 px-6 py-8 md:grid-cols-[auto,1fr] md:px-8">
          <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-slate-950 text-white shadow-lg">
            <UserCircle2 size={54} />
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-700">
                Profile
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                {fullName || 'User Profile'}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Review your account details, role access, and academic information in one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm">
                <BadgeCheck size={16} className="text-blue-600" />
                {roleLabel}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-semibold text-slate-700 shadow-sm">
                <ShieldCheck size={16} className="text-emerald-600" />
                {statusLabel}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr,0.95fr]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Account Details</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ProfileCard
              icon={<Mail size={18} className="text-blue-600" />}
              label="Email"
              value={user.email || 'No email available'}
            />
            <ProfileCard
              icon={<GraduationCap size={18} className="text-blue-600" />}
              label="Course / Program"
              value={profile?.course_program || 'Not set'}
            />
            <ProfileCard
              icon={<IdCard size={18} className="text-blue-600" />}
              label="Student Number"
              value={profile?.student_number || 'Not assigned'}
            />
            <ProfileCard
              icon={<BadgeCheck size={18} className="text-blue-600" />}
              label="Role"
              value={roleLabel}
            />
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">Quick Actions</h2>
          <div className="mt-5 space-y-3">
            <QuickLink
              href="/dashboard/settings"
              icon={<Settings size={18} className="text-amber-600" />}
              title="Open settings"
              description="Review your account tools, session info, and helpful shortcuts."
            />
            <QuickLink
              href="/dashboard/tasks"
              icon={<BookOpen size={18} className="text-blue-600" />}
              title="Check task manager"
              description="See active tasks, unresolved items, and ongoing work."
            />
            <QuickLink
              href="/dashboard/submit"
              icon={<GraduationCap size={18} className="text-emerald-600" />}
              title="Go to submissions"
              description="Start a new research submission or continue your workflow."
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function ProfileCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        {icon}
        {label}
      </div>
      <p className="mt-2 break-words text-base font-bold text-slate-950">{value}</p>
    </div>
  )
}

function QuickLink({
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
