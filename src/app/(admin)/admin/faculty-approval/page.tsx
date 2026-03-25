import { getPendingFaculty } from './actions'
import { requireAdminAccess } from '../lib/require-admin'
import FacultyApprovalClient from './faculty-approval-client'

export default async function FacultyApprovalPage() {
  await requireAdminAccess()
  const initialFaculty = await getPendingFaculty()

  return <FacultyApprovalClient initialFaculty={initialFaculty} />
}
