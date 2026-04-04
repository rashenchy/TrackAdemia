'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import {
  ArrowUpDown,
  Clock3,
  Edit,
  Eye,
  FileText,
  Filter,
  MessageCircle,
  ChevronRight,
} from 'lucide-react'
import type { TeacherSubmissionFilter, TeacherSubmissionRecord, TeacherSubmissionSection } from '@/lib/users/teacher-submissions'

type BasicSubmission = {
  id: string
  title: string
  type?: string | null
  status: string
  created_at: string
  unresolved_feedback_count?: number
  section_name?: string
  author_name?: string
}

type StudentSubmissionBoardProps = {
  submissions: Array<TeacherSubmissionRecord | BasicSubmission>
  sections?: TeacherSubmissionSection[]
  variant?: 'preview' | 'full'
}

type SubmissionSort = 'updated-desc' | 'updated-asc' | 'title-asc' | 'status'

const groupLabels: Record<TeacherSubmissionFilter, string> = {
  all: 'All submissions',
  advisory: 'Advisory classes',
  external: 'External advisory',
}

const statusStyles: Record<string, string> = {
  'Pending Review':
    'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-300',
  Resubmitted:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300',
  Approved:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300',
  Published:
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-300',
  'Revision Requested':
    'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300',
  Rejected:
    'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300',
  Draft:
    'border-slate-200 bg-slate-100 text-slate-700 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300',
}

function formatActivityLabel(submission: TeacherSubmissionRecord) {
  const activityAt = submission.updated_at || submission.created_at
  const prefix =
    submission.updated_at && submission.updated_at !== submission.created_at
      ? 'Updated'
      : 'Submitted'

  return `${prefix} ${new Date(activityAt).toLocaleDateString()}`
}

