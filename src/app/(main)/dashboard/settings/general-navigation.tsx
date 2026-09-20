'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronRight, Compass } from 'lucide-react'

export function GeneralNavigation({ children }: { children: ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* Parent header row */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="group flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50/60"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 transition-transform duration-200 group-hover:scale-105">
          <Compass size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">General Navigation</p>
          <p className="text-xs text-slate-500">
            Admin tools, oversight, and system settings
          </p>
        </div>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors group-hover:bg-slate-100">
          <ChevronRight
            size={15}
            className={`text-slate-400 transition-transform duration-300 ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        </div>
      </button>

      {/* Expandable children — indented with left-border accent */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100">
            <div className="ml-5 border-l-2 border-blue-200/60">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
