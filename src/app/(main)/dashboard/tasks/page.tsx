import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
    Clock,
    GraduationCap,
    Trash2,
    ArrowRight,
    AlertCircle,
    ExternalLink,
    ClipboardList,
    Edit,
    BookOpen
} from 'lucide-react'
import { createTask, deleteTask, createSectionTask, editTask } from './actions'
import { SubmitButton } from '@/components/auth/SubmitButton'
import Link from 'next/link'
import { TeacherAnalytics } from '@/components/dashboard/tasks/TeacherAnalytics'
import PaginationLinks from '@/components/ui/PaginationLinks'
import { appendFromParam } from '@/lib/navigation'
import { TasksRealtimeRefresh } from '@/components/dashboard/tasks/TasksRealtimeRefresh'
import { TaskResolveButton } from '@/components/dashboard/tasks/TaskResolveButton'
import { isFacultyRole } from '@/lib/users/access'

type TaskSource = 'teacher' | 'personal' | 'annotation'

type TaskCompletion = {
    is_completed: boolean
    student_id?: string
}

type TeacherAssignedTask = {
    id: string
    title: string
    description: string | null
    created_at: string
    due_date: string | null
    task_completions?: TaskCompletion[]
    sections?: { name?: string | null } | null
}

type AnnotationTaskRecord = {
    id: string
    research_id: string
    comment_text: string
    quote: string | null
    created_at: string
    is_resolved: boolean
}

type StudentTaskItem = {
    id: string
    title: string
    description: string | null
    created_at: string
    status: string
    source: TaskSource
    due_date?: string | null
    research_id?: string
    research_title?: string
    quote?: string | null
}

