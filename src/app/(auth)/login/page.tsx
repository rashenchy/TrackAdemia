import { login } from './actions'
import { PasswordField } from '@/components/auth/PasswordField'
import { SubmitButton } from '@/components/auth/SubmitButton'
import Link from 'next/link'

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string, error?: string }>
}) {

  const resolvedSearchParams = await searchParams

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">

      {/* Login form container centered on the page */}
      <form
        action={login}
        className="flex w-full max-w-md flex-col gap-4 rounded-xl bg-white p-8 shadow-xl border border-gray-100"
      >

        {/* Application title and short description */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Thesis Tracker</h1>
          <p className="text-sm text-gray-500">
            Sign in to manage your research
          </p>
        </div>

        {/* Displays a success notification (e.g., after successful registration) */}
        {resolvedSearchParams.success && (
          <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg">
            {resolvedSearchParams.success}
          </div>
        )}

        {/* Displays an error notification (e.g., invalid login credentials) */}
        {resolvedSearchParams.error && (
          <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
            {resolvedSearchParams.error}
          </div>
        )}

        {/* Email input field used for Supabase authentication */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700">
            Email Address
          </label>

          <input
            name="email"
            type="email"
            placeholder="student@university.edu"
            required
            className="rounded-lg border border-gray-300 p-2.5 focus:border-blue-600 outline-none"
          />
        </div>

        {/* Reusable password field component with visibility toggle */}
        <PasswordField
          name="password"
          label="Password"
        />

        {/* Submit button and navigation link to the registration page */}
        <div className="flex flex-col gap-3 pt-4">

          <SubmitButton
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            Sign In
          </SubmitButton>

          <p className="text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              href="/register"
              className="text-blue-600 font-semibold hover:underline"
            >
              Register here
            </Link>
          </p>

        </div>

      </form>

    </div>
  )
}