import { requireAdminAccess } from '@/app/(admin)/admin/lib/require-admin'
import { PublishedResearchDetailView } from '@/components/public/PublishedResearchDetailView'

export default async function AdminRepositoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdminAccess()
  const { id } = await params

  return (
    <PublishedResearchDetailView
      researchId={id}
      backHref="/admin/repository"
      embeddedInShell={true}
      showEditPublishedButton={false}
    />
  )
}

