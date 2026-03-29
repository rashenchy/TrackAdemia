import { requireAdminAccess } from '../lib/require-admin'
import { getMonitoringDashboardData } from './actions'
import APIMonitoringClient from './api-monitoring-client'

export default async function APIMonitoringPage() {
  await requireAdminAccess()
  const initialData = await getMonitoringDashboardData()

  return <APIMonitoringClient initialData={initialData} />
}
