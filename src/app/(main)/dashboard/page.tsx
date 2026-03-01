import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubmissionsTable } from '@/components/dashboard/SubmissionsTable'
import { CheckCircle2 } from 'lucide-react'

export default async function DashboardPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ success?: string }> 
}) {
  const resolvedSearchParams = await searchParams;
  const successMessage = resolvedSearchParams.success;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch research where the user is EITHER the creator OR in the members array
  const { data: submissions } = await supabase
    .from('research')
    .select('*')
    .or(`user_id.eq.${user.id},members.cs.{${user.id}}`)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      {successMessage && (
        <div className="flex items-center gap-2 p-4 mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user.user_metadata.first_name}!
        </h1>
        <p className="text-gray-500 italic">"Research is what I'm doing when I don't know what I'm doing."</p>
      </div>
      
      {/* Expanded to full width by removing grid and UserCard */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          My Submissions
          <span className="text-xs font-normal bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-500">
            {submissions?.length || 0}
          </span>
        </h2>
        <SubmissionsTable submissions={submissions || []} />
      </div>
    </div>
  )
}