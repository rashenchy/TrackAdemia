'use client'

import { useState } from 'react'
import { JoinSectionForm } from './JoinSectionForm'
import { leaveSection } from '@/app/(main)/dashboard/sections/actions'
import { 
  Users, 
  User, 
  GraduationCap, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  LogOut, 
  Loader2 
} from 'lucide-react'

// UI component that displays a student's enrolled sections and classmates
export default function StudentSectionsUI({
  sections,
  classmates,
  currentUserId
}: {
  sections: any[],
  classmates: any[],
  currentUserId: string
}) {

  // Debug logs to inspect incoming data from the server
  console.log('>>> SECTIONS PROP:', sections);
  console.log('>>> CLASSMATES PROP:', classmates);
  console.log('>>> currentUserId:', currentUserId);

  // Track which section is currently expanded
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Track which section is currently being left
  const [isLeaving, setIsLeaving] = useState<string | null>(null);

  // Handle leaving a section with confirmation
  const handleLeave = async (sectionId: string, sectionName: string) => {

    const confirmed = confirm(`Are you sure you want to leave ${sectionName}? This will remove you from the class list.`);
    if (!confirmed) return;

    setIsLeaving(sectionId);

    const result = await leaveSection(sectionId);
    
    if (result?.error) {
      alert(result.error);
    }

    setIsLeaving(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">

      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          My Sections
        </h1>
        <p className="text-gray-500">
          View your active classes and collaborate with classmates.
        </p>
      </div>

      {/* Main Layout Grid */}
      <div className="grid lg:grid-cols-3 gap-8">

        {/* Left Column: Section Cards */}
        <div className="lg:col-span-2 space-y-4">

          {/* Empty State */}
          {sections.length === 0 ? (
            <div className="p-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center text-gray-400 bg-gray-50/50 dark:bg-gray-900/10">
              <GraduationCap size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium text-gray-500">
                You haven't joined any sections yet.
              </p>
              <p className="text-xs">
                Use the form on the right to join your first class.
              </p>
            </div>
          ) : (

            // Render each section card
            sections.map((section: any) => {

              const teacher = section.profiles ?? null;

              // Filter classmates belonging to this section (excluding current user)
              const sectionClassmates = classmates.filter(
                (c: any) =>
                  c.section_id === section.id &&
                  c.profiles?.id !== currentUserId
              );

              return (
                <div
                  key={section.id}
                  className="bg-[var(--background)] border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm hover:border-blue-500/50 transition-all"
                >

                  {/* Section Header Content */}
                  <div className="p-6 flex items-start justify-between">

                    <div>
                      <h3 className="text-xl font-bold text-[var(--foreground)]">
                        {section.name}
                      </h3>

                      <p className="text-sm text-blue-600 font-mono font-bold">
                        {section.course_code}
                      </p>

                      {/* Adviser Information */}
                      <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <User size={16} className="text-blue-500" />
                        <span className="font-medium">Adviser:</span>
                        <span>
                          {teacher
                            ? `${teacher.first_name} ${teacher.last_name}`
                            : 'Unknown Adviser'}
                        </span>
                      </div>
                    </div>

                    {/* Section Actions */}
                    <div className="flex flex-col items-end gap-3">

                      {/* Toggle Classmates Button */}
                      <button
                        onClick={() =>
                          setExpandedSection(
                            expandedSection === section.id ? null : section.id
                          )
                        }
                        className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg"
                      >
                        <Users size={16} />
                        {sectionClassmates.length} Classmates
                        {expandedSection === section.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {/* Leave Section Button */}
                      <button
                        onClick={() => handleLeave(section.id, section.name)}
                        disabled={isLeaving === section.id}
                        className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-red-400 hover:text-red-600 transition-colors px-2 py-1 disabled:opacity-50"
                      >
                        {isLeaving === section.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <LogOut size={12} />
                        )}
                        {isLeaving === section.id ? 'Leaving...' : 'Leave Section'}
                      </button>

                    </div>
                  </div>

                  {/* Expanded Classmates List */}
                  {expandedSection === section.id && (
                    <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2">

                      <div className="grid sm:grid-cols-2 gap-3 mt-4">

                        {/* Empty classmates state */}
                        {sectionClassmates.length === 0 ? (
                          <p className="text-xs text-gray-500 italic col-span-2">
                            No other classmates joined yet.
                          </p>
                        ) : (

                          // Render classmates
                          sectionClassmates.map((c: any) => (
                            <div
                              key={c.profiles?.id}
                              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800"
                            >

                              {/* Avatar Initials */}
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold border border-blue-200 dark:border-blue-800">
                                {c.profiles?.first_name?.[0] ?? "?"}
                                {c.profiles?.last_name?.[0] ?? "?"}
                              </div>

                              {/* Student Information */}
                              <div>
                                <p className="text-xs font-bold text-[var(--foreground)]">
                                  {c.profiles
                                    ? `${c.profiles.first_name} ${c.profiles.last_name}`
                                    : 'Unknown Student'}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                  {c.profiles?.course_program ?? ''}
                                </p>
                              </div>

                            </div>
                          ))
                        )}

                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Join Section Form */}
        <div className="space-y-6">
          <JoinSectionForm />
        </div>

      </div>
    </div>
  );
}