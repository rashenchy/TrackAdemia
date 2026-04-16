'use client'

import { useState } from 'react'
import { JoinSectionForm } from './JoinSectionForm'
import { leaveSection } from '@/app/(main)/dashboard/sections/actions'
import { usePopup } from '@/components/ui/PopupProvider'
import {
  Users,
  User,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  LogOut,
  Loader2,
} from 'lucide-react'

type StudentSectionTeacher = {
  first_name?: string | null
  last_name?: string | null
}

type StudentSection = {
  id: string
  name: string
  course_code: string
  profiles?: StudentSectionTeacher | null
}

type ClassmateProfile = {
  id: string
  first_name?: string | null
  last_name?: string | null
  course_program?: string | null
}

type ClassmateRecord = {
  section_id: string
  profiles?: ClassmateProfile | null
}

export default function StudentSectionsUI({
  sections,
  classmates,
  currentUserId,
}: {
  sections: StudentSection[]
  classmates: ClassmateRecord[]
  currentUserId: string
}) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [isLeaving, setIsLeaving] = useState<string | null>(null)
  const { confirm, notify } = usePopup()

  const handleLeave = async (sectionId: string, sectionName: string) => {
    const confirmed = await confirm({
      title: `Leave ${sectionName}?`,
      message:
        'You will be removed from the section roster and will need a valid join code if you want to join again later.',
      confirmLabel: 'Leave section',
      variant: 'danger',
    })

    if (!confirmed) return

    setIsLeaving(sectionId)

    const result = await leaveSection(sectionId)

    if (result?.error) {
      notify({
        title: 'Unable to leave section',
        message: result.error,
        variant: 'error',
      })
    } else {
      notify({
        title: 'Section left',
        message: result?.success ?? `You left ${sectionName}.`,
        variant: 'success',
      })
    }

    setIsLeaving(null)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">
          My Sections
        </h1>
        <p className="text-gray-500">
          View your active classes and collaborate with classmates.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {sections.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-12 text-center text-gray-400 dark:border-gray-800 dark:bg-gray-900/10">
              <GraduationCap size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium text-gray-500">
                You haven&apos;t joined any sections yet.
              </p>
              <p className="text-xs">Use the form on the right to join your first class.</p>
            </div>
          ) : (
            sections.map((section) => {
              const teacher = section.profiles ?? null
              const sectionClassmates = classmates.filter(
                (classmate) =>
                  classmate.section_id === section.id &&
                  classmate.profiles?.id !== currentUserId
              )

              return (
                <div
                  key={section.id}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-[var(--background)] shadow-sm transition-all hover:border-blue-500/50 dark:border-gray-800"
                >
                  <div className="flex items-start justify-between p-6">
                    <div>
                      <h3 className="text-xl font-bold text-[var(--foreground)]">
                        {section.name}
                      </h3>

                      <p className="font-mono text-sm font-bold text-blue-600">
                        {section.course_code}
                      </p>

                      <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <User size={16} className="text-blue-500" />
                        <span className="font-medium">Adviser:</span>
                        <span>
                          {teacher
                            ? `${teacher.first_name ?? ''} ${teacher.last_name ?? ''}`.trim() ||
                              'Unknown Adviser'
                            : 'Unknown Adviser'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <button
                        onClick={() =>
                          setExpandedSection(
                            expandedSection === section.id ? null : section.id
                          )
                        }
                        className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs font-bold text-gray-400 transition-colors hover:text-blue-600 dark:bg-gray-800"
                      >
                        <Users size={16} />
                        {sectionClassmates.length} Classmates
                        {expandedSection === section.id ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )}
                      </button>

                      <button
                        onClick={() => handleLeave(section.id, section.name)}
                        disabled={isLeaving === section.id}
                        className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-red-400 transition-colors hover:text-red-600 disabled:opacity-50"
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

                  {expandedSection === section.id ? (
                    <div className="animate-in fade-in slide-in-from-top-2 border-t border-gray-100 px-6 pb-6 pt-2 dark:border-gray-800">
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {sectionClassmates.length === 0 ? (
                          <p className="col-span-2 text-xs italic text-gray-500">
                            No other classmates joined yet.
                          </p>
                        ) : (
                          sectionClassmates.map((classmate) => (
                            <div
                              key={classmate.profiles?.id ?? `${section.id}-unknown`}
                              className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 bg-blue-100 text-[10px] font-bold text-blue-600 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                {classmate.profiles?.first_name?.[0] ?? '?'}
                                {classmate.profiles?.last_name?.[0] ?? '?'}
                              </div>

                              <div>
                                <p className="text-xs font-bold text-[var(--foreground)]">
                                  {classmate.profiles
                                    ? `${classmate.profiles.first_name ?? ''} ${classmate.profiles.last_name ?? ''}`.trim() ||
                                      'Unknown Student'
                                    : 'Unknown Student'}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                  {classmate.profiles?.course_program ?? ''}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })
          )}
        </div>

        <div className="space-y-6">
          <JoinSectionForm />
        </div>
      </div>
    </div>
  )
}
