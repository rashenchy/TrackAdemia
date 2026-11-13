'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  ExternalLink,
  Trash2,
} from 'lucide-react'
import { createTask, deleteTask, editTask } from '@/app/(main)/dashboard/tasks/actions'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { TaskResolveButton } from '@/components/dashboard/tasks/TaskResolveButton'
import { appendFromParam } from '@/lib/navigation'

export type StudentTaskFilter = 'unresolved' | 'resolved' | 'all'
export type StudentTaskSource = 'teacher' | 'personal' | 'annotation'

export type StudentTaskItem = {
  id: string
  title: string
  description: string | null
  created_at: string
  status: string
  source: StudentTaskSource
  due_date?: string | null
  research_id?: string
  research_title?: string
  quote?: string | null
}

type StudentTaskManagerClientProps = {
  tasks: StudentTaskItem[]
  annotationResolveReasons: Record<string, string | null>
  initialFilter: StudentTaskFilter
  initialPage: number
  pageSize: number
  initialEditTaskId?: string | null
}

function buildTasksUrl(filter: StudentTaskFilter, page: number) {
  const params = new URLSearchParams()
  if (filter !== 'unresolved') {
    params.set('filter', filter)
  }
  if (page > 1) {
    params.set('page', String(page))
  }
  const query = params.toString()
  return query ? `/dashboard/tasks?${query}` : '/dashboard/tasks'
}

