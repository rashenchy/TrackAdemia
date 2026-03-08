import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
    Plus,
    Clock,
    GraduationCap,
    Trash2,
    CheckCircle,
    Circle,
    ArrowRight,
    AlertCircle,
    MessageSquare,
    ExternalLink
} from 'lucide-react'
import { createTask, toggleTaskStatus, deleteTask, createSectionTask } from './actions'
import { SubmitButton } from '@/components/auth/SubmitButton'
import Link from 'next/link'
import { TeacherAnalytics } from '@/components/dashboard/TeacherAnalytics'

export default async function TaskManagerPage({
    searchParams
}: {
    searchParams: Promise<{ filter?: string }>
}) {
    const resolvedParams = await searchParams
    const activeFilter = resolvedParams.filter || 'unresolved'

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Determine if user is a teacher
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    const isTeacher = profile?.role === 'mentor'

    // If teacher, fetch their sections for the dropdown
    let managedSections: any[] = []

    if (isTeacher) {
        const { data } = await supabase
            .from('sections')
            .select('id, name')
            .eq('teacher_id', user.id)

        managedSections = data || []
    }

    // ===============================
    // TEACHER ANALYTICS FETCHING
    // ===============================

    let analyticsData: any[] = []

    if (isTeacher && managedSections.length > 0) {
        const { data: stats } = await supabase
            .from('student_task_analytics')
            .select('*')
            .in('section_id', managedSections.map(s => s.id))
            .order('completion_rate', { ascending: false })

        analyticsData = stats || []
    }

    // 1. Fetch Data (Personal & Annotations)
    const [personalRes, researchRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('created_by', user.id),
        supabase.from('research').select('id, title').or(`user_id.eq.${user.id},members.cs.{${user.id}}`)
    ])

    const researchIds = researchRes.data?.map(r => r.id) || []
    const { data: annotations } = await supabase
        .from('annotations')
        .select('*, research:research_id(title)')
        .in('research_id', researchIds)

    // 2. Normalize and Filter
    // ===============================
    // TEACHER TASK FETCHING
    // ===============================

    // 1. Fetch Student's active section IDs
    const { data: memberships } = await supabase
        .from('section_members')
        .select('section_id')
        .eq('user_id', user.id)
        .eq('status', 'active')

    const mySectionIds = memberships?.map(m => m.section_id) || []

    // 2. Fetch Teacher Tasks for those sections
    let teacherTasks: any[] = []

    if (!isTeacher && mySectionIds.length > 0) {
        const { data } = await supabase
            .from('tasks')
            .select('*, task_completions(is_completed)')
            .in('section_id', mySectionIds)
            .eq('type', 'teacher')

        teacherTasks = data || []
    }

    // 3. Map Teacher Tasks
    const mappedTeacherTasks = (teacherTasks || []).map(t => ({
        ...t,
        source: 'teacher' as const,
        status: t.task_completions?.[0]?.is_completed ? 'resolved' : 'unresolved'
    }))

    // ===============================
    // NORMALIZE ALL TASKS
    // ===============================

    let allTasks = [
        ...mappedTeacherTasks,

        ...(personalRes.data || []).map(t => ({
            ...t,
            source: 'personal' as const
        })),

        ...(annotations || []).map(a => ({
            id: a.id,
            title: `Feedback: ${a.comment_text}`,
            description: `In "${a.research?.title}"`,
            status: a.is_resolved ? 'resolved' : 'unresolved',
            created_at: a.created_at,
            source: 'annotation' as const,
            research_id: a.research_id,
            quote: a.quote
        }))
    ]

    if (activeFilter !== 'all') {
        allTasks = allTasks.filter(t => t.status === activeFilter)
    }

    const priority: Record<'annotation' | 'teacher' | 'personal', number> = {
        annotation: 0,
        teacher: 1,
        personal: 2
    }

    allTasks.sort((a, b) => {
        if (priority[a.source as keyof typeof priority] !== priority[b.source as keyof typeof priority]) {
            return priority[a.source as keyof typeof priority] - priority[b.source as keyof typeof priority]
        }

        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    // ===============================
    // PROGRESS STATISTICS
    // ===============================

    const totalTasks = allTasks.length
    const completedCount = allTasks.filter(t => t.status === 'resolved').length
    const progressPercentage = totalTasks > 0
        ? Math.round((completedCount / totalTasks) * 100)
        : 0

    const pendingAnnotations = allTasks.filter(
        t => t.source === 'annotation' && t.status === 'unresolved'
    ).length

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
                        Task Manager
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Track research tasks and unresolved feedback.
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

                {/* Overall Progress */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Overall Progress
                    </span>

                    <div className="flex items-end gap-2 mt-2">
                        <span className="text-4xl font-black text-blue-600">
                            {progressPercentage}%
                        </span>
                        <span className="text-sm text-gray-400 mb-1">
                            completed
                        </span>
                    </div>

                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full mt-4 overflow-hidden">
                        <div
                            className="bg-blue-600 h-full transition-all duration-500"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>

                {/* Pending Feedback */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Pending Feedback
                    </span>

                    <div className="flex items-center gap-3 mt-2">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl text-purple-600">
                            <MessageSquare size={24} />
                        </div>

                        <span className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            {pendingAnnotations}
                        </span>
                    </div>
                </div>

                {/* Completion Ratio */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Completion Ratio
                    </span>

                    <p className="text-3xl font-black text-gray-900 dark:text-gray-100 mt-2">
                        {completedCount}
                        <span className="text-gray-400 text-lg font-medium">
                            /{totalTasks}
                        </span>
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                        Total tasks assigned
                    </p>
                </div>

            </div>

            {/* Quick Task Creation (Hidden when viewing 'resolved' only) */}
            {isTeacher ? (
                <div className="grid lg:grid-cols-3 gap-8">

                    {/* LEFT SIDE — Broadcast Form */}
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

                                    <select
                                        name="sectionId"
                                        required
                                        className="w-full bg-blue-700/50 border border-blue-400/30 rounded-xl p-3 outline-none focus:ring-2 focus:ring-white/50 transition-all"
                                    >
                                        <option value="" className="text-gray-900">
                                            Select Section...
                                        </option>

                                        {managedSections.map((s) => (
                                            <option key={s.id} value={s.id} className="text-gray-900">
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold uppercase opacity-70 ml-1">
                                            Deadline (Optional)
                                        </label>

                                        <input
                                            type="datetime-local"
                                            name="dueDate"
                                            className="w-full bg-blue-700/50 border border-blue-400/30 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-white/50 transition-all"
                                        />
                                    </div>

                                    <SubmitButton className="w-full bg-white text-blue-600 py-3 rounded-xl font-black hover:bg-blue-50 transition-colors">
                                        Broadcast Task
                                    </SubmitButton>

                                </div>

                            </form>
                        </div>

                    </div>


                    {/* RIGHT SIDE — Analytics Panel */}
                    <div className="space-y-6">

                        <TeacherAnalytics data={analyticsData} />

                        <div className="bg-purple-600 p-6 rounded-2xl text-white shadow-lg shadow-purple-200 dark:shadow-none">

                            <h3 className="font-bold flex items-center gap-2 mb-2">
                                <AlertCircle size={18} /> Feedback Audit
                            </h3>

                            <p className="text-xs text-purple-100 mb-4 leading-relaxed">
                                There are currently <strong>
                                    {pendingAnnotations}
                                </strong> unresolved feedback items across your active sections.
                            </p>

                            <Link
                                href="/dashboard"
                                className="text-xs font-bold bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-all flex items-center justify-between"
                            >
                                Review Submissions
                                <ArrowRight size={14} />
                            </Link>

                        </div>

                    </div>

                </div>
            ) : (
                /* STUDENT: Personal Task Form */
                activeFilter !== 'resolved' && (
                    <form action={createTask} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 space-y-2">
                            <input name="title" required placeholder="New research task..." className="w-full bg-transparent border-none text-lg font-semibold outline-none focus:ring-0 text-[var(--foreground)]" />
                            <input name="description" placeholder="Add details..." className="w-full bg-transparent border-none text-sm text-gray-500 outline-none focus:ring-0" />
                        </div>

                        <SubmitButton className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 h-fit self-end shadow-lg shadow-blue-200 dark:shadow-none">
                            Add Task
                        </SubmitButton>
                    </form>
                )
            )}

            {/* Task List */}
            <div className="space-y-3">
                {allTasks.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl text-gray-400">
                        <AlertCircle size={48} className="mx-auto mb-4 opacity-10" />
                        <p className="font-medium text-lg capitalize">No {activeFilter} tasks found.</p>
                        <p className="text-sm">Everything looks organized!</p>
                    </div>
                ) : (
                    allTasks.map((task) => (
                        <div
                            key={task.id}
                            className={`group flex items-start gap-4 p-5 rounded-2xl border transition-all hover:shadow-md ${task.status === 'resolved'
                                ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 opacity-60'
                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm hover:border-blue-300'
                                }`}
                        >

                            {/* Checkbox Toggle */}
                            <form action={toggleTaskStatus.bind(null, task.id, task.status, task.source)}>
                                <button
                                    type="submit"
                                    className={`mt-1 p-1 rounded-full transition-all ${task.status === 'resolved'
                                        ? 'text-green-500 bg-green-50 dark:bg-green-900/20'
                                        : 'text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                        }`}
                                >
                                    {task.status === 'resolved'
                                        ? <CheckCircle size={24} />
                                        : <Circle size={24} />}
                                </button>
                            </form>

                            <div className="flex-1 min-w-0">

                                {/* Task Header */}
                                <div className="flex items-center gap-2 mb-1 flex-wrap">

                                    <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded ${task.source === 'personal'
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        : task.source === 'teacher'
                                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
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
                                <h3 className={`font-bold text-base leading-tight ${task.status === 'resolved'
                                    ? 'line-through text-gray-500'
                                    : 'text-gray-900 dark:text-gray-100'
                                    }`}>
                                    {task.title}
                                </h3>

                                {/* Description */}
                                <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                                    {task.description}
                                </p>

                                {/* Annotation Context */}
                                {task.source === 'annotation' && (
                                    <div className="mt-4 flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <p className="text-xs italic text-gray-400 line-clamp-1 flex-1">
                                            "{task.quote}"
                                        </p>

                                        <Link
                                            href={`/dashboard/research/${task.research_id}/annotate?annotationId=${task.id}`}
                                            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0 px-2 py-1 bg-white dark:bg-gray-700 rounded-md shadow-sm"
                                        >
                                            Jump to File <ExternalLink size={10} />
                                        </Link>
                                    </div>
                                )}

                                {/* Quick Action Bar */}
                                {task.status === 'unresolved' && (
                                    <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">

                                        <form action={toggleTaskStatus.bind(null, task.id, task.status, task.source)}>
                                            <button
                                                type="submit"
                                                className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:scale-105 transition-transform"
                                            >
                                                Quick Resolve
                                            </button>
                                        </form>

                                        {task.source === 'annotation' && (
                                            <Link
                                                href={`/dashboard/research/${task.research_id}/annotate?annotationId=${task.id}`}
                                                className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100"
                                            >
                                                Open Document
                                            </Link>
                                        )}

                                    </div>
                                )}

                            </div>

                            {/* Delete Personal Task */}
                            {task.source === 'personal' && (
                                <form action={deleteTask.bind(null, task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                                        <Trash2 size={18} />
                                    </button>
                                </form>
                            )}

                        </div>
                    ))
                )}
            </div>
        </div>
    )
}