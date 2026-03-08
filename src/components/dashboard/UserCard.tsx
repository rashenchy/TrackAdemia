import { type User } from '@supabase/supabase-js'

// Component that displays basic authenticated user information
export function UserCard({ user }: { user: User | null }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

      {/* Card Title */}
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        User Profile
      </h2>

      {/* User Information Fields */}
      <div className="space-y-3">

        {/* Email Field */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">
            Email
          </label>
          <p className="font-mono text-sm text-gray-700">
            {user?.email}
          </p>
        </div>

        {/* User ID Field */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">
            User ID
          </label>
          <p className="font-mono text-xs text-gray-500 break-all">
            {user?.id}
          </p>
        </div>

        {/* Last Sign-in Date */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase">
            Last Sign In
          </label>
          <p className="text-sm text-gray-700">
            {new Date(user?.last_sign_in_at || '').toLocaleDateString()}
          </p>
        </div>

      </div>
    </div>
  )
}