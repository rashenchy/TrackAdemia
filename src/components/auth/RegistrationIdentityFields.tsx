'use client'

import { useState } from 'react'
import { formatStudentNumber, getStudentNumberPattern } from '@/lib/core/student-number'

export function RegistrationIdentityFields() {
  const [studentNumber, setStudentNumber] = useState('')

  return (
    <>
      <input type="hidden" name="role" value="student" />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700">Account Type</label>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3.5 text-sm font-semibold text-blue-800">
          Student account
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-slate-700">Student Number</label>
        <input
          name="studentNumber"
          value={studentNumber}
          onChange={(event) => setStudentNumber(formatStudentNumber(event.target.value))}
          required
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={13}
          pattern={getStudentNumberPattern()}
          placeholder="ATC2023-12345"
          title="Use the format ATC2023-12345."
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-medium uppercase tracking-[0.18em] text-slate-900 outline-none transition-all placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
        <p className="text-xs leading-5 text-slate-500">
          Required format: 3 letters, 4 numbers, a dash, then 5 numbers.
        </p>
      </div>
    </>
  )
}
