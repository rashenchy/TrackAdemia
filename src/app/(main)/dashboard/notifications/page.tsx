import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-[0.24em] text-slate-500">
          Notifications
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
          Notifications UI is hidden for now
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Notification delivery is still kept in the system, but the dedicated notifications
          screens are temporarily hidden while the workflow is being simplified.
        </p>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          You can still see section removal notices on the home dashboard, and active system
          announcements remain visible there as well.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
          >
            Return to Home
          </Link>
        </div>
      </section>
    </div>
  )
}
