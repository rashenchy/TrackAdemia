import { signup } from '../login/actions'
import { PasswordField } from '@/components/auth/PasswordField'
import { SubmitButton } from '@/components/auth/SubmitButton'
import Link from 'next/link'

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>
}) {

  const resolvedSearchParams = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">

      {/* Registration form container */}
      <form
        action={signup}
        className="flex w-full max-w-2xl flex-col gap-4 rounded-xl bg-white p-8 shadow-xl border border-gray-100"
      >

        {/* Page title and short description */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-sm text-gray-500">
            Join the Thesis Tracker platform
          </p>
        </div>

        {/* Displays registration error messages returned from the signup action */}
        {resolvedSearchParams.error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
            {resolvedSearchParams.error}
          </div>
        )}

        {/* User role selection determines system permissions (student or mentor) */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">
            I am a:
          </label>

          <select
            name="role"
            required
            className="rounded-lg border border-gray-300 p-2.5 bg-white focus:border-blue-600 outline-none cursor-pointer"
          >
            <option value="student">Student</option>
            <option value="mentor">Teacher / Adviser</option>
          </select>
        </div>

        {/* Name fields grouped into a responsive grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              First Name
            </label>

            <input
              name="firstName"
              required
              className="rounded-lg border border-gray-300 p-2.5 focus:border-blue-600 outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Middle Name
            </label>

            <input
              name="middleName"
              placeholder="(Optional)"
              className="rounded-lg border border-gray-300 p-2.5 focus:border-blue-600 outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-700">
              Last Name
            </label>

            <input
              name="lastName"
              required
              className="rounded-lg border border-gray-300 p-2.5 focus:border-blue-600 outline-none"
            />
          </div>

        </div>

        {/* Email input used as the primary authentication identifier */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">
            Email
          </label>

          <input
            name="email"
            type="email"
            required
            placeholder="name@university.edu"
            className="rounded-lg border border-gray-300 p-2.5 focus:border-blue-600 outline-none"
          />
        </div>

        {/* Academic program or course information for the user */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">
            Course/Program
          </label>

          <input
            name="course"
            required
            placeholder="e.g. BSIT"
            className="rounded-lg border border-gray-300 p-2.5 focus:border-blue-600 outline-none"
          />
        </div>

        {/* Password field component with built-in visibility toggle */}
        <PasswordField
          name="password"
          label="Password"
        />

        {/* Submit button for creating the account */}
        <SubmitButton
          className="w-full bg-blue-600 text-white rounded-lg py-2.5 mt-2 font-medium hover:bg-blue-700 transition-all"
        >
          Register
        </SubmitButton>

        {/* Navigation link for users who already have an account */}
        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-blue-600 hover:underline font-semibold"
          >
            Sign In
          </Link>
        </p>

      </form>

    </div>
  )
}