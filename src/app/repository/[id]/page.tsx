import { PublishedResearchDetailView } from '@/components/public/PublishedResearchDetailView'

export default async function PublicResearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ token?: string }>
}) {
  const { id: researchId } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}

  return (
    <PublishedResearchDetailView
      researchId={researchId}
      guestToken={resolvedSearchParams.token || null}
      backHref="/repository"
      embeddedInShell={false}
      showEditPublishedButton={true}
    />
  )
}
