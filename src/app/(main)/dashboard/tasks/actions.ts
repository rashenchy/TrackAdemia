'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { syncResearchReviewStatus } from '@/lib/research/review'
import { ensureStudentCanResolveAnnotation } from '@/lib/research/annotations'
import { createNotifications } from '@/lib/notifications/service'

// Create a personal task for the current user
export async function createTask(formData: FormData) {

    // Initialize Supabase and verify the user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Extract task data from the form
    const title = formData.get('title') as string
    const description = formData.get('description') as string

    // Insert the new personal task
    const { error } = await supabase.from('tasks').insert({
        title,
        description,
        created_by: user.id,
        type: 'student'
    })

    if (error) throw error

    // Refresh the tasks page
    revalidatePath('/dashboard/tasks')
}

// Edit a personal task
export async function editTask(formData: FormData) {

    // Initialize Supabase and verify the user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Extract task data
    const taskId = formData.get('taskId') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string

    // Update the task (ensuring it belongs to the user)
    const { error } = await supabase
        .from('tasks')
        .update({ title, description })
        .eq('id', taskId)
        .eq('created_by', user.id)

    if (error) throw error

    // Refresh and redirect to clear the edit query param
    revalidatePath('/dashboard/tasks')
    redirect('/dashboard/tasks')
}

// Delete a task by ID
export async function deleteTask(taskId: string) {

    // Initialize Supabase
    const supabase = await createClient()

    // Remove the task from the database
    const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

    if (error) throw error

    // Refresh the tasks page
    revalidatePath('/dashboard/tasks')
}

// Toggle completion state of a task or annotation
export async function toggleTaskStatus(
    taskId: string,
    currentStatus: string,
    source: 'personal' | 'annotation' | 'teacher'
) {

    // Initialize Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Determine the new status
    const isResolved = currentStatus === 'resolved'
    const newStatus = isResolved ? 'unresolved' : 'resolved'

    // Update a personal task status
    if (source === 'personal') {

        await supabase
            .from('tasks')
            .update({ status: newStatus })
            .eq('id', taskId)

    } else if (source === 'teacher') {
        const completedAt = !isResolved ? new Date().toISOString() : null
        
        // Update the student's completion record for a teacher-assigned task
        await supabase
            .from('task_completions')
            .update({ 
                is_completed: !isResolved,
                completed_at: completedAt
            })
            .eq('task_id', taskId)
            .eq('student_id', user.id)

        if (!isResolved) {
            const [{ data: task }, { data: profile }] = await Promise.all([
                supabase
                    .from('tasks')
                    .select('id, title, created_by')
                    .eq('id', taskId)
                    .single(),
                supabase
                    .from('profiles')
                    .select('first_name, last_name')
                    .eq('id', user.id)
                    .single(),
            ])

            if (task?.created_by) {
                const studentName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'A student'
                await createNotifications(supabase, [
                    {
                        user_id: task.created_by,
                        actor_id: user.id,
                        title: 'Task completed',
                        message: `${studentName} marked "${task.title}" as completed.`,
                        notification_type: 'task_completed',
                        reference_id: task.id,
                        event_key: `task-completed:${task.id}:${user.id}:${completedAt}`,
                    },
                ])
            }
        }

    } else {

        const { data: annotationRecord, error: annotationLookupError } = await supabase
            .from('annotations')
            .select('id, research_id, created_at, position_data, version_id, version_number')
            .eq('id', taskId)
            .single()

        if (annotationLookupError || !annotationRecord) {
            throw new Error('Annotation not found.')
        }

        if (!isResolved) {
            const { data: research } = await supabase
                .from('research')
                .select('user_id, members')
                .eq('id', annotationRecord.research_id)
                .single()

            const isStudentAuthor =
                user.id === research?.user_id ||
                (Array.isArray(research?.members) && research.members.includes(user.id))

            if (isStudentAuthor) {
                await ensureStudentCanResolveAnnotation(supabase, annotationRecord)
            }
        }

        // Update the linked annotation status instead
        const { data: annotation, error } = await supabase
            .from('annotations')
            .update({ is_resolved: !isResolved })
            .eq('id', taskId)
            .select('research_id')
            .single()

        if (error) throw error

        await syncResearchReviewStatus(
            supabase,
            annotation.research_id,
            user.id,
            !isResolved ? taskId : null
        )
    }

    // Refresh the tasks page
    revalidatePath('/dashboard/tasks')
    revalidatePath('/dashboard')
}


// Create a teacher task for an entire section
export async function createSectionTask(formData: FormData) {

    // Initialize Supabase and verify the teacher
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Extract task details from the form
    const title = (formData.get('title') as string)?.trim()
    const description = (formData.get('description') as string) || ''
    const sectionId = formData.get('sectionId') as string
    const dueDate = formData.get('dueDate') as string

    if (!title || !sectionId) {
        throw new Error('Title and section are required.')
    }

    // Insert the task and fetch section metadata + members in parallel
    const [taskResult, membersResult, sectionResult, teacherProfileResult] = await Promise.all([
        supabase
            .from('tasks')
            .insert({
                title,
                description,
                section_id: sectionId,
                created_by: user.id,
                type: 'teacher',
                due_date: dueDate || null
            })
            .select('id')
            .single(),
        supabase
            .from('section_members')
            .select('user_id')
            .eq('section_id', sectionId)
            .eq('status', 'active')
            .eq('role', 'student'),
        supabase
            .from('sections')
            .select('name')
            .eq('id', sectionId)
            .single(),
        supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', user.id)
            .single(),
    ])

    if (taskResult.error || !taskResult.data) {
        throw taskResult.error || new Error('Failed to create section task.')
    }

    const task = taskResult.data
    const memberIds = (membersResult.data || []).map((member) => member.user_id).filter(Boolean)

    if (memberIds.length > 0) {
        const { data: activeProfiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('is_active', true)
            .in('id', memberIds)

        const activeStudentIds = (activeProfiles || []).map((profile) => profile.id)

        if (activeStudentIds.length > 0) {
            const teacherName =
                `${teacherProfileResult.data?.first_name ?? ''} ${teacherProfileResult.data?.last_name ?? ''}`.trim() ||
                'Your teacher'

            const completions = activeStudentIds.map((studentId) => ({
                task_id: task.id,
                student_id: studentId,
                is_completed: false
            }))

            // Insert completions and notifications in parallel
            const [{ error: compError }] = await Promise.all([
                supabase
                    .from('task_completions')
                    .insert(completions),
                createNotifications(
                    supabase,
                    activeStudentIds.map((studentId) => ({
                        user_id: studentId,
                        actor_id: user.id,
                        title: 'New assigned task',
                        message: `${teacherName} assigned "${title}"${sectionResult.data?.name ? ` in ${sectionResult.data.name}` : ''}.`,
                        notification_type: 'task_assigned',
                        reference_id: task.id,
                        section_id: sectionId,
                        event_key: `task-assigned:${task.id}:${studentId}`,
                    }))
                ),
            ])

            if (compError) console.error('Error initializing completions:', compError)
        }
    }

    // Refresh the tasks page
    revalidatePath('/dashboard/tasks')
}
