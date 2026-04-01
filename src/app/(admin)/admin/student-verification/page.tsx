import { getPendingStudents } from './actions'
import { requireAdminAccess } from '../lib/require-admin'
import StudentVerificationClient from './student-verification-client'

export default async function StudentVerificationPage() {
  await requireAdminAccess()
  const initialStudents = await getPendingStudents()

  return <StudentVerificationClient initialStudents={initialStudents} />
}
