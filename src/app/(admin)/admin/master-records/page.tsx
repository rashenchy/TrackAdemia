import { requireAdminAccess } from '../lib/require-admin'
import { getAllResearch } from './actions'
import MasterRecordsClient from './master-records-client'

export default async function MasterRecordsPage() {
  await requireAdminAccess()
  const initialResearch = await getAllResearch()

  return <MasterRecordsClient initialResearch={initialResearch} />
}
