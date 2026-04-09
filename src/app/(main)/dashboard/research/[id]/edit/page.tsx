import { redirect } from 'next/navigation'

export default async function EditResearchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/dashboard/research/${id}/annotate`)
}
