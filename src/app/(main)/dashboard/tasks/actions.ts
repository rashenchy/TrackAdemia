'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { syncResearchReviewStatus } from '@/lib/research/review'
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
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const sectionId = formData.get('sectionId') as string
    const dueDate = formData.get('dueDate') as string

    // Insert the main task record
    const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
            title,
            description,
            section_id: sectionId,
            created_by: user.id,
            type: 'teacher',
            due_date: dueDate || null
        })
        .select()
        .single()

    if (taskError) throw taskError

    // Fetch all active students in the section
    const [{ data: members }, { data: section }, { data: teacherProfile }] = await Promise.all([
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

    // Initialize completion records for each student
    if (members && members.length > 0) {

        const completions = members.map(m => ({
            task_id: task.id,
            student_id: m.user_id,
            is_completed: false
        }))

        const { error: compError } = await supabase
            .from('task_completions')
            .insert(completions)

        if (compError) console.error("Error initializing completions:", compError)

        const teacherName =
            `${teacherProfile?.first_name ?? ''} ${teacherProfile?.last_name ?? ''}`.trim() ||
            'Your teacher'

        await createNotifications(
            supabase,
            members.map((member) => ({
                user_id: member.user_id,
                actor_id: user.id,
                title: 'New assigned task',
                message: `${teacherName} assigned "${title}"${section?.name ? ` in ${section.name}` : ''}.`,
                notification_type: 'task_assigned',
                reference_id: task.id,
                section_id: sectionId,
                event_key: `task-assigned:${task.id}:${member.user_id}`,
            }))
        )
    }

    // Refresh the tasks page
    revalidatePath('/dashboard/tasks')
}
