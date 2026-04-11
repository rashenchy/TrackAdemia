import { requireAdminAccess } from '../lib/require-admin'
import { getAllResearch } from './actions'
import MasterRecordsClient from './master-records-client'

/* =========================================
   MASTER RECORDS PAGE (SERVER COMPONENT)
   - Restricts access to admin users only
   - Fetches all research records
   - Passes data to client-side UI
========================================= */
export default async function MasterRecordsPage() {

  /* =========================================
     ACCESS CONTROL
     Ensures only admins can access this page
  ========================================= */
  await requireAdminAccess()

  /* =========================================
     DATA FETCHING
     Retrieves all research records from DB
  ========================================= */
  const initialResearch = await getAllResearch()

  /* =========================================
     RENDER CLIENT COMPONENT
     Provides initial data for rendering
  ========================================= */
  return <MasterRecordsClient initialResearch={initialResearch} />
}