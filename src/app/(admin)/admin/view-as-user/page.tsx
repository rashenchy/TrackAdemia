/* =========================================
   IMPORTS
   - requireAdminAccess: restricts access to admins only
   - beginViewAsUser: server action to switch view mode
   - ViewAsUserClient: client UI component
========================================= */
import { requireAdminAccess } from '../lib/require-admin'
import { beginViewAsUser } from './actions'
import ViewAsUserClient from './view-as-user-client'

/* =========================================
   VIEW AS USER PAGE (SERVER COMPONENT)
   - Ensures only admins can access
   - Passes server action to client
========================================= */
export default async function ViewAsUserPage() {

  /* =========================================
     ACCESS CONTROL
     Redirects if not admin
  ========================================= */
  await requireAdminAccess()

  /* =========================================
     RENDER CLIENT COMPONENT
     Provides action to switch user view mode
  ========================================= */
  return <ViewAsUserClient beginViewAsUser={beginViewAsUser} />
}