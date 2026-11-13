import { PublishedResearchDetailView } from '@/components/public/PublishedResearchDetailView'

export const dynamic = 'force-dynamic'

export default async function DashboardRepositoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <PublishedResearchDetailView
      researchId={id}
      backHref="/dashboard/repository"
      embeddedInShell={true}
      showEditPublishedButton={true}
    />
  )
}

