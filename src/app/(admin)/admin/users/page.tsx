import { requireAdminAccess } from '../lib/require-admin'
import { getAllUsers } from './actions'
import UserManagementClient from './users-client'

export default async function UserManagementPage() {
  await requireAdminAccess()
  const initialUsers = await getAllUsers()

  return <UserManagementClient initialUsers={initialUsers} />
}
