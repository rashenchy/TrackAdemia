'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
    source: 'personal' | 'annotation'
) {

    // Initialize Supabase
    const supabase = await createClient()

    // Determine the new status
    const isResolved = currentStatus === 'resolved'
    const newStatus = isResolved ? 'unresolved' : 'resolved'

    // Update a personal task status
    if (source === 'personal') {

        await supabase
            .from('tasks')
            .update({ status: newStatus as any })
            .eq('id', taskId)

    } else {

        // Update the linked annotation status instead
        await supabase
            .from('annotations')
            .update({ is_resolved: !isResolved })
            .eq('id', taskId)
    }

    // Refresh the tasks page
    revalidatePath('/dashboard/tasks')
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
            type: 'teacher'
        })
        .select()
        .single()

    if (taskError) throw taskError

    // Fetch all active students in the section
    const { data: members } = await supabase
        .from('section_members')
        .select('user_id')
        .eq('section_id', sectionId)
        .eq('status', 'active')
        .eq('role', 'student')

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
    }

    // Refresh the tasks page
    revalidatePath('/dashboard/tasks')
}