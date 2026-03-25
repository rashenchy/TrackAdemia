'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'


export async function login(formData: FormData) {

  // Initialize Supabase server client
  const supabase = await createClient()


  // Extract login credentials from the submitted form
  const email = formData.get('email') as string
  const password = formData.get('password') as string


  // Attempt authentication using Supabase email/password login
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })


  // If authentication fails, redirect back to login with error message
  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message))
  }


  const {
    data: { user },
  } = await supabase.auth.getUser()

  let redirectPath = '/dashboard'

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin') {
      redirectPath = '/admin'
    }
  }

  // Refresh cached layout data and redirect user to the correct dashboard
  revalidatePath('/', 'layout')
  redirect(redirectPath)
}



export async function signup(formData: FormData) {

  // Initialize Supabase server client
  const supabase = await createClient()


  // Extract user registration data from the submitted form
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const firstName = formData.get('firstName') as string
  const middleName = formData.get('middleName') as string
  const lastName = formData.get('lastName') as string
  const course = formData.get('course') as string
  const role = formData.get('role') as string || 'student'


  // Determine if the account should start as verified
  // Students are verified immediately while mentors require admin approval
  const isVerified = role === 'student'


  // Create a new Supabase authentication account and store additional profile metadata
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


  // If account creation fails, redirect back to registration page with error message
  if (error) {
    redirect('/register?error=' + encodeURIComponent(error.message))
  }


  // Generate a success message depending on whether the user is a student or mentor
  const successMsg =
    role === 'mentor'
      ? 'Account created! Faculty accounts require admin verification before full access.'
      : 'Account created! You can now sign in.'


  // Redirect user to login page with success confirmation message
  redirect('/login?success=' + encodeURIComponent(successMsg))
}
