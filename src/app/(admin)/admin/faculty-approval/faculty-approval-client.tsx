'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { ShieldPlus, Loader2, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react'
import { createFacultyAccount } from './actions'
import { usePopup } from '@/components/ui/PopupProvider'
import { ALLOWED_COURSE_PROGRAMS } from '@/lib/core/course-programs'

export default function FacultyApprovalClient() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { notify } = usePopup()

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    const result = await createFacultyAccount(formData)

    if (result.success) {
      const firstName = String(formData.get('firstName') || '').trim()
      const lastName = String(formData.get('lastName') || '').trim()
      const fullName = [firstName, lastName].filter(Boolean).join(' ')
      const message = `${fullName || 'Faculty user'} account created successfully.`

      setSuccessMessage(message)
      notify({
        title: 'Faculty account created',
        message: 'The new faculty user can now sign in with the assigned credentials.',
        variant: 'success',
      })
    } else {
      setErrorMessage(result.error || 'Unable to create the faculty account.')
      notify({
        title: 'Faculty account creation failed',
        message: result.error || 'Unable to create the faculty account.',
        variant: 'error',
      })
    }

    setIsSubmitting(false)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="rounded-[2rem] border border-blue-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_52%,#fff4cc_100%)] p-7 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
            <ShieldPlus size={28} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-blue-700">
              Faculty Account Creation
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              Create faculty access directly from admin settings
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Public registration is now reserved for students. Use this workspace to create mentor accounts immediately without database edits or a separate approval pass.
            </p>
          </div>
        </div>
      </section>

      {successMessage && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <form
          action={handleSubmit}
          className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ShieldPlus size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950">New Faculty Account</h2>
              <p className="text-sm leading-6 text-slate-600">
                Fill in the teacher&apos;s information and create the account in one step.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5">
            <div className="grid gap-5 md:grid-cols-3">
              <Field label="First Name" name="firstName" required />
              <Field label="Middle Name" name="middleName" placeholder="Optional" />
              <Field label="Last Name" name="lastName" required />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Email"
                name="email"
                type="email"
                required
                placeholder="teacher@school.edu"
              />
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Course / Program</label>
                <select
                  name="course"
                  required
                  defaultValue=""
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="" disabled>
                    Select course program
                  </option>
                  {ALLOWED_COURSE_PROGRAMS.map((program) => (
                    <option key={program} value={program}>
                      {program}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-[1fr,0.85fr]">
              <Field
                label="Temporary Password"
                name="password"
                type="password"
                required
                placeholder="At least 8 characters"
              />
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-slate-700">Role</label>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-semibold text-emerald-800">
                  Faculty / Adviser
                </div>
                <p className="text-xs leading-5 text-slate-500">
                  Accounts created here are immediately assigned to the mentor role.
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <ShieldPlus size={18} />}
            {isSubmitting ? 'Creating account...' : 'Create Faculty Account'}
          </button>
        </form>

        <aside className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">What Happens Next</h2>
          <div className="mt-5 space-y-4">
            <InfoCard
              icon={<ShieldPlus size={18} className="text-blue-700" />}
              title="Immediate mentor access"
              description="The account is created directly as a faculty member, so there is no extra approval queue for this user."
            />
            <InfoCard
              icon={<KeyRound size={18} className="text-amber-700" />}
              title="Share the temporary password securely"
              description="Give the initial password to the teacher privately and encourage them to change it after the first sign in."
            />
            <InfoCard
              icon={<CheckCircle2 size={18} className="text-emerald-700" />}
              title="Cleaner admin workflow"
              description="This replaces manual database edits and keeps faculty onboarding inside the normal dashboard settings flow."
            />
          </div>
        </aside>
      </section>
    </div>
  )
}

function Field({
  label,
  name,
  type = 'text',
  required = false,
  placeholder,
}: {
  label: string
  name: string
  type?: string
  required?: boolean
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </div>
  )
}

function InfoCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/85 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
          {icon}
        </div>
        <p className="font-semibold text-slate-950">{title}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}
