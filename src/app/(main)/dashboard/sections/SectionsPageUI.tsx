'use client'

import { useActionState, useMemo, useState } from 'react'
import { createSection, regenerateJoinCode, toggleSectionFreeze, removeStudent } from './actions'
import { SubmitButton } from '@/components/auth/SubmitButton'
import PaginationControl from '@/components/ui/PaginationControl'
import { usePopup } from '@/components/ui/PopupProvider'
import {
  Plus,
  GraduationCap,
  Copy,
  CheckCircle2,
  AlertCircle,
  Lock,
  Unlock,
  RefreshCw,
  Users,
  FileText,
  Activity,
  X,
  UserMinus,
} from 'lucide-react'

type SectionRosterStudent = {
  user_id: string
  status: string
  joined_at: string
  name: string
  course: string
}

type TeacherSection = {
  id: string
  name: string
  course_code: string
  join_code: string
  is_frozen: boolean
  analytics?: {
    totalStudents: number
    papersUploaded: number
    activeToday: number
    notesCreated: number
  }
  roster: SectionRosterStudent[]
}

export default function SectionsPageUI({
  success,
  sections,
}: {
  success?: string
  sections: TeacherSection[]
}) {
  const [state, formAction] = useActionState(createSection, null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [rosterModal, setRosterModal] = useState<TeacherSection | null>(null)
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null)
  const [sectionsPage, setSectionsPage] = useState(1)
  const [rosterPage, setRosterPage] = useState(1)
  const { confirm, notify, prompt } = usePopup()
  const pageSize = 10

  const pagedSections = useMemo(
    () => sections.slice((sectionsPage - 1) * pageSize, sectionsPage * pageSize),
    [sections, sectionsPage]
  )

  const pagedRoster = useMemo(() => {
    const roster = rosterModal?.roster || []
    return roster.slice((rosterPage - 1) * pageSize, rosterPage * pageSize)
  }, [rosterModal?.roster, rosterPage])

  const handleCopy = async (sectionId: string, text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }

      setCopiedSectionId(sectionId)
      window.setTimeout(() => {
        setCopiedSectionId((current) => (current === sectionId ? null : current))
      }, 1800)
    } catch {
      setCopiedSectionId(null)
    }
  }

  const handleRegenerate = async (id: string) => {
    const confirmed = await confirm({
      title: 'Generate a new join code?',
      message: 'Students will need to use the new code immediately. The current join code will stop working as soon as you continue.',
      confirmLabel: 'Generate code',
    })

    if (!confirmed) return
    setLoadingAction(`regen-${id}`)
    const result = await regenerateJoinCode(id)
    if (result?.error) {
      notify({
        title: 'Unable to generate code',
        message: result.error,
        variant: 'error',
      })
    } else {
      notify({
        title: 'Join code updated',
        message: result?.success ?? 'A new join code is now active for this section.',
        variant: 'success',
      })
    }
    setLoadingAction(null)
  }

  const handleFreeze = async (id: string, isFrozen: boolean) => {
    const confirmed = await confirm({
      title: isFrozen ? 'Unlock this section?' : 'Lock this section?',
      message: isFrozen
        ? 'Students will be able to join this section again using the current join code.'
        : 'This will prevent new students from joining this section until you unlock it again.',
      confirmLabel: isFrozen ? 'Unlock section' : 'Lock section',
    })

    if (!confirmed) return

    setLoadingAction(`freeze-${id}`)
    const result = await toggleSectionFreeze(id, isFrozen)

    if (!result?.error && rosterModal?.id === id) {
      setRosterModal({ ...rosterModal, is_frozen: !isFrozen })
    }

    notify(
      result?.error
        ? {
            title: 'Section update failed',
            message: result.error,
            variant: 'error' as const,
          }
        : {
            title: isFrozen ? 'Section unlocked' : 'Section locked',
            message:
              result?.success ??
              (isFrozen
                ? 'Students can join this section again.'
                : 'New joins are now prevented for this section.'),
            variant: 'success' as const,
          }
    )

    setLoadingAction(null)
  }

  const handleRemove = async (sectionId: string, studentId: string, studentName: string) => {
    const reason = await prompt({
      title: 'Remove student from section',
      message: `Add a short reason for removing ${studentName}. This will be sent to the student as part of the notification.`,
      confirmLabel: 'Continue',
      inputLabel: 'Removal reason',
      inputPlaceholder: 'Explain why the student is being removed...',
      validate: (value) =>
        value.trim().length === 0 ? 'A removal reason is required.' : null,
      variant: 'danger',
    })

    if (!reason) return

    const confirmed = await confirm({
      title: `Remove ${studentName}?`,
      message: `The student will be removed from this roster and notified with your reason: "${reason.trim()}".`,
      confirmLabel: 'Remove student',
      variant: 'danger',
    })

    if (!confirmed) return

    setLoadingAction(`remove-${studentId}`)
    const result = await removeStudent(sectionId, studentId, reason.trim())

    if (!result?.error && rosterModal) {
      setRosterModal({
        ...rosterModal,
        roster: rosterModal.roster.filter((student) => student.user_id !== studentId),
      })
    }

    notify(
      result?.error
        ? {
            title: 'Student removal failed',
            message: result.error,
            variant: 'error' as const,
          }
        : {
            title: 'Student removed',
            message: result?.success ?? `${studentName} has been removed from the section.`,
            variant: 'success' as const,
          }
    )

    setLoadingAction(null)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 relative">
      {(success || state?.error) && (
        <div
          className={`flex items-center gap-2 rounded-xl border p-4 text-sm animate-in fade-in ${
            state?.error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {state?.error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {state?.error || success}
        </div>
      )}

      <div className="flex flex-col gap-2 text-[var(--foreground)]">
        <h1 className="text-3xl font-bold tracking-tight">Manage Sections</h1>
        <p className="text-gray-500">Create new classes and manage your students&apos; research groups.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <form
            action={formAction}
            className="sticky top-6 space-y-4 rounded-2xl border border-gray-200 bg-[var(--background)] p-6 shadow-sm dark:border-gray-800"
          >
            <div className="mb-2 flex items-center gap-2 text-blue-600">
              <Plus size={20} />
              <h2 className="font-bold">New Section</h2>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-gray-500">Section Name</label>
              <input
                name="name"
                required
                placeholder="e.g. BSIT 4-A"
                className="rounded-lg border border-gray-300 bg-transparent p-2.5 text-sm text-[var(--foreground)] outline-none focus:border-blue-600 dark:border-gray-700"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-gray-500">Course Code</label>
              <input
                name="courseCode"
                required
                placeholder="e.g. ITE401"
                className="rounded-lg border border-gray-300 bg-transparent p-2.5 text-sm text-[var(--foreground)] outline-none focus:border-blue-600 dark:border-gray-700"
              />
            </div>
            <SubmitButton className="mt-2 w-full rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
              Create Section
            </SubmitButton>
          </form>
        </div>

        <div className="space-y-4 md:col-span-2">
          <h3 className="flex items-center gap-2 font-bold text-[var(--foreground)]">
            <GraduationCap size={20} className="text-gray-400" />
            Active Sections & Analytics
          </h3>

          <div className="grid gap-6">
            {sections?.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 py-12 text-center text-gray-400 dark:border-gray-700">
                No active sections found. Create one to get started.
              </div>
            ) : (
              pagedSections.map((section) => (
                <div
                  key={section.id}
                  className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-[var(--background)] p-6 shadow-sm dark:border-gray-800"
                >
                  {section.is_frozen && (
                    <div className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-lg bg-amber-500 px-3 py-1 text-[10px] font-bold text-white">
                      <Lock size={12} /> FROZEN
                    </div>
                  )}

                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <h4 className="text-2xl font-bold text-[var(--foreground)]">{section.name}</h4>
                      <p className="font-mono text-sm text-gray-500">{section.course_code}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFreeze(section.id, section.is_frozen)}
                        className={`rounded-lg border p-2 transition-all ${
                          section.is_frozen
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                        title={section.is_frozen ? 'Unfreeze Section' : 'Freeze Section (Block Joins)'}
                      >
                        {loadingAction === `freeze-${section.id}` ? (
                          <RefreshCw size={18} className="animate-spin" />
                        ) : section.is_frozen ? (
                          <Lock size={18} />
                        ) : (
                          <Unlock size={18} />
                        )}
                      </button>
                      <button
                        onClick={() => handleRegenerate(section.id)}
                        className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-600 transition-all hover:border-blue-200 hover:text-blue-600"
                        title="Regenerate Join Code"
                      >
                        <RefreshCw
                          size={18}
                          className={loadingAction === `regen-${section.id}` ? 'animate-spin' : ''}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-blue-100/50 bg-blue-50/50 p-3 dark:border-blue-800/30 dark:bg-blue-900/10">
                      <div className="mb-1 flex items-center gap-1.5 text-blue-600">
                        <Users size={14} /> <span className="text-[10px] font-bold uppercase tracking-wider">Students</span>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-gray-100">
                        {section.analytics?.totalStudents}
                      </p>
                    </div>
                    <div className="rounded-xl border border-green-100/50 bg-green-50/50 p-3 dark:border-green-800/30 dark:bg-green-900/10">
                      <div className="mb-1 flex items-center gap-1.5 text-green-600">
                        <FileText size={14} /> <span className="text-[10px] font-bold uppercase tracking-wider">Papers</span>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-gray-100">
                        {section.analytics?.papersUploaded}
                      </p>
                    </div>
                    <div className="rounded-xl border border-purple-100/50 bg-purple-50/50 p-3 dark:border-purple-800/30 dark:bg-purple-900/10">
                      <div className="mb-1 flex items-center gap-1.5 text-purple-600">
                        <Activity size={14} /> <span className="text-[10px] font-bold uppercase tracking-wider">Active</span>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-gray-100">
                        {section.analytics?.activeToday}
                      </p>
                    </div>
                    <div className="rounded-xl border border-amber-100/50 bg-amber-50/50 p-3 dark:border-amber-800/30 dark:bg-amber-900/10">
                      <div className="mb-1 flex items-center gap-1.5 text-amber-600">
                        <FileText size={14} /> <span className="text-[10px] font-bold uppercase tracking-wider">Notes</span>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-gray-100">
                        {section.analytics?.notesCreated}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase text-gray-400">Join Code:</span>
                      <span className="rounded-md bg-gray-100 px-3 py-1 font-mono text-lg font-black tracking-widest text-[var(--foreground)] dark:bg-gray-800">
                        {section.join_code}
                      </span>
                      <button
                        onClick={() => handleCopy(section.id, section.join_code)}
                        className="text-gray-400 transition-colors hover:text-blue-600"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setRosterPage(1)
                        setRosterModal(section)
                      }}
                      className="text-sm font-semibold text-blue-600 transition-all hover:text-blue-700 hover:underline"
                    >
                      Manage Roster &rarr;
                    </button>
                  </div>
                  {copiedSectionId === section.id && (
                    <div className="pointer-events-none absolute bottom-4 right-6 z-10 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg animate-in fade-in duration-200">
                      Join code copied
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-[var(--background)] px-5 py-4 shadow-sm dark:border-gray-800">
            <PaginationControl
              page={sectionsPage}
              pageSize={pageSize}
              totalCount={sections.length}
              onPageChange={setSectionsPage}
            />
          </div>
        </div>
      </div>

      {rosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-[var(--background)] shadow-2xl dark:border-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-6 dark:border-gray-800 dark:bg-gray-900/50">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-bold text-[var(--foreground)]">
                  <Users size={20} className="text-blue-600" />
                  {rosterModal.name} Roster
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Manage students and remove members with a recorded reason.
                </p>
              </div>
              <button
                onClick={() => {
                  setRosterModal(null)
                  setRosterPage(1)
                }}
                className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-6">
              {rosterModal.roster?.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <Users size={40} className="mx-auto mb-3 opacity-20" />
                  <p>No students have joined this section yet.</p>
                </div>
              ) : (
                pagedRoster.map((student) => (
                  <div
                    key={student.user_id}
                    className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-200 bg-blue-100 text-sm font-bold text-blue-600">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[var(--foreground)]">{student.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <span className="font-mono uppercase">{student.course}</span>
                          <span>&bull;</span>
                          <span>Joined {new Date(student.joined_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRemove(rosterModal.id, student.user_id, student.name)}
                        disabled={loadingAction === `remove-${student.user_id}`}
                        className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100"
                        title="Remove student from roster and send a reason"
                      >
                        <UserMinus size={14} />
                        {loadingAction === `remove-${student.user_id}` ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-gray-100 bg-gray-50/50 p-6 dark:border-gray-800 dark:bg-gray-900/50">
              <PaginationControl
                page={rosterPage}
                pageSize={pageSize}
                totalCount={rosterModal.roster?.length || 0}
                onPageChange={setRosterPage}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
