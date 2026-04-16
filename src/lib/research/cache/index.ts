import { revalidatePath } from 'next/cache'

export function revalidateResearchDetailPaths(researchId: string) {
  revalidatePath(`/dashboard/research/${researchId}`)
  revalidatePath(`/dashboard/research/${researchId}/annotate`)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/tasks')
}

export function revalidateResearchOverviewPaths(researchId: string) {
  revalidatePath(`/dashboard/research/${researchId}`)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard', 'layout')
  revalidatePath('/dashboard/student-submissions')
  revalidatePath('/dashboard/repository')
}
