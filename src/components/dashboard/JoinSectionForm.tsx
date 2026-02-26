'use client'

import { useActionState } from 'react'
import { joinSection } from '@/app/(main)/dashboard/sections/actions'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { GraduationCap, Hash, CheckCircle2, AlertCircle } from 'lucide-react'

export function JoinSectionForm() {
  const [state, formAction] = useActionState(joinSection, null)

  return (
    <div className="bg-[var(--background)] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <GraduationCap className="text-purple-600" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold">Join a Section</h2>
          <p className="text-xs text-gray-500">Enter the 6-character code provided by your teacher.</p>
        </div>
      </div>

      {state?.success && (
        <div className="flex items-center gap-2 p-4 mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} />
          {state.success}
        </div>
      )}

      {state?.error && (
        <div className="flex items-center gap-2 p-4 mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={18} />
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold uppercase text-gray-500">Section Join Code</label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              name="joinCode"
              required
              maxLength={6}
              placeholder="e.g. AB12CD"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-3 pl-10 bg-transparent text-[var(--foreground)] font-mono tracking-widest uppercase focus:border-blue-600 outline-none transition-all"
            />
          </div>
        </div>

        <SubmitButton className="w-full bg-blue-600 text-white rounded-lg py-3 font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none">
          Join Section
        </SubmitButton>
      </form>
    </div>
  )
}