export default async function TaskManagerPage({
    searchParams
}: {
    searchParams: Promise<{ filter?: string, edit?: string, page?: string }>
}) {

    // Resolve query params
    const resolvedParams = await searchParams
    const activeFilter = resolvedParams.filter || 'unresolved'
    const editTaskId = resolvedParams.edit
    const rawPage = Number.parseInt(resolvedParams.page || '1', 10)
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1
    const pageSize = 10

    // Initialize Supabase
const supabase = await createClient()

// Get logged-in user
const { data: { user } } = await supabase.auth.getUser()

if (!user) redirect('/login')

// Fetch role
const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()



    const isTeacher = isFacultyRole(profile?.role)
    // ==========================================
    // TEACHER VIEW
    // ==========================================
    if (isTeacher) {
        const [{ data: sectionsData }, { data: assignedTasks }] = await Promise.all([
            supabase
                .from('sections')
                .select('id, name, course_code')
                .eq('teacher_id', user.id),
            supabase
                .from('tasks')
                .select('*, sections(name), task_completions(is_completed)')
                .eq('created_by', user.id)
                .eq('type', 'teacher')
                .order('created_at', { ascending: false }),
        ])

        const managedSections = sectionsData || []
        const sectionIds = managedSections.map(s => s.id)
        const courseCodes = managedSections.map(s => s.course_code).filter(Boolean)

        const [analyticsResult, teacherResearchResult] = await Promise.all([
            sectionIds.length > 0
                ? supabase
                    .from('student_task_analytics')
                    .select('*')
                    .in('section_id', sectionIds)
                    .order('completion_rate', { ascending: false })
                : Promise.resolve({ data: [] }),
            courseCodes.length > 0
                ? supabase
                    .from('research')
                    .select('id')
                    .in('subject_code', courseCodes)
                : Promise.resolve({ data: [] }),
        ])

        const analyticsData = analyticsResult.data || []

        const teacherAssignedTasks = assignedTasks || []
        const pagedTeacherAssignedTasks = teacherAssignedTasks.slice(
            (page - 1) * pageSize,
            page * pageSize
        )

        // Calculate pending annotations across teacher's sections
        let pendingAnnotations = 0
        const teacherResearch = teacherResearchResult.data || []
        if (teacherResearch.length > 0) {
            if (teacherResearch && teacherResearch.length > 0) {
                const { count } = await supabase
                    .from('annotations')
                    .select('*', { count: 'exact', head: true })
                    .in('research_id', teacherResearch.map(r => r.id))
                    .eq('is_resolved', false)
                pendingAnnotations = count || 0
            }
        }

        return (
            <div className="max-w-4xl mx-auto space-y-8">
                <TasksRealtimeRefresh />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
                        Task Manager
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Assign tasks and monitor student progress across your sections.
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Broadcast Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-200 dark:shadow-none">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <GraduationCap size={20} /> Assign Section Task
                            </h2>
                            <form action={createSectionTask} className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <input
                                        name="title"
                                        required
                                        placeholder="Task Title (e.g., Submit Chapter 1)"
                                        className="w-full bg-blue-700/50 border border-blue-400/30 rounded-xl p-3 placeholder:text-blue-200 outline-none focus:ring-2 focus:ring-white/50 transition-all"
                                    />
                                    <textarea
                                        name="description"
                                        placeholder="Instructions for students..."
                                        rows={2}
                                        className="w-full bg-blue-700/50 border border-blue-400/30 rounded-xl p-3 placeholder:text-blue-200 outline-none focus:ring-2 focus:ring-white/50 transition-all resize-none"
                                    />
                                </div>
                                <div className="space-y-3">
                                    {/* FIX: Move defaultValue to select and remove selected from option */}
                                    <select
                                        name="sectionId"
                                        required
                                        defaultValue=""
                                        className="w-full bg-blue-700/50 border border-blue-400/30 rounded-xl p-3 outline-none focus:ring-2 focus:ring-white/50 transition-all text-gray-900"
                                    >
                                        <option value="" disabled>Select Section...</option>
                                        {managedSections.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold uppercase opacity-70 ml-1">Deadline (Optional)</label>
                                        <input
                                            type="datetime-local"
                                            name="dueDate"
                                            className="w-full bg-blue-700/50 border border-blue-400/30 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-white/50 transition-all [color-scheme:dark]"
                                        />
                                    </div>
                                    <SubmitButton className="w-full bg-white text-blue-600 py-3 rounded-xl font-black hover:bg-blue-50 transition-colors">
                                        Broadcast Task
                                    </SubmitButton>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Analytics Panel */}
                    <div className="space-y-6">
                        <div className="bg-purple-600 p-6 rounded-2xl text-white shadow-lg shadow-purple-200 dark:shadow-none">
                            <h3 className="font-bold flex items-center gap-2 mb-2">
                                <AlertCircle size={18} /> Feedback Audit
                            </h3>
                            <p className="text-xs text-purple-100 mb-4 leading-relaxed">
                                There are currently <strong>{pendingAnnotations}</strong> unresolved feedback items across your active sections.
                            </p>
                            <Link href="/dashboard" className="text-xs font-bold bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all flex items-center justify-between">
                                Review Submissions <ArrowRight size={14} />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Assigned Tasks List */}
                <div className="space-y-4 pt-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--foreground)]">
                        <ClipboardList size={22} className="text-gray-400" />
                        Tasks You&apos;ve Assigned
                    </h2>

                    {teacherAssignedTasks.length === 0 ? (
                        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl text-gray-400">
                            <ClipboardList size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="font-medium text-lg">No tasks assigned yet.</p>
                            <p className="text-sm">Use the broadcast form above to create one.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {pagedTeacherAssignedTasks.map((task: TeacherAssignedTask) => {
                                const total = task.task_completions?.length || 0;
                                const completed = task.task_completions?.filter((c: TaskCompletion) => c.is_completed).length || 0;

                                return (
                                    <div key={task.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between group">
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 truncate max-w-[150px]">
                                                    {task.sections?.name || 'Unknown Section'}
                                                </span>
                                                {task.due_date && (
                                                    <span className="text-[10px] text-gray-400 flex items-center gap-1 font-mono">
                                                        <Clock size={12} /> {new Date(task.due_date).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-lg leading-tight mb-1">{task.title}</h3>
                                            <p className="text-sm text-gray-500 line-clamp-2">{task.description}</p>
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-end justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Completion</p>
                                                <span className="text-2xl font-black text-gray-900 dark:text-gray-100">
                                                    {completed}<span className="text-lg text-gray-400 font-medium">/{total}</span>
                                                </span>
                                            </div>
                                            <form action={deleteTask.bind(null, task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button title="Delete Task" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <PaginationLinks
                    pathname="/dashboard/tasks"
                    searchParams={{ ...resolvedParams, page: String(page) }}
                    totalCount={teacherAssignedTasks.length}
                    pageSize={pageSize}
                />

                <TeacherAnalytics data={analyticsData} />
            </div>
        )
    }

    // ==========================================
    // STUDENT VIEW
    // ==========================================

    // Fetch personal tasks (created by student)
    const [{ data: personalTasksData }, { data: memberships }, { data: myResearch }] = await Promise.all([
        supabase
            .from('tasks')
            .select('*')
            .eq('created_by', user.id)
            .eq('type', 'student'),
        supabase
            .from('section_members')
            .select('section_id')
            .eq('user_id', user.id)
            .eq('status', 'active'),
        supabase
            .from('research')
            .select('id, title')
            .or(`user_id.eq.${user.id},members.cs.{${user.id}}`),
    ])

    const mySectionIds = memberships?.map(m => m.section_id) || []

    const myResearchIds = myResearch?.map((item) => item.id) || []
    const researchTitleMap = Object.fromEntries(
        (myResearch || []).map((item) => [item.id, item.title || 'Research Paper'])
    )

    const [teacherTasksResult, annotationTasksResult] = await Promise.all([
        mySectionIds.length > 0
            ? supabase
                .from('tasks')
                .select('*, task_completions(is_completed)')
                .in('section_id', mySectionIds)
                .eq('type', 'teacher')
            : Promise.resolve({ data: [] }),
        myResearchIds.length > 0
            ? supabase
                .from('annotations')
                .select('id, research_id, comment_text, quote, created_at, is_resolved')
                .in('research_id', myResearchIds)
                .order('created_at', { ascending: false })
            : Promise.resolve({ data: [] }),
    ])

    const teacherTasksData: TeacherAssignedTask[] = teacherTasksResult.data || []
    const annotationTasksData: AnnotationTaskRecord[] = annotationTasksResult.data || []

    // Normalize and combine task sources
    const allTasks: StudentTaskItem[] = [
        ...(teacherTasksData || []).map(t => ({
            ...t,
            source: 'teacher' as const,
            status: t.task_completions?.find((c: TaskCompletion) => c.student_id === user.id)?.is_completed ? 'resolved' : 'unresolved'
        })),

        ...(annotationTasksData || []).map((annotation) => ({
            ...annotation,
            source: 'annotation' as const,
            title: 'Teacher Feedback',
            description: annotation.comment_text,
            status: annotation.is_resolved ? 'resolved' : 'unresolved',
            research_title: researchTitleMap[annotation.research_id] || 'Research Paper'
        })),

        ...(personalTasksData || []).map(t => ({
            ...t,
            source: 'personal' as const,
            status: t.status // Inherit DB status for personal tasks
        }))
    ]

    const summaryTasks = [...allTasks]

    // Priority ordering
    const priority: Record<TaskSource, number> = {
        teacher: 0,
        annotation: 1,
        personal: 2
    }

    summaryTasks.sort((a, b) => {
        if (priority[a.source as keyof typeof priority] !== priority[b.source as keyof typeof priority]) {
            return priority[a.source as keyof typeof priority] - priority[b.source as keyof typeof priority]
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    let filteredTasks = summaryTasks

    // Apply status filter only to the visible list
    if (activeFilter !== 'all') {
        filteredTasks = summaryTasks.filter(t => t.status === activeFilter)
    }

    // Calculate progress statistics
    const totalTasks = summaryTasks.length
    const completedCount = summaryTasks.filter(t => t.status === 'resolved').length
    const progressPercentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0
    const teacherTasksCount = summaryTasks.filter(t => t.source === 'teacher' || t.source === 'annotation').length
    const pagedTasks = filteredTasks.slice((page - 1) * pageSize, page * pageSize)

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <TasksRealtimeRefresh />
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
                    {['unresolved', 'resolved', 'all'].map((f) => (
                        <Link
                            key={f}
                            href={`/dashboard/tasks?filter=${f}`}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${activeFilter === f
                                ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            {f}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Progress Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall Progress</span>
                    <div className="flex items-end gap-2 mt-2">
                        <span className="text-4xl font-black text-blue-600">{progressPercentage}%</span>
                        <span className="text-sm text-gray-400 mb-1">completed</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full mt-4 overflow-hidden">
                        <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${progressPercentage}%` }} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Assigned by Teachers</span>
                    <div className="flex items-center gap-3 mt-2">
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600">
                            <BookOpen size={24} />
                        </div>
                        <span className="text-3xl font-black text-gray-900 dark:text-gray-100">{teacherTasksCount}</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Completion Ratio</span>
                    <p className="text-3xl font-black text-gray-900 dark:text-gray-100 mt-2">
                        {completedCount}<span className="text-gray-400 text-lg font-medium">/{totalTasks}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Total tasks in list</p>
                </div>
            </div>

            {/* Personal Task Form */}
            {activeFilter !== 'resolved' && !editTaskId && (
                <form action={createTask} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                        <input name="title" required placeholder="New personal task..." className="w-full bg-transparent border-none text-lg font-semibold outline-none focus:ring-0 text-[var(--foreground)]" />
                        <input name="description" placeholder="Add details..." className="w-full bg-transparent border-none text-sm text-gray-500 outline-none focus:ring-0" />
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
                    pagedTasks.map((task: StudentTaskItem) => {

                        // Render inline edit form if this task is being edited
                        if (task.id === editTaskId && task.source === 'personal') {
                            return (
                                <form key={task.id} action={editTask} className="group flex flex-col items-start gap-4 p-5 rounded-2xl border bg-white dark:bg-gray-900 border-blue-300 shadow-md">
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
                                            <Link href="/dashboard/tasks" className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 text-sm transition-colors">
                                                Cancel
                                            </Link>
                                            <SubmitButton className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 text-sm shadow-sm">
                                                Save Changes
                                            </SubmitButton>
                                        </div>
                                    </div>
                                </form>
                            )
                        }

                        // Normal Task Rendering
                        return (
                            <div
                                key={task.id}
                                className={`group flex items-start gap-4 p-5 rounded-2xl border transition-all hover:shadow-md ${task.status === 'resolved'
                                    ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 opacity-60'
                                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm hover:border-blue-300'
                                    }`}
                            >
                                {/* Checkbox Toggle */}
                                <TaskResolveButton
                                    taskId={task.id}
                                    currentStatus={task.status}
                                    source={task.source}
                                />

                                <div className="flex-1 min-w-0">
                                    {/* Task Header */}
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded ${task.source === 'personal'
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : task.source === 'annotation'
                                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                            }`}>
                                            {task.source}
                                        </span>

                                        {task.due_date && task.status !== 'resolved' && (
                                            <span
                                                className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded ${new Date(task.due_date) < new Date()
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

                                    {/* Title */}
                                    <h3 className={`font-bold text-base leading-tight ${task.status === 'resolved' ? 'line-through text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                                        {task.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{task.description}</p>

                                    {task.source === 'annotation' && (
                                        <>
                                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mt-3">
                                                {task.research_title}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1 line-clamp-2 italic">
                                                &quot;{task.quote}&quot;
                                            </p>
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

                                {/* Manage Personal Task Controls (Edit/Delete) */}
                                {task.source === 'personal' && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link
                                            href={`/dashboard/tasks?edit=${task.id}${activeFilter !== 'unresolved' ? `&filter=${activeFilter}` : ''}`}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="Edit Task"
                                        >
                                            <Edit size={18} />
                                        </Link>
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

            <PaginationLinks
                pathname="/dashboard/tasks"
                searchParams={{ ...resolvedParams, page: String(page) }}
                totalCount={filteredTasks.length}
                pageSize={pageSize}
            />
        </div>
    )
}
