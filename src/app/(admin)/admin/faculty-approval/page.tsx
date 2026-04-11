import { getPendingFaculty } from './actions'
import { requireAdminAccess } from '../lib/require-admin'
import FacultyApprovalClient from './faculty-approval-client'

/* =========================================
   FACULTY APPROVAL PAGE (SERVER COMPONENT)
   - Restricts access to admins only
   - Fetches pending faculty accounts
   - Passes data to client component
========================================= */
export default async function FacultyApprovalPage() {

  /* =========================================
     ACCESS CONTROL
     Ensures only administrators can proceed
  ========================================= */
  await requireAdminAccess()

  /* =========================================
     DATA FETCHING
     Retrieves pending faculty for approval
  ========================================= */
  const initialFaculty = await getPendingFaculty()

  /* =========================================
     RENDER CLIENT COMPONENT
     Provides initial data for UI rendering
  ========================================= */
  return <FacultyApprovalClient initialFaculty={initialFaculty} />
}