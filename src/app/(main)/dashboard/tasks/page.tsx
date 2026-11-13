import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
    Clock,
    GraduationCap,
    Trash2,
    ArrowRight,
    AlertCircle,
    ClipboardList,
} from 'lucide-react'
import { deleteTask } from './actions'
import Link from 'next/link'
import { TeacherAnalytics } from '@/components/dashboard/tasks/TeacherAnalytics'
import PaginationLinks from '@/components/ui/PaginationLinks'
import { TasksRealtimeRefresh } from '@/components/dashboard/tasks/TasksRealtimeRefresh'
import { BroadcastTaskForm } from '@/components/dashboard/tasks/BroadcastTaskForm'
import {
    StudentTaskManagerClient,
    type StudentTaskFilter,
    type StudentTaskItem,
    type StudentTaskSource,
} from '@/components/dashboard/tasks/StudentTaskManagerClient'
import { isFacultyRole } from '@/lib/users/access'
import { getStudentAnnotationResolveStatus } from '@/lib/research/annotations'

type TaskSource = StudentTaskSource

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
    position_data?: unknown
    version_id?: string | null
    version_number?: number | null
}



export default async function TaskManagerPage({
    searchParams
}: {
    searchParams: Promise<{ filter?: string, edit?: string, page?: string }>
}) {

    // Resolve query params
    const resolvedParams = await searchParams
    const rawFilter = resolvedParams.filter
    const activeFilter: StudentTaskFilter =
        rawFilter === 'resolved' || rawFilter === 'all' ? rawFilter : 'unresolved'
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



    if (profile?.role === 'guest' || profile?.role === 'proofreader') {
        redirect('/dashboard')
    }

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
                            <BroadcastTaskForm sections={managedSections} />
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
                .select('id, research_id, comment_text, quote, created_at, is_resolved, position_data, version_id, version_number')
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

    const annotationResolveReasonMap = new Map<string, string | null>()
    const unresolvedAnnotationTasks = summaryTasks.filter(
        (task) => task.source === 'annotation' && task.status !== 'resolved'
    )

    if (unresolvedAnnotationTasks.length > 0) {
        const resolveStatuses = await Promise.all(
            unresolvedAnnotationTasks.map(async (task) => {
                const annotationSource = annotationTasksData.find((item) => item.id === task.id)
                if (!annotationSource) {
                    return [task.id, null] as const
                }

                const status = await getStudentAnnotationResolveStatus(supabase, annotationSource)
                return [task.id, status.canResolve ? null : status.reason] as const
            })
        )

        resolveStatuses.forEach(([taskId, reason]) => {
            annotationResolveReasonMap.set(taskId, reason)
        })
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <TasksRealtimeRefresh />
            <StudentTaskManagerClient
                tasks={summaryTasks}
                annotationResolveReasons={Object.fromEntries(annotationResolveReasonMap)}
                initialFilter={activeFilter}
                initialPage={page}
                pageSize={pageSize}
                initialEditTaskId={editTaskId}
            />
        </div>
    )
}
