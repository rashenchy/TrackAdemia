'use client'

import { useState, useEffect, useActionState, useRef } from 'react'
import { Plus, Trash2, FileText, GraduationCap, Users, Calendar, Paperclip, Info, AlertCircle, Search } from 'lucide-react'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { submitResearch } from '@/app/(main)/dashboard/submit/actions'
import { updateResearch } from '@/app/(main)/dashboard/research/[id]/edit/actions'

type FormState = {
  id?: string
  error?: string
}

type ClassmateOption = {
  id: string
  name: string
  sectionName: string
}

type AdviserOption = {
  id: string
  name: string
}

type SectionAdviserOption = {
  id: string
  name: string
}

function MemberComboBox({
  index, classmates, value, onChange, isDraftMode
}: {
  index: number, classmates: ClassmateOption[], value: string, onChange: (val: string) => void, isDraftMode: boolean
}) {
  // Search and dropdown state
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Sync input value with external prop
  useEffect(() => {
    if (value) {
      const match = classmates.find(c => c.id === value)
      if (match) setSearch(`${match.name} (${match.sectionName})`)
    }
  }, [value, classmates])

  // Filter logic for member search
  const filtered = classmates.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.sectionName.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative flex-1">
      <input type="hidden" name={`member-${index}`} value={value} />

      <div className="relative">
        <input
          type="text"
          value={search}
          placeholder="Type to search classmates..."
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onChange={(e) => {
            setSearch(e.target.value)
            setIsOpen(true)
            onChange('')
          }}
          required={!value && !isDraftMode}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 text-sm bg-white dark:bg-gray-800 text-[var(--foreground)] outline-none focus:border-blue-600 transition-all"
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-56 overflow-y-auto overflow-x-hidden">
          {filtered.length > 0 ? (
            filtered.map(c => (
              <div
                key={c.id}
                onClick={() => {
                  onChange(c.id)
                  setSearch(`${c.name} (${c.sectionName})`)
                  setIsOpen(false)
                }}
                className="px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm border-b border-gray-50 dark:border-gray-700 last:border-0"
              >
                <p className="font-semibold text-gray-900 dark:text-gray-100">{c.name}</p>
                <p className="text-[10px] text-gray-500">{c.sectionName}</p>
              </div>
            ))
          ) : (
            <div className="px-3 py-4 text-sm text-center text-amber-600 bg-amber-50 dark:bg-amber-900/20 flex flex-col items-center gap-1">
              <AlertCircle size={18} />
              <p className="font-bold">No matches found.</p>
              <p className="text-[10px] text-amber-500 max-w-[200px] leading-tight mt-1">
                Try checking the spelling or ensure they have joined the section.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function ResearchSubmissionForm({
  classmates = [],
  sections = [],
  adviserOptions = [],
  sectionAdvisers = {},
  initialData = null,
  editId = null
}: {
  classmates?: ClassmateOption[],
  sections?: { id: string, name: string, course_code: string }[],
  adviserOptions?: AdviserOption[],
  sectionAdvisers?: Record<string, SectionAdviserOption>,
  initialData?: {
    title?: string
    type?: string
    abstract?: string
    keywords?: string[] | string
    members?: string[]
    member_roles?: string[]
    subject_code?: string
    adviser_id?: string | null
    research_area?: string | null
    start_date?: string | null
    target_defense_date?: string | null
    current_stage?: string | null
    file_url?: string | null
  } | null,
  editId?: string | null
}) {
  // Form mode and submission status
  const [currentId, setCurrentId] = useState(editId)
  const [isDraftMode, setIsDraftMode] = useState(false)

  // Select appropriate action based on edit or new submission
  const actionToUse = async (prevState: FormState | null, formData: FormData) => {
    if (currentId) {
      return updateResearch(currentId, prevState, formData)
    }
    return submitResearch(prevState, formData)
  }

  const [state, formAction] = useActionState<FormState | null, FormData>(
    actionToUse,
    null
  )

  const formRef = useRef<HTMLFormElement>(null)

  // Group members initialization
  const defaultMembers = initialData?.members?.length ? initialData.members ?? [''] : ['']
  const defaultRoles = initialData?.member_roles?.length ? initialData.member_roles ?? [''] : ['']

  const [isGroup, setIsGroup] = useState(Boolean(initialData?.members?.length))
  const [members, setMembers] = useState<string[]>(defaultMembers)
  const [roles, setRoles] = useState<string[]>(defaultRoles)
  const [selectedResearchType, setSelectedResearchType] = useState(
    initialData?.type || 'capstone'
  )

  // Keyword list initialization
  const defaultKeywords = Array.isArray(initialData?.keywords)
    ? initialData.keywords
    : initialData?.keywords
      ? initialData.keywords.split(',').map((k: string) => k.trim())
      : ['']

  const [keywordsList, setKeywordsList] = useState<string[]>(defaultKeywords)
  const [selectedSubjectCode, setSelectedSubjectCode] = useState(initialData?.subject_code || '')
  const [selectedAdviserId, setSelectedAdviserId] = useState(initialData?.adviser_id || '')
  const [useExternalAdviser, setUseExternalAdviser] = useState(
    Boolean(initialData?.adviser_id)
  )

  const adviserSelectOptions = adviserOptions.some(
    (adviser) => adviser.id === selectedAdviserId
  )
    ? adviserOptions
    : selectedAdviserId
      ? [
        ...adviserOptions,
        {
          id: selectedAdviserId,
          name: `Saved adviser (${selectedAdviserId})`,
        },
      ]
      : adviserOptions

  // Dynamic keyword handlers
  const addKeyword = () => setKeywordsList([...keywordsList, ''])
  const removeKeyword = (index: number) => setKeywordsList(keywordsList.filter((_, i) => i !== index))
  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...keywordsList]
    newKeywords[index] = value
    setKeywordsList(newKeywords)
  }

  // Dynamic member handlers
  const addMember = () => {
    setMembers([...members, ''])
    setRoles([...roles, ''])
  }
  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index))
    setRoles(roles.filter((_, i) => i !== index))
  }
  const handleMemberSelection = (index: number, newId: string) => {
    const newMembers = [...members]
    newMembers[index] = newId
    setMembers(newMembers)
  }

  // Form reset logic
  const clearForm = () => {
    setMembers([''])
    setRoles([''])
    setKeywordsList([''])
    setIsGroup(false)
    setSelectedResearchType('capstone')
    setSelectedSubjectCode('')
    setSelectedAdviserId('')
    setUseExternalAdviser(false)
    formRef.current?.reset()
  }

  // Lifecycle effects
  useEffect(() => {
    if (state && !state.error && !editId && !state?.id) {
      clearForm()
    }
  }, [state, editId])

  useEffect(() => {
    if (state?.id) {
      setCurrentId(state.id)
    }
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="space-y-8">
      <input type="hidden" name="isDraft" value={isDraftMode ? 'true' : 'false'} />

      {/* Error notification */}
      {state?.error && (
        <div className="flex items-center justify-between gap-3 p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span>{state.error}</span>
          </div>
          <button type="button" onClick={() => window.location.reload()} className="text-xs font-bold text-red-600 hover:underline">
            Refresh
          </button>
        </div>
      )}

      {/* Identity section */}
      <div className="bg-[var(--background)] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
          <FileText className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold text-[var(--foreground)]">Identity</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[var(--foreground)]">Research Title</label>
            <input name="title" defaultValue={initialData?.title} required={!isDraftMode} placeholder="Enter full research title" className="rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-[var(--foreground)] focus:border-blue-600 outline-none transition-all" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[var(--foreground)]">Research Type</label>
            <select
              name="type"
              value={selectedResearchType}
              onChange={(e) => {
                const nextType = e.target.value
                setSelectedResearchType(nextType)

                if (nextType !== 'capstone') {
                  setUseExternalAdviser(false)
                  setSelectedAdviserId('')
                }
              }}
              className="rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-[var(--foreground)] outline-none focus:border-blue-600 transition-all cursor-pointer"
            >
              <option value="capstone">Capstone Project</option>
              <option value="case-study">Case Study</option>
              <option value="dissertation">Dissertation</option>
              <option value="research">General Research</option>
              <option value="proposal">Research Proposal</option>
              <option value="thesis">Thesis</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mt-2">
          <label className="text-sm font-semibold text-[var(--foreground)]">Abstract / Description</label>
          <textarea name="abstract" defaultValue={initialData?.abstract} rows={4} required={!isDraftMode} placeholder="Summarize your research goals..." className="rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-[var(--foreground)] focus:border-blue-600 outline-none resize-none transition-all" />
        </div>

        {/* Dynamic keywords section */}
        <div className="flex flex-col gap-2 mt-6 p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="text-sm font-semibold text-[var(--foreground)]">Keywords / Tags</label>
              <p className="text-[10px] text-gray-500">Add individual keywords to help others find your research.</p>
            </div>
            <button type="button" onClick={addKeyword} className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 font-semibold transition-colors">
              <Plus size={14} /> Add Keyword
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            {keywordsList.map((kw, index) => (
              <div key={index} className="flex items-center gap-1 relative bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 focus-within:border-blue-500 transition-all">
                <input
                  name="keywords"
                  value={kw}
                  onChange={(e) => updateKeyword(index, e.target.value)}
                  placeholder="e.g. AI"
                  className="p-2 w-28 sm:w-32 text-sm bg-transparent text-[var(--foreground)] outline-none"
                />
                {keywordsList.length > 1 && (
                  <button type="button" onClick={() => removeKeyword(index)} className="text-red-400 hover:text-red-600 transition-colors p-2 border-l border-gray-100 dark:border-gray-700">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Academic section */}
      <div className="bg-[var(--background)] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
          <GraduationCap className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold text-[var(--foreground)]">Academic</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[var(--foreground)]">Subject Code</label>
            <select
              name="subjectCode"
              value={selectedSubjectCode}
              onChange={(e) => {
                const nextSubjectCode = e.target.value
                setSelectedSubjectCode(nextSubjectCode)
              }}
              required={!isDraftMode}
              className="rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-[var(--foreground)] outline-none focus:border-blue-600 transition-all cursor-pointer"
            >
              <option value="" disabled>Select subject code...</option>
              {sections.length === 0 && <option value="" disabled>No sections joined</option>}
              {sections.map(s => (
                <option key={s.id} value={s.course_code}>{s.course_code} ({s.name})</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-[var(--foreground)]">Adviser</label>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900/40">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Section Adviser
              </p>
              <p className="mt-1 text-[var(--foreground)]">
                {sectionAdvisers[selectedSubjectCode]?.name || 'No section adviser found for the selected subject code.'}
              </p>
            </div>
            {selectedResearchType === 'capstone' ? (
              <>
                <label className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={useExternalAdviser}
                    onChange={(e) => {
                      const shouldUseExternalAdviser = e.target.checked
                      setUseExternalAdviser(shouldUseExternalAdviser)

                      if (!shouldUseExternalAdviser) {
                        setSelectedAdviserId('')
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  />
                  Add external adviser
                </label>
                <select
                  name="adviser"
                  value={selectedAdviserId}
                  onChange={(e) => setSelectedAdviserId(e.target.value)}
                  disabled={!useExternalAdviser}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-[var(--foreground)] outline-none focus:border-blue-600 transition-all cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
                >
                  <option value="">Select external adviser...</option>
                  {adviserSelectOptions.map((adviser) => (
                    <option key={adviser.id} value={adviser.id}>
                      {adviser.name}
                    </option>
                  ))}
                </select>
                {!useExternalAdviser && (
                  <p className="text-[11px] text-gray-500">
                    The section adviser is the default adviser and already has access to this research.
                  </p>
                )}
                {useExternalAdviser && (
                  <p className="text-[11px] text-gray-500">
                    Use this only when your capstone project has an additional external adviser.
                  </p>
                )}
              </>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[var(--foreground)]">Research Area</label>
            <input name="researchArea" defaultValue={initialData?.research_area || ""} placeholder="e.g. Web Development, AI" className="rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-[var(--foreground)] outline-none focus:border-blue-600 transition-all" />
          </div>
        </div>
      </div>

      {/* Group members section */}
      <div className="bg-[var(--background)] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-2">
            <Users className="text-blue-600" size={20} />
            <h2 className="text-lg font-bold text-[var(--foreground)]">Group</h2>
          </div>
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button type="button" onClick={() => setIsGroup(false)} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${!isGroup ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500'}`}>Individual</button>
            <button type="button" onClick={() => setIsGroup(true)} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${isGroup ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500'}`}>Group</button>
          </div>
        </div>

        {isGroup && (
          <div className="space-y-4 bg-gray-50/50 dark:bg-gray-900/30 p-5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Members & Roles</label>
                <p className="text-[10px] text-gray-400">Search to assign members and define their responsibilities.</p>
              </div>
              <button type="button" onClick={addMember} className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors">
                <Plus size={14} /> Add Member
              </button>
            </div>

            <div className="grid gap-4">
              {members.map((memberId, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-3 group relative">
                  <MemberComboBox
                    index={index}
                    classmates={classmates}
                    value={memberId}
                    onChange={(val) => handleMemberSelection(index, val)}
                    isDraftMode={isDraftMode}
                  />
                  <input
                    name={`role-${index}`}
                    required={!isDraftMode}
                    defaultValue={roles[index] || ""}
                    placeholder="Role (e.g. Lead Programmer)"
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 text-sm bg-white dark:bg-gray-800 text-[var(--foreground)] outline-none focus:border-blue-600 transition-all"
                  />
                  {members.length > 1 && (
                    <button type="button" onClick={() => removeMember(index)} className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-100 flex-shrink-0">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timeline section */}
      <div className="bg-[var(--background)] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-4">
          <Calendar className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold text-[var(--foreground)]">Timeline</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[var(--foreground)]">Start Date</label>
            <input type="date" name="startDate" defaultValue={initialData?.start_date || ""} required={!isDraftMode} className="rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-[var(--foreground)] outline-none focus:border-blue-600 transition-all cursor-text" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[var(--foreground)]">Target Defense Date</label>
            <input type="date" name="targetDefenseDate" defaultValue={initialData?.target_defense_date || ""} className="rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-[var(--foreground)] outline-none focus:border-blue-600 transition-all cursor-text" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[var(--foreground)]">Current Stage</label>
            <select name="currentStage" defaultValue={initialData?.current_stage || "Proposal"} className="rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-[var(--foreground)] outline-none focus:border-blue-600 transition-all cursor-pointer">
              <option value="Proposal">Proposal</option>
              <option value="Chapter 1-3">Chapter 1-3</option>
              <option value="Final Manuscript">Final Manuscript</option>
            </select>
          </div>
        </div>
      </div>

      {/* Files section */}
      <div className="bg-[var(--background)] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-2">
            <Paperclip className="text-blue-600" size={20} />
            <h2 className="text-lg font-bold text-[var(--foreground)]">Files (PDF Only)</h2>
          </div>
          {initialData?.file_url && (
            <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200 font-medium">
              File already attached
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[var(--foreground)]">
            {editId ? "Update Document (Leave empty to keep existing)" : "Initial Document (Optional)"}
          </label>
          <input
            type="file"
            name="initialDocument"
            accept=".pdf"
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/20 dark:file:text-blue-400 dark:hover:file:bg-blue-900/40 transition-all cursor-pointer border border-gray-300 dark:border-gray-700 rounded-lg"
          />
        </div>
      </div>

      {/* Form actions */}
      <div className="flex flex-col md:flex-row justify-end gap-4 pt-4">
        <button
          type="submit"
          onClick={() => setIsDraftMode(true)}
          className="px-8 py-4 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 transition-all"
        >
          Save Draft
        </button>
        <SubmitButton
          onClick={() => setIsDraftMode(false)}
          className="w-full md:w-auto px-12 bg-blue-600 text-white rounded-xl py-4 font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none text-lg"
        >
          {currentId ? "Resubmit Research" : "Submit Research"}
        </SubmitButton>
      </div>
    </form>
  )
}
