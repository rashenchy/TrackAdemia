'use client'

import { useState, useActionState } from 'react'
import { Plus, Trash2, FilePlus, Users, Info, AlertCircle } from 'lucide-react'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { submitResearch } from '@/app/(main)/dashboard/submit/actions'

export function ResearchSubmissionForm() {
  // useActionState correctly handles the object returned by the Server Action
  const [state, formAction] = useActionState(submitResearch, null)
  const [isGroup, setIsGroup] = useState(false)
  const [members, setMembers] = useState(['']) 

  const addMember = () => setMembers([...members, ''])
  
  const removeMember = (index: number) => {
    const newMembers = members.filter((_, i) => i !== index)
    setMembers(newMembers)
  }

  const handleMemberChange = (index: number, value: string) => {
    const newMembers = [...members]
    newMembers[index] = value
    setMembers(newMembers)
  }

  return (
    <form 
      action={formAction} 
      className="space-y-8 bg-[var(--background)] p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <FilePlus className="text-blue-600" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">New Research Submission</h2>
          <p className="text-xs text-gray-500">Provide the details for your capstone or thesis tracking.</p>
        </div>
      </div>

      {/* Server Action Error Banner */}
      {state?.error && (
        <div className="flex items-center gap-2 p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={18} />
          {state.error}
        </div>
      )}

      {/* --- Section 1: Research Identity --- */}
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[var(--foreground)]">Research Title</label>
            <input 
              name="title" 
              required 
              placeholder="Enter full research title" 
              className="rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-[var(--foreground)] focus:border-blue-600 outline-none transition-all" 
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-[var(--foreground)]">Research Type</label>
            <select 
              name="type" 
              className="rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-[var(--foreground)] outline-none focus:border-blue-600 transition-all cursor-pointer"
            >
              <option value="capstone">Capstone Project</option>
              <option value="thesis">Thesis</option>
              <option value="proposal">Research Proposal</option>
              <option value="dissertation">Dissertation</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-[var(--foreground)]">Abstract / Description</label>
            <div className="group relative">
              {/* Tooltip Fix: Moved title info to a styled absolute div */}
              <Info size={14} className="text-gray-400 cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-[10px] rounded shadow-lg z-50">
                Briefly explain the goal and scope of your research.
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-800" />
              </div>
            </div>
          </div>
          <textarea 
            name="abstract" 
            rows={4} 
            required 
            placeholder="Summarize your research goals..."
            className="rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-[var(--foreground)] focus:border-blue-600 outline-none resize-none transition-all" 
          />
        </div>
      </div>

      {/* --- Section 2: Ownership & Dynamic Members --- */}
      <div className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-gray-500" />
            <label className="text-sm font-semibold text-[var(--foreground)]">Ownership Type</label>
          </div>
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button 
              type="button"
              onClick={() => setIsGroup(false)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${!isGroup ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500'}`}
            >
              Individual
            </button>
            <button 
              type="button"
              onClick={() => setIsGroup(true)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${isGroup ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-gray-500'}`}
            >
              Group
            </button>
          </div>
        </div>

        {isGroup && (
          <div className="space-y-4 bg-gray-50/50 dark:bg-gray-900/30 p-5 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Member List</label>
                <p className="text-[10px] text-gray-400">List all additional members apart from yourself.</p>
              </div>
              <button 
                type="button" 
                onClick={addMember}
                className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
              >
                <Plus size={14} /> Add Member
              </button>
            </div>
            
            <div className="grid gap-3">
              {members.map((member, index) => (
                <div key={index} className="flex gap-2 group">
                  <div className="flex-1 relative">
                    <input 
                      name={`member-${index}`}
                      value={member}
                      onChange={(e) => handleMemberChange(index, e.target.value)}
                      required
                      placeholder="Full Name / Student ID" 
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 text-sm bg-white dark:bg-gray-800 text-[var(--foreground)] outline-none focus:border-blue-600 transition-all" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-mono">
                      #{index + 1}
                    </span>
                  </div>
                  {members.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeMember(index)}
                      className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-100"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- Section 3: Academic Info --- */}
      <div className="grid gap-6 md:grid-cols-2 border-t border-gray-100 dark:border-gray-800 pt-6">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[var(--foreground)]">Subject / Course Code</label>
          <input 
            name="subjectCode" 
            placeholder="e.g., CS401, ITE302" 
            className="rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-[var(--foreground)] outline-none focus:border-blue-600 transition-all" 
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[var(--foreground)]">Adviser</label>
          <select 
            name="adviser" 
            className="rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-[var(--foreground)] outline-none focus:border-blue-600 transition-all cursor-pointer"
          >
            <option value="">Select Adviser (Optional)</option>
            <option value="adviser_1">Dr. Juan Dela Cruz</option>
            <option value="adviser_2">Prof. Maria Santos</option>
            <option value="adviser_3">Engr. Robert Lingad</option>
          </select>
        </div>
      </div>

      <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
        <SubmitButton className="w-full md:w-auto px-12 bg-blue-600 text-white rounded-lg py-3.5 font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none">
          Submit Research Entry
        </SubmitButton>
      </div>
    </form>
  )
}