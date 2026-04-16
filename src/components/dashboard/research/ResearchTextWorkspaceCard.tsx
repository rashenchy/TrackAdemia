'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Edit3 } from 'lucide-react'
import { ResearchDocumentSections } from '@/components/dashboard/research/ResearchDocumentSections'
import type { ResearchDocumentContent } from '@/lib/research/document'

export function ResearchTextWorkspaceCard({
  content,
  workspaceHref,
  canEnterWorkspace,
}: {
  content: ResearchDocumentContent
  workspaceHref: string
  canEnterWorkspace: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">Research Text</p>
            <p className="mt-1 text-xs leading-6 text-slate-600">
              Open the text preview only when you need it, then jump straight into the review workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded((current) => !current)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {isExpanded ? 'Hide text' : 'Show text'}
            </button>
            {canEnterWorkspace ? (
              <Link
                href={workspaceHref}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
              >
                <Edit3 size={16} />
                Enter Workspace
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <ResearchDocumentSections content={content} />
          {canEnterWorkspace ? (
            <div className="mt-5 flex justify-end border-t border-gray-100 pt-4 dark:border-gray-800">
              <Link
                href={workspaceHref}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700"
              >
                <Edit3 size={16} />
                Enter Workspace
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
