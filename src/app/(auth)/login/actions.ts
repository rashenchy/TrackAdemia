'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) redirect('/login?error=' + encodeURIComponent(error.message))

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const firstName = formData.get('firstName') as string
  const middleName = formData.get('middleName') as string
  const lastName = formData.get('lastName') as string
  const course = formData.get('course') as string
  const role = formData.get('role') as string || 'student'

  // Teachers (mentors) start as unverified; students are verified by default
  const isVerified = role === 'student'

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        course_program: course,
        role: role,
        is_verified: isVerified
      }
    }
  })

  if (error) redirect('/register?error=' + encodeURIComponent(error.message))

  // Feedback message varies based on role
  const successMsg = role === 'mentor' 
    ? 'Account created! Faculty accounts require admin verification before full access.'
    : 'Account created! You can now sign in.'

  redirect('/login?success=' + encodeURIComponent(successMsg))
}