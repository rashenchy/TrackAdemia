import { requireAdminAccess } from '../lib/require-admin'
import { getMonitoringDashboardData } from './actions'
import APIMonitoringClient from './api-monitoring-client'

/* =========================================
   API MONITORING PAGE (SERVER COMPONENT)
   - Protects route (admin only)
   - Fetches monitoring dashboard data
   - Passes data to client component
========================================= */
export default async function APIMonitoringPage() {

  /* =========================================
     ACCESS CONTROL
     Ensures only admins can access this page
  ========================================= */
  await requireAdminAccess()

  /* =========================================
     DATA FETCHING
     Retrieves monitoring metrics and logs
  ========================================= */
  const initialData = await getMonitoringDashboardData()

  /* =========================================
     RENDER CLIENT COMPONENT
     Passes fetched data as props
  ========================================= */
  return <APIMonitoringClient initialData={initialData} />
}