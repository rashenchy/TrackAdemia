import {
  DashboardRepositoryView,
  type RepositorySearchParams,
} from '@/components/dashboard/repository/DashboardRepositoryView'

export default async function RepositoryPage({
  searchParams,
}: {
  searchParams: Promise<RepositorySearchParams>
}) {
  const resolvedParams = await searchParams

  return (
    <DashboardRepositoryView
      searchParams={resolvedParams}
      basePath="/dashboard/repository"
      detailMode="dashboard"
    />
  )
}
