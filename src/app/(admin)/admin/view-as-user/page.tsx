import { requireAdminAccess } from '../lib/require-admin'
import { getDashboardStats, getFeaturedResearch } from './actions'
import ViewAsUserClient from './view-as-user-client'

export default async function ViewAsUserPage() {
  await requireAdminAccess()

  const [initialStats, initialFeatured] = await Promise.all([
    getDashboardStats(),
    getFeaturedResearch(),
  ])

  return (
    <ViewAsUserClient
      initialStats={initialStats}
      initialFeatured={initialFeatured}
    />
  )
}
