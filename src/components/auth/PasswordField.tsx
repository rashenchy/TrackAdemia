'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react' // Import the icons

export function PasswordField({ name, label, placeholder = "••••••••" }: { name: string, label: string, placeholder?: string }) {
  const [show, setShow] = useState(false)

  return (
    <div className="flex flex-col gap-1 relative">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        <input 
          name={name} 
          type={show ? "text" : "password"} 
          placeholder={placeholder}
          required 
          minLength={8}
          pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$"
          title="Must contain at least one uppercase letter, one lowercase letter, and one number."
          className="w-full rounded-lg border border-gray-300 p-2.5 pr-10 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
        />
        <button 
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {/* Toggle between Eye and EyeOff icons instead of text */}
          {show ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  )
}