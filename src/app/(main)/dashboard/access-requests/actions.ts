'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { reviewAccessRequest } from '@/lib/research/access-requests/service'

export async function reviewAccessRequestAction(input: {
  researchId: string
  requestId: string
  status: 'approved' | 'rejected'
  reviewerNotes?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized. Please log in.' }
  }

  const result = await reviewAccessRequest(
    {
      requestId: input.requestId,
      status: input.status,
      reviewerNotes: input.reviewerNotes,
    },
    user.id
  )

  if (result.success) {
    revalidatePath('/dashboard/access-requests')
    revalidatePath(`/dashboard/research/${input.researchId}`)
    revalidatePath('/dashboard')
    revalidatePath(`/repository/${input.researchId}`)
  }

  return result
}