export function SubmissionsTable({
  submissions,
  sections = [],
  variant = 'full',
}: StudentSubmissionBoardProps) {
  const router = useRouter()
  const isTeacherView = submissions.some((submission) => 'filter_group' in submission)
  const [sectionFilter, setSectionFilter] = useState('all')
  const [groupFilter, setGroupFilter] = useState<TeacherSubmissionFilter>('all')
  const [sortBy, setSortBy] = useState<SubmissionSort>('updated-desc')

  const filteredSubmissions = useMemo(() => {
    if (!isTeacherView) {
      return submissions
    }

    let current = submissions

    if (groupFilter !== 'all') {
      current = current.filter(
        (submission) =>
          'filter_group' in submission && submission.filter_group === groupFilter
      )
    }

    if (sectionFilter !== 'all') {
      current = current.filter(
        (submission) => 'section_id' in submission && submission.section_id === sectionFilter
      )
    }

    current = [...current].sort((left, right) => {
      if (!('updated_at' in left) || !('updated_at' in right)) {
        return 0
      }

      const leftActivity = new Date(left.updated_at || left.created_at).getTime()
      const rightActivity = new Date(right.updated_at || right.created_at).getTime()

      switch (sortBy) {
        case 'updated-asc':
          return leftActivity - rightActivity
        case 'title-asc':
          return left.title.localeCompare(right.title)
        case 'status':
          return left.status.localeCompare(right.status)
        case 'updated-desc':
        default:
          return rightActivity - leftActivity
      }
    })

    return current
  }, [groupFilter, isTeacherView, sectionFilter, sortBy, submissions])

  if (submissions.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-300">
          <FileText size={26} />
        </div>
        <h3 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
          No student submissions yet
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          New student work will show up here once your sections or advisory students submit their
          research manuscripts.
        </p>
      </div>
    )
  }

  if (variant === 'preview') {
    return (
      <div className="grid gap-4">
        {submissions.map((submission) => {
          if (!('filter_group' in submission)) {
            return null
          }

          return (
          <article
            key={submission.id}
            className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-900/40"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:bg-gray-800 dark:text-slate-300">
                    {submission.section_name}
                  </span>
                </div>

                <h3 className="mt-3 text-lg font-bold text-slate-950 dark:text-white">
                  {submission.title}
                </h3>

                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span>{submission.author_name}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 size={12} />
                    {formatActivityLabel(submission)}
                  </span>
                  <span className="capitalize">{submission.type || 'Research'}</span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 dark:bg-gray-800 dark:text-slate-300">
                    {submission.status}
                  </span>
                  {submission.unresolved_feedback_count > 0 && (
                    <span className="rounded-full bg-purple-100 px-2.5 py-1 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                      {submission.unresolved_feedback_count} unresolved comment
                      {submission.unresolved_feedback_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/dashboard/research/${submission.id}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-gray-700 dark:text-slate-200 dark:hover:bg-gray-800"
                >
                  <Eye size={16} />
                  View
                </Link>
                {'filter_group' in submission && (
                  <Link
                    href={`/dashboard/research/${submission.id}/annotate`}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    <MessageCircle size={16} />
                    Feedback
                  </Link>
                )}
              </div>
            </div>
          </article>
          )
        })}
      </div>
    )
  }

  if (!isTeacherView) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-[var(--background)] shadow-sm dark:border-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-800/50">
              <tr>
                <th className="px-6 py-4">Research Title</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {submissions.map((item) => (
                <tr
                  key={item.id}
                  className="transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="max-w-[240px] truncate font-semibold text-gray-900 dark:text-gray-100">
                        {item.title}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock3 size={10} />
                        Submitted {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      {(item.unresolved_feedback_count || 0) > 0 && (
                        <span className="mt-1 inline-flex w-fit items-center gap-1 rounded border border-purple-200 bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                          <MessageCircle size={10} />
                          {item.unresolved_feedback_count} Unresolved Comment
                          {item.unresolved_feedback_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                      {item.type || 'Research'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/dashboard/research/${item.id}`}
                        title="View Details"
                        className="rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-green-600 dark:hover:bg-gray-700"
                      >
                        <Eye size={16} />
                      </Link>
                      <Link
                        href={`/dashboard/research/${item.id}/edit`}
                        title="Edit Submission"
                        className="rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-amber-600 dark:hover:bg-gray-700"
                      >
                        <Edit size={16} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-gray-800">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <Filter size={15} className="text-slate-400" />
              <span className="whitespace-nowrap">Filter submissions</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sectionFilter}
                onChange={(event) => setSectionFilter(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-200"
              >
                <option value="all">All Sections</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
                <option value="advisory-access">Advisory Classes</option>
                <option value="external-advisory">External Advisory</option>
              </select>

            {(Object.keys(groupLabels) as TeacherSubmissionFilter[]).map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => setGroupFilter(group)}
                className={`h-10 rounded-xl border px-3 text-sm font-semibold transition-colors ${
                  groupFilter === group
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-300 dark:hover:bg-blue-950/30'
                }`}
              >
                {groupLabels[group]}
              </button>
            ))}

              <div className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300">
                {
                  submissions.filter(
                    (item) => 'needs_attention' in item && item.needs_attention
                  ).length
                }{' '}
                pending review
              </div>

              <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-200">
                <ArrowUpDown size={14} className="text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SubmissionSort)}
                  className="bg-transparent outline-none"
                >
                  <option value="updated-desc">Latest</option>
                  <option value="updated-asc">Oldest</option>
                  <option value="title-asc">Title</option>
                  <option value="status">Status</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">
              No submissions match those filters
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Try switching the section or advisory filter to inspect another group of students.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50/90 text-xs uppercase tracking-[0.16em] text-slate-500 dark:bg-gray-950/40 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-bold">Title</th>
                  <th className="px-4 py-3 font-bold">Authors</th>
                  <th className="px-4 py-3 font-bold">Section</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Last Updated</th>
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
                {filteredSubmissions.map((submission) => {
                  if (!('filter_group' in submission)) {
                    return null
                  }

                  return (
                    <tr
                      key={submission.id}
                      onClick={() => router.push(`/dashboard/research/${submission.id}`)}
                      className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-gray-950/40"
                    >
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="line-clamp-2 font-semibold leading-5 text-slate-900 dark:text-white">
                              {submission.title}
                            </p>
                            {submission.needs_attention && (
                              <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                                Attention
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="capitalize">{submission.type || 'Research'}</span>
                            <span className="text-slate-300 dark:text-gray-600">•</span>
                            <span className="inline-flex items-center gap-1">
                              Open details
                              <ChevronRight size={12} />
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        <div className="max-w-[220px] leading-5">{submission.author_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium leading-5 text-slate-700 dark:text-slate-200">
                            {submission.section_name}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {groupLabels[submission.filter_group]}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              statusStyles[submission.status] ||
                              'border-slate-200 bg-slate-100 text-slate-700 dark:border-gray-700 dark:bg-gray-800 dark:text-slate-300'
                            }`}
                          >
                            {submission.status}
                          </span>
                          {submission.unresolved_feedback_count > 0 && (
                            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                              {submission.unresolved_feedback_count} unresolved
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        <div className="inline-flex items-center gap-2 leading-5">
                          <Clock3 size={14} className="shrink-0 text-slate-400" />
                          {formatActivityLabel(submission)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex justify-end gap-2"
                          onMouseDown={(event) => event.stopPropagation()}
                        >
                          <Link
                            href={`/dashboard/research/${submission.id}`}
                            onClick={(event) => event.stopPropagation()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-slate-200 dark:hover:bg-gray-800"
                          >
                            <Eye size={16} />
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
