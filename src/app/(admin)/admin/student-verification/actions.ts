'use server'

import { createClient } from '@/lib/supabase/server'

interface Student {
  id: string
  first_name: string
  last_name: string
  email?: string
  course_program: string
  student_number?: string | null
  is_verified: boolean
  updated_at: string
}

export async function getPendingStudents(): Promise<Student[]> {
  const supabase = await createClient()

  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, course_program, student_number, is_verified, updated_at')
      .eq('role', 'student')
      .eq('is_verified', false)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending students:', error)
      return []
    }

    const studentsWithEmails: Student[] = []

    if (profiles && profiles.length > 0) {
      for (const profile of profiles) {
        const {
          data: { user },
        } = await supabase.auth.admin.getUserById(profile.id)

        studentsWithEmails.push({
          id: profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: user?.email || 'N/A',
          course_program: profile.course_program,
          student_number: profile.student_number,
          is_verified: profile.is_verified,
          updated_at: profile.updated_at,
        })
      }
    }

    return studentsWithEmails
  } catch (error) {
    console.error('Unexpected error fetching pending students:', error)
    return []
  }
}

export async function verifyStudent(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (!adminProfile || adminProfile.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: true, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      console.error('Error verifying student:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error verifying student:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function rejectStudent(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()

    if (!currentUser) {
      return { success: false, error: 'Not authenticated' }
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single()

    if (!adminProfile || adminProfile.role !== 'admin') {
      return { success: false, error: 'Insufficient permissions' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: false, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      console.error('Error rejecting student:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error rejecting student:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
