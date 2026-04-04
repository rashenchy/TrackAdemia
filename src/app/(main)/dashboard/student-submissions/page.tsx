import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BellRing } from 'lucide-react'
import { SubmissionsTable } from '@/components/dashboard/SubmissionsTable'
import { getTeacherSubmissionData } from '@/lib/users/teacher-submissions'

export default async function StudentSubmissionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'mentor') {
    redirect('/dashboard')
  }

  const { sections, submissions, attentionCount } = await getTeacherSubmissionData(supabase, user.id)

  return (
    <div className="space-y-8">
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
              Teacher Workspace
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Student Submissions
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              Review every student manuscript tied to your sections, advisory classes, and
              external advisory relationships from one place.
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-100">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]">
              <BellRing size={14} />
              Submission Updates
            </div>
            <p className="mt-2 text-2xl font-black">{attentionCount}</p>
            <p className="mt-1 text-sm opacity-80">
              Submissions with `Resubmitted` or `Pending Review` status need attention.
            </p>
          </div>
        </div>
      </div>

      <SubmissionsTable submissions={submissions} sections={sections} variant="full" />
    </div>
  )
}
