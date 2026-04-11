import { requireAdminAccess } from '../lib/require-admin'
import { getAllUsers } from './actions'
import UserManagementClient from './users-client'

/* =========================================
   USER MANAGEMENT PAGE (SERVER COMPONENT)
   - Restricts access to admin users only
   - Fetches all user accounts
   - Passes data to client component
========================================= */
export default async function UserManagementPage() {

  /* =========================================
     ACCESS CONTROL
     Ensures only admins can access this page
  ========================================= */
  await requireAdminAccess()

  /* =========================================
     DATA FETCHING
     Retrieves all users from database
  ========================================= */
  const initialUsers = await getAllUsers()

  /* =========================================
     RENDER CLIENT COMPONENT
     Provides initial data for UI rendering
  ========================================= */
  return <UserManagementClient initialUsers={initialUsers} />
}