export function StudentTaskManagerClient({
  tasks,
  annotationResolveReasons,
  initialFilter,
  initialPage,
  pageSize,
  initialEditTaskId = null,
}: StudentTaskManagerClientProps) {
  const [activeFilter, setActiveFilter] = useState<StudentTaskFilter>(initialFilter)
  const [currentPage, setCurrentPage] = useState<number>(initialPage)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(initialEditTaskId)

  const syncUrl = (nextFilter: StudentTaskFilter, nextPage: number) => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', buildTasksUrl(nextFilter, nextPage))
    }
  }

  const handleFilterChange = (nextFilter: StudentTaskFilter) => {
    if (nextFilter === activeFilter) return
    setActiveFilter(nextFilter)
    setCurrentPage(1)
    setEditingTaskId(null)
    syncUrl(nextFilter, 1)
  }

  const handlePageChange = (nextPage: number) => {
    if (nextPage === currentPage || nextPage < 1 || nextPage > totalPages) return
    setCurrentPage(nextPage)
    syncUrl(activeFilter, nextPage)
  }

  const {
    totalTasks,
    completedCount,
    progressPercentage,
    teacherTasksCount,
    filteredTasks,
    totalPages,
    safePage,
    pagedTasks,
  } = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === 'resolved').length
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0
    const teacherCount = tasks.filter(
      (t) => t.source === 'teacher' || t.source === 'annotation'
    ).length
    const filtered =
      activeFilter === 'all' ? tasks : tasks.filter((t) => t.status === activeFilter)
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
    const clampedPage = Math.min(Math.max(1, currentPage), pages)
    const paged = filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize)

    return {
      totalTasks: total,
      completedCount: completed,
      progressPercentage: progress,
      teacherTasksCount: teacherCount,
      filteredTasks: filtered,
      totalPages: pages,
      safePage: clampedPage,
      pagedTasks: paged,
    }
  }, [tasks, activeFilter, currentPage, pageSize])

  const pageNumbers = useMemo(() => {
    const startPage = Math.max(1, safePage - 2)
    const endPage = Math.min(totalPages, startPage + 4)
    const adjustedStart = Math.max(1, endPage - 4)
    return Array.from(
      { length: endPage - adjustedStart + 1 },
      (_, index) => adjustedStart + index
    )
  }, [safePage, totalPages])

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
            Task Manager
          </h1>
          <p className="text-gray-500 mt-1">
            Track assignments from teachers and your personal to-do list.
          </p>
        </div>

        {/* Filter Toggles */}
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
          {(['unresolved', 'resolved', 'all'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => handleFilterChange(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                activeFilter === f
                  ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Overall Progress
          </span>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-4xl font-black text-blue-600">{progressPercentage}%</span>
            <span className="text-sm text-gray-400 mb-1">completed</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Assigned by Teachers
          </span>
          <div className="flex items-center gap-3 mt-2">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600">
              <BookOpen size={24} />
            </div>
            <span className="text-3xl font-black text-gray-900 dark:text-gray-100">
              {teacherTasksCount}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Completion Ratio
          </span>
          <p className="text-3xl font-black text-gray-900 dark:text-gray-100 mt-2">
            {completedCount}
            <span className="text-gray-400 text-lg font-medium">/{totalTasks}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">Total tasks in list</p>
        </div>
      </div>

      {/* Personal Task Form */}
      {activeFilter !== 'resolved' && !editingTaskId && (
        <form
          action={createTask}
          className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row gap-4"
        >
          <div className="flex-1 space-y-2">
            <input
              name="title"
              required
              placeholder="New personal task..."
              className="w-full bg-transparent border-none text-lg font-semibold outline-none focus:ring-0 text-[var(--foreground)]"
            />
            <input
              name="description"
              placeholder="Add details..."
              className="w-full bg-transparent border-none text-sm text-gray-500 outline-none focus:ring-0"
            />
          </div>
          <SubmitButton className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 h-fit self-end shadow-lg shadow-blue-200 dark:shadow-none">
            Add Task
          </SubmitButton>
        </form>
      )}

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl text-gray-400">
            <AlertCircle size={48} className="mx-auto mb-4 opacity-10" />
            <p className="font-medium text-lg capitalize">No {activeFilter} tasks found.</p>
            <p className="text-sm">Everything looks organized!</p>
          </div>
        ) : (
          pagedTasks.map((task) => {
            if (task.id === editingTaskId && task.source === 'personal') {
              return (
                <form
                  key={task.id}
                  action={editTask}
                  className="group flex flex-col items-start gap-4 p-5 rounded-2xl border bg-white dark:bg-gray-900 border-blue-300 shadow-md"
                >
                  <input type="hidden" name="taskId" value={task.id} />
                  <div className="flex-1 w-full space-y-3">
                    <input
                      name="title"
                      defaultValue={task.title}
                      required
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 font-bold outline-none focus:border-blue-500 text-[var(--foreground)]"
                      placeholder="Task Title"
                    />
                    <textarea
                      name="description"
                      defaultValue={task.description || ''}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 resize-none text-[var(--foreground)]"
                      placeholder="Task details..."
                      rows={2}
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingTaskId(null)}
                        className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 text-sm transition-colors"
                      >
                        Cancel
                      </button>
                      <SubmitButton className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 text-sm shadow-sm">
                        Save Changes
                      </SubmitButton>
                    </div>
                  </div>
                </form>
              )
            }

            const resolveReason =
              task.source === 'annotation' ? annotationResolveReasons[task.id] ?? null : null

            return (
              <div
                key={task.id}
                className={`group flex items-start gap-4 p-5 rounded-2xl border transition-all hover:shadow-md ${
                  task.status === 'resolved'
                    ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 opacity-60'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm hover:border-blue-300'
                }`}
              >
                <TaskResolveButton
                  taskId={task.id}
                  currentStatus={task.status}
                  source={task.source}
                  disabledReason={resolveReason}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`text-[9px] uppercase font-black px-2 py-0.5 rounded ${
                        task.source === 'personal'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : task.source === 'annotation'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}
                    >
                      {task.source}
                    </span>

                    {task.due_date && task.status !== 'resolved' && (
                      <span
                        className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded ${
                          new Date(task.due_date) < new Date()
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}
                      >
                        <Clock size={10} />
                        Due {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}

                    <span className="text-[10px] text-gray-400 font-mono">
                      {new Date(task.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3
                    className={`font-bold text-base leading-tight ${
                      task.status === 'resolved'
                        ? 'line-through text-gray-500'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {task.title}
                  </h3>

                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{task.description}</p>

                  {task.source === 'annotation' && (
                    <>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mt-3">
                        {task.research_title}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2 italic">
                        &quot;{task.quote}&quot;
                      </p>
                      {task.status !== 'resolved' && resolveReason ? (
                        <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                          {resolveReason}
                        </p>
                      ) : null}
                      <Link
                        href={appendFromParam(
                          `/dashboard/research/${task.research_id}/annotate?annotationId=${task.id}`,
                          '/dashboard/tasks'
                        )}
                        className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 px-3 py-2 rounded-xl transition-colors w-fit"
                      >
                        Open Feedback Thread
                        <ExternalLink size={14} />
                      </Link>
                    </>
                  )}
                </div>

                {task.source === 'personal' && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => setEditingTaskId(task.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit Task"
                    >
                      <Edit size={18} />
                    </button>
                    <form action={deleteTask.bind(null, task.id)}>
                      <button
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 size={18} />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500">
            Showing {(safePage - 1) * pageSize + 1}–
            {Math.min(safePage * pageSize, filteredTasks.length)} of {filteredTasks.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(safePage - 1)}
              disabled={safePage <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft size={14} />
              Prev
            </button>

            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                onClick={() => handlePageChange(pageNumber)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  pageNumber === safePage
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'
                }`}
              >
                {pageNumber}
              </button>
            ))}

            <button
              type="button"
              onClick={() => handlePageChange(safePage + 1)}
              disabled={safePage >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

