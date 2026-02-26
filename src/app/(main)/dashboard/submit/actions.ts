'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function submitResearch(prevState: any, formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const title = formData.get('title')
  const type = formData.get('type')
  const abstract = formData.get('abstract')
  const subjectCode = formData.get('subjectCode')
  const adviser = formData.get('adviser')
  
  const members = Array.from(formData.entries())
    .filter(([key]) => key.startsWith('member-'))
    .map(([_, value]) => value)

  const { error } = await supabase.from('research').insert({
    title,
    type,
    abstract,
    subject_code: subjectCode,
    adviser_id: adviser || null,
    members: members,
    user_id: user.id,
    status: 'Pending Review'
  })

  if (error) {
    console.error(error)
    return { error: 'Failed to submit research entry.' }
  }

  redirect('/dashboard?success=Research submitted successfully')
}