import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Calendar, GraduationCap, Users, FileText, Hash } from 'lucide-react'
import { PublicDownloadButton } from '@/components/public/PublicDownloadButton'

export default async function PublicResearchPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const researchId = resolvedParams.id

  const supabase = await createClient()

  // 1. Fetch Research (STRICTLY PUBLISHED ONLY)
  const { data: research, error } = await supabase
    .from('research')
    .select('*')
    .eq('id', researchId)
    .eq('status', 'Published') // SECURITY: Enforce public access rule
    .single()

  if (error || !research) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <BookOpen size={48} className="text-gray-300 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800">Research Not Found</h1>
        <p className="text-gray-500 mt-2">This paper may not exist or has not been published yet.</p>
        <Link href="/dashboard/repository" className="mt-6 text-blue-600 hover:underline font-medium">
          Return to Repository
        </Link>
      </div>
    )
  }

  // 2. Fetch Authors
  let authorNames = 'Unknown Authors'
  if (research.members && research.members.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .in('id', research.members)
    
    if (profiles) {
      authorNames = profiles.map(p => `${p.first_name} ${p.last_name}`).join(', ')
    }
  }

  // 3. Fetch ONLY the Latest Manuscript
  const { data: latestVersion } = await supabase
    .from('research_versions')
    .select('file_url, created_at')
    .eq('research_id', researchId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  const fileUrlToDownload = latestVersion?.file_url || research.file_url

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-[var(--foreground)] py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation */}
        <Link 
          href="/dashboard/repository" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Repository Search
        </Link>

        {/* Paper Header */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-black uppercase tracking-widest rounded-md">
                {research.type}
              </span>
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-black uppercase tracking-widest rounded-md">
                {research.research_area || 'General'}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-black leading-tight text-gray-900 dark:text-gray-100">
              {research.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400 font-medium pt-2">
              <span className="flex items-center gap-2"><Users size={16} /> {authorNames}</span>
              <span className="flex items-center gap-2"><Calendar size={16} /> {new Date(research.created_at).getFullYear()}</span>
              {research.subject_code && (
                <span className="flex items-center gap-2"><GraduationCap size={16} /> {research.subject_code}</span>
              )}
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* Abstract */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText size={18} className="text-blue-600" /> Abstract
            </h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {research.abstract}
            </p>
          </div>

          {/* Keywords */}
          {research.keywords && research.keywords.length > 0 && (
            <div className="pt-4 flex flex-wrap items-center gap-2">
              <Hash size={16} className="text-gray-400" />
              {(Array.isArray(research.keywords) ? research.keywords : research.keywords.split(',')).map((kw: string, i: number) => (
                <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1.5 rounded-lg font-medium">
                  {kw.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Download Section */}
        <div className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-3xl border border-blue-100 dark:border-blue-900/30 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div>
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">Read the full research</h3>
            <p className="text-sm text-blue-700/80 dark:text-blue-300/80 mt-1">
              Download the latest published manuscript.
            </p>
          </div>
          
          {fileUrlToDownload ? (
            <PublicDownloadButton fileUrl={fileUrlToDownload} />
          ) : (
            <span className="text-sm text-gray-500 italic">No manuscript available</span>
          )}
        </div>

      </div>
    </div>
  )
}