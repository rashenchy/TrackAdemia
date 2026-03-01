import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Calendar, Users, GraduationCap, Download } from 'lucide-react'
import { DocumentDownloadButton } from './DocumentDownloadButton'

// This generates a dynamic page based on the ID in the URL
export default async function ViewResearchPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const researchId = resolvedParams.id;
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch the specific research paper details
  const { data: research } = await supabase
    .from('research')
    .select('*')
    .eq('id', researchId)
    .single()

  if (!research) {
    return <div className="p-8">Research not found or you don't have access.</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header & Back Button */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Research Details</h1>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase
          ${research.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {research.status}
        </span>
      </div>

      {/* Identity Section */}
      <div className="bg-[var(--background)] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
          <FileText className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold text-[var(--foreground)]">Identity</h2>
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-gray-500">Title</label>
          <p className="text-xl font-semibold text-[var(--foreground)]">{research.title}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Type</label>
            <p className="text-md capitalize">{research.type}</p>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-gray-500">Abstract</label>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">{research.abstract}</p>
        </div>
      </div>

      {/* Academic & Timeline Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[var(--background)] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
            <GraduationCap className="text-blue-600" size={20} />
            <h2 className="text-lg font-bold text-[var(--foreground)]">Academic</h2>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Subject Code</label>
            <p className="text-md">{research.subject_code || 'N/A'}</p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Research Area</label>
            <p className="text-md">{research.research_area || 'N/A'}</p>
          </div>
        </div>

        <div className="bg-[var(--background)] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
            <Calendar className="text-blue-600" size={20} />
            <h2 className="text-lg font-bold text-[var(--foreground)]">Timeline</h2>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">Stage</label>
            <p className="text-md">{research.current_stage || 'N/A'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-gray-500">Start Date</label>
              <p className="text-sm">{research.start_date || 'N/A'}</p>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-500">Defense Date</label>
              <p className="text-sm">{research.target_defense_date || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Files Section (Download Button) */}
      <div className="bg-[var(--background)] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Attached Document</h2>
          <p className="text-xs text-gray-500">Download the currently uploaded manuscript.</p>
        </div>
        
        {research.file_url ? (
          <DocumentDownloadButton fileUrl={research.file_url} />
        ) : (
          <span className="text-sm text-gray-400 italic">No document attached.</span>
        )}
      </div>
    </div>
  )
}