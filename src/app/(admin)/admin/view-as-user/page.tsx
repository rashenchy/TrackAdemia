import { requireAdminAccess } from '../lib/require-admin'
import { beginViewAsUser } from './actions'
import ViewAsUserClient from './view-as-user-client'

export default async function ViewAsUserPage() {
  await requireAdminAccess()

  return <ViewAsUserClient beginViewAsUser={beginViewAsUser} />
}
