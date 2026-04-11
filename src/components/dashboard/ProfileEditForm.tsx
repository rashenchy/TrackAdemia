'use client'

import { useActionState, useState } from 'react'
import { CheckCircle2, Edit3, Eye, EyeOff, Info, KeyRound, X } from 'lucide-react'
import { SubmitButton } from '@/components/auth/SubmitButton'
import {
  changePassword,
  type ChangePasswordState,
  type UpdateProfileState,
  updateProfile,
} from '@/app/(main)/dashboard/profile/actions'

type ProfileEditFormProps = {
  initialValues: {
    firstName: string
    middleName: string
    lastName: string
    courseProgram: string
    studentNumber: string
  }
  disabled?: boolean
  showStudentNumber?: boolean
}

const initialState: UpdateProfileState = {}
const initialPasswordState: ChangePasswordState = {}

export function ProfileEditForm({
  initialValues,
  disabled = false,
  showStudentNumber = true,
}: ProfileEditFormProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [profileState, profileFormAction] = useActionState(updateProfile, initialState)
  const [passwordState, passwordFormAction] = useActionState(
    changePassword,
    initialPasswordState
  )

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Editable Profile Info</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Keep your identity details current so sections, submissions, and records stay accurate.
          </p>
        </div>

        {!disabled && (
          <button
            type="button"
            onClick={() => setIsEditing((current) => !current)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white"
          >
            {isEditing ? <X size={16} /> : <Edit3 size={16} />}
            {isEditing ? 'Close Editor' : 'Edit Profile'}
          </button>
        )}
      </div>

      {disabled ? (
        <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
          Profile editing is disabled while admin preview mode is active.
        </div>
      ) : isEditing ? (
        <div className="mt-5 space-y-6">
          <form action={profileFormAction} className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
            <div>
              <h3 className="text-base font-bold text-slate-950">Edit profile details</h3>
              <p className="mt-1 text-sm text-slate-600">
                Update the information shown across your account and academic records.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ProfileInput label="First Name" name="firstName" defaultValue={initialValues.firstName} required />
              <ProfileInput label="Middle Name" name="middleName" defaultValue={initialValues.middleName} />
              <ProfileInput label="Last Name" name="lastName" defaultValue={initialValues.lastName} required />
              <ProfileInput label="Course / Program" name="courseProgram" defaultValue={initialValues.courseProgram} required />
              {showStudentNumber && (
                <ProfileInput
                  label="Student Number"
                  name="studentNumber"
                  defaultValue={initialValues.studentNumber}
                  helper="Use the format ATC2023-12345."
                />
              )}
            </div>

            {profileState.error && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                <Info size={16} />
                {profileState.error}
              </div>
            )}

            {profileState.success && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                <CheckCircle2 size={16} />
                {profileState.success}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
                Save Changes
              </SubmitButton>
              {showStudentNumber && (
                <span className="text-xs text-slate-500">
                  Student number must follow `ATC2023-12345` if provided.
                </span>
              )}
            </div>
          </form>

          <form action={passwordFormAction} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-950">Change password</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Enter your current password to verify your identity before setting a new one.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ProfilePasswordInput
                label="Current Password"
                name="currentPassword"
                autoComplete="current-password"
              />
              <div className="hidden md:block" />
              <ProfilePasswordInput
                label="New Password"
                name="newPassword"
                autoComplete="new-password"
                helper="Use at least 8 characters with uppercase, lowercase, and a number."
              />
              <ProfilePasswordInput
                label="Confirm New Password"
                name="confirmPassword"
                autoComplete="new-password"
              />
            </div>

            {passwordState.error && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                <Info size={16} />
                {passwordState.error}
              </div>
            )}

            {passwordState.success && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                <CheckCircle2 size={16} />
                {passwordState.success}
              </div>
            )}

            <SubmitButton className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">
              Update Password
            </SubmitButton>
          </form>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
          Open the editor to update your profile details and change your password.
        </div>
      )}
    </div>
  )
}

function ProfileInput({
  label,
  name,
  defaultValue,
  helper,
  required = false,
}: {
  label: string
  name: string
  defaultValue: string
  helper?: string
  required?: boolean
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
      />
      {helper && <span className="mt-2 block text-xs text-slate-500">{helper}</span>}
    </label>
  )
}

function ProfilePasswordInput({
  label,
  name,
  autoComplete,
  helper,
}: {
  label: string
  name: string
  autoComplete: string
  helper?: string
}) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <div className="relative mt-2">
        <input
          type={showPassword ? 'text' : 'password'}
          name={name}
          autoComplete={autoComplete}
          required
          minLength={8}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-11 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500"
        />
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {helper && <span className="mt-2 block text-xs text-slate-500">{helper}</span>}
    </label>
  )
}
