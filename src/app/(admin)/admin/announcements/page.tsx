import { requireAdminAccess } from '../lib/require-admin'
import { getAnnouncements } from './actions'
import AnnouncementsClient from './announcements-client'

export default async function AnnouncementsPage() {
  await requireAdminAccess()
  const initialAnnouncements = await getAnnouncements()

  return <AnnouncementsClient initialAnnouncements={initialAnnouncements} />
}
