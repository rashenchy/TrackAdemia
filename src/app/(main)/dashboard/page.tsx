import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SubmissionsTable } from '@/components/dashboard/SubmissionsTable'
import { CheckCircle2, LayoutGrid } from 'lucide-react'
import Link from 'next/link'
import RotatingQuote from '@/components/dashboard/RotatingQuote'

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string, section?: string }>
}) {
  const resolvedSearchParams = await searchParams;
  const successMessage = resolvedSearchParams.success;
  const activeSectionId = resolvedSearchParams.section;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name')
    .eq('id', user.id)
    .single();

  let displaySubmissions: any[] = [];
  let teacherSections: any[] = [];
  const isTeacher = profile?.role === 'mentor';

  if (isTeacher) {
    const { data: sections } = await supabase
      .from('sections')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    teacherSections = sections || [];

    if (teacherSections.length > 0) {
      const sectionIds = teacherSections.map(s => s.id);

      const { data: members } = await supabase
        .from('section_members')
        .select('section_id, user_id')
        .in('section_id', sectionIds);

      const studentIds = [...new Set(members?.map(m => m.user_id) || [])];

      if (studentIds.length > 0) {
        const [researchRes, profilesRes] = await Promise.all([
          supabase.from('research').select('*').in('user_id', studentIds).order('created_at', { ascending: false }),
          supabase.from('profiles').select('id, first_name, last_name').in('id', studentIds)
        ]);

        const studentResearch = researchRes.data || [];
        const studentProfiles = profilesRes.data || [];

        const mappedSubmissions: any[] = [];
        studentResearch.forEach(res => {
          const studentMemberships = members?.filter(m => m.user_id === res.user_id) || [];
          let matchedSectionId = null;

          for (const mem of studentMemberships) {
            const sec = teacherSections.find(s => s.id === mem.section_id);
            if (sec && sec.course_code === res.subject_code) {
              matchedSectionId = sec.id;
              break;
            }
          }

          if (!matchedSectionId && studentMemberships.length > 0) {
            matchedSectionId = studentMemberships[0].section_id;
          }

          if (matchedSectionId) {
            const sec = teacherSections.find(s => s.id === matchedSectionId);
            const author = studentProfiles.find(p => p.id === res.user_id);
            mappedSubmissions.push({
              ...res,
              section_id: matchedSectionId,
              section_name: sec?.name,
              author_name: author ? `${author.first_name} ${author.last_name}` : 'Unknown Student'
            });
          }
        });

        if (activeSectionId && activeSectionId !== 'all') {
          displaySubmissions = mappedSubmissions.filter(s => s.section_id === activeSectionId);
        } else {
          displaySubmissions = mappedSubmissions;
        }
      }
    }
  } else {
    const { data: submissions } = await supabase
      .from('research')
      .select('*')
      .or(`user_id.eq.${user.id},members.cs.{${user.id}}`)
      .order('created_at', { ascending: false });

    displaySubmissions = submissions || [];
  }

  // NEW: Fetch annotation counts for the displayed submissions
  if (displaySubmissions.length > 0) {
    const submissionIds = displaySubmissions.map(s => s.id);

    const { data: annotations } = await supabase
      .from('annotations')
      .select('research_id, is_resolved')
      .in('research_id', submissionIds);

    // Map the unresolved count into the submission objects
    displaySubmissions = displaySubmissions.map(sub => {
      const relatedAnnotations = annotations?.filter(a => a.research_id === sub.id) || [];
      const unresolvedCount = relatedAnnotations.filter(a => !a.is_resolved).length;
      return {
        ...sub,
        unresolved_feedback_count: unresolvedCount
      };
    });
  }

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
          Welcome back, {profile?.first_name || user.user_metadata.first_name}!
        </h1>
        <RotatingQuote />
      </div>

      {isTeacher && teacherSections.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase text-gray-500 flex items-center gap-2">
            <LayoutGrid size={16} /> Filter by Section
          </h3>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${!activeSectionId || activeSectionId === 'all'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 dark:shadow-none'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
            >
              All Sections
            </Link>
            {teacherSections.map(sec => (
              <Link
                key={sec.id}
                href={`/dashboard?section=${sec.id}`}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${activeSectionId === sec.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 dark:shadow-none'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
              >
                {sec.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          {isTeacher ? 'Student Submissions' : 'My Submissions'}
          <span className="text-xs font-normal bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-500">
            {displaySubmissions?.length || 0}
          </span>
        </h2>
        <SubmissionsTable submissions={displaySubmissions || []} />
      </div>
    </div>
  )
}