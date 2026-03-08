'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTask(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const title = formData.get('title') as string
    const description = formData.get('description') as string

    const { error } = await supabase.from('tasks').insert({
        title,
        description,
        created_by: user.id,
        type: 'student'
    })

    if (error) throw error
    revalidatePath('/dashboard/tasks')
}

export async function deleteTask(taskId: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)

    if (error) throw error
    revalidatePath('/dashboard/tasks')
}

export async function toggleTaskStatus(taskId: string, currentStatus: string, source: 'personal' | 'annotation') {
    const supabase = await createClient()
    const isResolved = currentStatus === 'resolved'
    const newStatus = isResolved ? 'unresolved' : 'resolved'

    if (source === 'personal') {
        await supabase
            .from('tasks')
            .update({ status: newStatus as any })
            .eq('id', taskId)
    } else {
        // Sync with the actual annotation's resolved state
        await supabase
            .from('annotations')
            .update({ is_resolved: !isResolved })
            .eq('id', taskId)
    }

    revalidatePath('/dashboard/tasks')
}

// Add these to src/app/(main)/dashboard/tasks/actions.ts

export async function createSectionTask(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const sectionId = formData.get('sectionId') as string
    const dueDate = formData.get('dueDate') as string

    // 1. Insert the main task record
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

    // 2. Fetch all active students in this section
    const { data: members } = await supabase
        .from('section_members')
        .select('user_id')
        .eq('section_id', sectionId)
        .eq('status', 'active')
        .eq('role', 'student')

    // 3. Initialize completion records for every student
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

    revalidatePath('/dashboard/tasks')
}