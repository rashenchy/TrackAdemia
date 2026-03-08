'use client'

import { FileText, Clock, Eye, Edit, MessageCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'

// Table component used to display research submissions for both students and teachers
export function SubmissionsTable({ submissions }: { submissions: any[] }) {

  // Empty state if there are no submissions
  if (submissions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-12 flex flex-col items-center justify-center text-gray-400 gap-3 bg-gray-50/50 dark:bg-gray-900/20">
        <FileText size={40} className="opacity-20" />
        <div className="text-center">
          <p className="font-medium text-gray-500">No research entries found</p>
          <p className="text-xs">Start by clicking "Submit Research" in the sidebar.</p>
        </div>
      </div>
    )
  }

  // Detect whether the table is being used in teacher view
  const isTeacherView = submissions.some(s => s.section_name !== undefined)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-[var(--background)] shadow-sm">
      <div className="overflow-x-auto">

        {/* Research Submissions Table */}
        <table className="w-full text-left text-sm">

          {/* Table Header */}
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 font-medium">
            <tr>
              <th className="px-6 py-4">Research Title</th>
              {isTeacherView && <th className="px-6 py-4">Class & Author</th>}
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">

            {submissions.map((item) => (

              <tr
                key={item.id}
                className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
              >

                {/* Research Title & Metadata */}
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1 items-start">

                    <span className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[240px]">
                      {item.title}
                    </span>

                    {/* Submission Date */}
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Clock size={10} />
                      Submitted {new Date(item.created_at).toLocaleDateString()}
                    </span>

                    {/* Unresolved Feedback Badge */}
                    {item.unresolved_feedback_count > 0 && (
                      <span className="mt-1 w-fit inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                        <MessageCircle size={10} />
                        {item.unresolved_feedback_count} Unresolved Comment{item.unresolved_feedback_count !== 1 ? 's' : ''}
                      </span>
                    )}

                    {/* Teacher Alert when a student resubmits */}
                    {item.status === 'Resubmitted' && isTeacherView && (
                      <span className="mt-1 w-fit inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        <AlertCircle size={10} />
                        Student Have Resubmitted This Research - Please Review
                      </span>
                    )}

                  </div>
                </td>

                {/* Class and Author Information (Teacher View Only) */}
                {isTeacherView && (
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">

                      <span className="font-semibold text-gray-800 dark:text-gray-200 text-xs">
                        {item.section_name || 'Unassigned'}
                      </span>

                      <span className="text-[11px] text-gray-500">
                        By: {item.author_name || 'Unknown'}
                      </span>

                    </div>
                  </td>
                )}

                {/* Research Type */}
                <td className="px-6 py-4">
                  <span className="capitalize px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold tracking-wider">
                    {item.type}
                  </span>
                </td>

                {/* Status Indicator */}
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium 
                       ${item.status === 'Published' ? 'text-purple-600 font-bold' :
                      item.status === 'Resubmitted' ? 'text-blue-600 font-black' :
                        item.status === 'Draft' ? 'text-gray-500' :
                          item.status === 'Approved' ? 'text-green-600' :
                            item.status === 'Revision Requested' ? 'text-amber-600 font-bold' :
                              item.status === 'Rejected' ? 'text-red-600' :
                                'text-blue-600'}`}
                  >

                    {/* Status Dot */}
                    <span
                      className={`h-1.5 w-1.5 rounded-full 
                        ${item.status === 'Published' ? 'bg-purple-600' :
                        item.status === 'Resubmitted' ? 'bg-blue-600 animate-pulse' :
                          item.status === 'Draft' ? 'bg-gray-400' :
                            item.status === 'Approved' ? 'bg-green-600' :
                              item.status === 'Revision Requested' ? 'bg-amber-600' :
                                item.status === 'Rejected' ? 'bg-red-600' :
                                  'bg-blue-600'}`}
                    />

                    {item.status}

                  </span>
                </td>

                {/* Action Buttons */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">

                    {/* View Submission */}
                    <Link
                      href={`/dashboard/research/${item.id}`}
                      title="View Details"
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-green-600 transition-all"
                    >
                      <Eye size={16} />
                    </Link>

                    {/* Edit Submission (Students Only) */}
                    {!isTeacherView && (
                      <Link
                        href={`/dashboard/research/${item.id}/edit`}
                        title="Edit Submission"
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-amber-600 transition-all"
                      >
                        <Edit size={16} />
                      </Link>
                    )}

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