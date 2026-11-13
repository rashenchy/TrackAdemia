import { requireAdminAccess } from '@/app/(admin)/admin/lib/require-admin'
import {
  DashboardRepositoryView,
  type RepositorySearchParams,
} from '@/components/dashboard/repository/DashboardRepositoryView'

export default async function AdminRepositoryPage({
  searchParams,
}: {
  searchParams: Promise<RepositorySearchParams>
}) {
  await requireAdminAccess()
  const resolvedParams = await searchParams

  return (
    <DashboardRepositoryView
      searchParams={resolvedParams}
      basePath="/admin/repository"
      detailMode="admin"
    />
  )
}

