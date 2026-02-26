import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SectionsPageUI from './SectionsPageUI'
import StudentSectionsUI from '@/components/dashboard/StudentSectionsUI'

export default async function SectionsPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const resolvedParams = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  /* =======================
     TEACHER VIEW
  ======================= */
  if (profile?.role === 'mentor') {
    const { data: sections } = await supabase
      .from('sections')
      .select('*')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });

    return (
      <SectionsPageUI
        success={resolvedParams.success}
        sections={sections || []}
      />
    );
  }

  /* =======================
     STUDENT VIEW
  ======================= */

  // 1️⃣ memberships
  const { data: memberships } = await supabase
    .from('section_members')
    .select('section_id')
    .eq('user_id', user.id);

  const sectionIds = memberships?.map(m => m.section_id) ?? [];

  if (sectionIds.length === 0) {
    return (
      <StudentSectionsUI
        sections={[]}
        classmates={[]}
        currentUserId={user.id}
      />
    );
  }

  console.log('DEBUG memberships:', memberships);
  console.log('DEBUG sectionIds:', sectionIds);

  // 2️⃣ sections
  const { data: sections } = await supabase
    .from('sections')
    .select('id, name, course_code, teacher_id')
    .in('id', sectionIds);

  // 3️⃣ teachers
  const teacherIds = sections?.map(s => s.teacher_id) ?? [];

  const { data: teachers } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', teacherIds);

  const sectionsWithTeacher = sections?.map(section => ({
    ...section,
    profiles: teachers?.find(t => t.id === section.teacher_id) ?? null
  })) ?? [];

  // 4️⃣ classmates (safe version — no nested expansion)
  const { data: memberRows } = await supabase
    .from('section_members')
    .select('section_id, user_id')
    .in('section_id', sectionIds);

  const userIds = memberRows?.map(m => m.user_id) ?? [];

  const { data: studentProfiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, course_program')
    .in('id', userIds);

  const classmates =
    memberRows?.map(m => ({
      section_id: m.section_id,
      profiles: studentProfiles?.find(p => p.id === m.user_id) ?? null
    })) ?? [];

  return (
    <StudentSectionsUI
      sections={sectionsWithTeacher}
      classmates={classmates || []}
      currentUserId={user.id}
    />
  );
}