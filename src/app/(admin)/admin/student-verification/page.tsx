import { getPendingStudents } from './actions'
import { requireAdminAccess } from '../lib/require-admin'
import StudentVerificationClient from './student-verification-client'

/* =========================================
   STUDENT VERIFICATION PAGE (SERVER COMPONENT)
   - Restricts access to admin users only
   - Fetches pending student accounts
   - Passes data to client component
========================================= */
export default async function StudentVerificationPage() {

  /* =========================================
     ACCESS CONTROL
     Ensures only admins can access this page
  ========================================= */
  await requireAdminAccess()

  /* =========================================
     DATA FETCHING
     Retrieves pending student accounts
  ========================================= */
  const initialStudents = await getPendingStudents()

  /* =========================================
     RENDER CLIENT COMPONENT
     Provides initial data for UI rendering
  ========================================= */
  return <StudentVerificationClient initialStudents={initialStudents} />
}