import { requireAdminAccess } from '../lib/require-admin'
import FacultyApprovalClient from './faculty-approval-client'

export default async function FacultyApprovalPage() {
  await requireAdminAccess()
  return <FacultyApprovalClient />
}
