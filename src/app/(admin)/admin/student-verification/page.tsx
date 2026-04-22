import { getPendingStudents } from './actions'
import { requireFacultyAccess } from '../lib/require-admin'
import StudentVerificationClient from './student-verification-client'

export default async function StudentVerificationPage() {
  await requireFacultyAccess()
  const initialStudents = await getPendingStudents()

  return <StudentVerificationClient initialStudents={initialStudents} />
}
