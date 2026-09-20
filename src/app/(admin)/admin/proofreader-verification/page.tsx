import { getPendingProofreaders } from './actions'
import { requireFacultyAccess } from '../lib/require-admin'
import ProofreaderVerificationClient from './proofreader-verification-client'

export default async function ProofreaderVerificationPage() {
  await requireFacultyAccess()
  const initialProofreaders = await getPendingProofreaders()

  return <ProofreaderVerificationClient initialProofreaders={initialProofreaders} />
}
