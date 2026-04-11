/* =========================================
   IMPORTS
   - requireAdminAccess: blocks non-admin users
   - getAnnouncements: fetches announcement data
   - AnnouncementsClient: renders the client UI
========================================= */
import { requireAdminAccess } from '../lib/require-admin'
import { getAnnouncements } from './actions'
import AnnouncementsClient from './announcements-client'

/* =========================================
   PAGE COMPONENT
   - Ensures only admins can access this page
   - Loads initial announcements from the server
   - Passes data to the client component
========================================= */
export default async function AnnouncementsPage() {
  await requireAdminAccess()

  const initialAnnouncements = await getAnnouncements()

  return <AnnouncementsClient initialAnnouncements={initialAnnouncements} />
}