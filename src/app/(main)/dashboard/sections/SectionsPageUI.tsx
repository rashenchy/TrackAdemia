'use client'

import { useActionState, useState } from 'react'
import { createSection, regenerateJoinCode, toggleSectionFreeze, updateStudentStatus, removeStudent } from './actions'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { Plus, GraduationCap, Copy, CheckCircle2, AlertCircle, Lock, Unlock, RefreshCw, Users, FileText, Activity, X, Ban, UserMinus, ShieldCheck } from 'lucide-react'

export default function SectionsPageUI({ success, sections }: { success?: string, sections: any[] }) {
  const [state, formAction] = useActionState(createSection, null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  
  // State for the Roster Modal
  const [rosterModal, setRosterModal] = useState<any | null>(null)

  const handleCopy = async (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Join code copied!');
  }

  const handleRegenerate = async (id: string) => {
    if(!confirm("Generate a new code? Old codes will immediately stop working.")) return;
    setLoadingAction(`regen-${id}`)
    await regenerateJoinCode(id);
    setLoadingAction(null)
  }

  const handleFreeze = async (id: string, isFrozen: boolean) => {
    setLoadingAction(`freeze-${id}`)
    await toggleSectionFreeze(id, isFrozen);
    
    // Update modal state if it's currently open
    if (rosterModal?.id === id) {
      setRosterModal({ ...rosterModal, is_frozen: !isFrozen })
    }
    setLoadingAction(null)
  }

  // Roster Actions
  const handleStatusChange = async (sectionId: string, studentId: string, newStatus: 'active' | 'banned') => {
    setLoadingAction(`status-${studentId}`)
    await updateStudentStatus(sectionId, studentId, newStatus);
    
    // Optimistically update the modal UI
    if (rosterModal) {
      setRosterModal({
        ...rosterModal,
        roster: rosterModal.roster.map((s: any) => s.user_id === studentId ? { ...s, status: newStatus } : s)
      })
    }
    setLoadingAction(null)
  }

  const handleRemove = async (sectionId: string, studentId: string, studentName: string) => {
    if(!confirm(`Are you sure you want to completely remove ${studentName} from this section?`)) return;
    setLoadingAction(`remove-${studentId}`)
    await removeStudent(sectionId, studentId);
    
    // Optimistically update the modal UI
    if (rosterModal) {
      setRosterModal({
        ...rosterModal,
        roster: rosterModal.roster.filter((s: any) => s.user_id !== studentId)
      })
    }
    setLoadingAction(null)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 relative">
      {(success || state?.error) && (
        <div className={`flex items-center gap-2 p-4 text-sm border rounded-xl animate-in fade-in ${state?.error ? 'text-red-700 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200'}`}>
          {state?.error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {state?.error || success}
        </div>
      )}

      <div className="flex flex-col gap-2 text-[var(--foreground)]">
        <h1 className="text-3xl font-bold tracking-tight">Manage Sections</h1>
        <p className="text-gray-500">Create new classes and manage your students' research groups.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <form action={formAction} className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-[var(--background)] shadow-sm space-y-4 sticky top-6">
            <div className="flex items-center gap-2 mb-2 text-blue-600">
              <Plus size={20} />
              <h2 className="font-bold">New Section</h2>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-gray-500">Section Name</label>
              <input name="name" required placeholder="e.g. BSIT 4-A" className="rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-[var(--foreground)] outline-none focus:border-blue-600 text-sm" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase text-gray-500">Course Code</label>
              <input name="courseCode" required placeholder="e.g. ITE401" className="rounded-lg border border-gray-300 dark:border-gray-700 p-2.5 bg-transparent text-[var(--foreground)] outline-none focus:border-blue-600 text-sm" />
            </div>
            <SubmitButton className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-bold hover:bg-blue-700 mt-2">
              Create Section
            </SubmitButton>
          </form>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h3 className="font-bold flex items-center gap-2 text-[var(--foreground)]">
            <GraduationCap size={20} className="text-gray-400" />
            Active Sections & Analytics
          </h3>
          
          <div className="grid gap-6">
            {sections?.length === 0 ? (
               <div className="py-12 text-center text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl">
                 No active sections found. Create one to get started.
               </div>
            ) : (
              sections?.map((section) => (
                <div key={section.id} className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-[var(--background)] shadow-sm relative overflow-hidden group">
                  
                  {section.is_frozen && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                      <Lock size={12} /> FROZEN
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h4 className="font-bold text-2xl text-[var(--foreground)]">{section.name}</h4>
                      <p className="text-sm text-gray-500 font-mono">{section.course_code}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleFreeze(section.id, section.is_frozen)}
                        className={`p-2 rounded-lg border transition-all ${section.is_frozen ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                        title={section.is_frozen ? "Unfreeze Section" : "Freeze Section (Block Joins)"}
                      >
                        {loadingAction === `freeze-${section.id}` ? <RefreshCw size={18} className="animate-spin" /> : (section.is_frozen ? <Lock size={18} /> : <Unlock size={18} />)}
                      </button>
                      <button 
                        onClick={() => handleRegenerate(section.id)}
                        className="p-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:text-blue-600 hover:border-blue-200 transition-all"
                        title="Regenerate Join Code"
                      >
                        <RefreshCw size={18} className={loadingAction === `regen-${section.id}` ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>

                  {/* Analytics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100/50 dark:border-blue-800/30">
                      <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                        <Users size={14} /> <span className="text-[10px] font-bold uppercase tracking-wider">Students</span>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{section.analytics?.totalStudents}</p>
                    </div>
                    <div className="p-3 bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-100/50 dark:border-green-800/30">
                      <div className="flex items-center gap-1.5 text-green-600 mb-1">
                        <FileText size={14} /> <span className="text-[10px] font-bold uppercase tracking-wider">Papers</span>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{section.analytics?.papersUploaded}</p>
                    </div>
                    <div className="p-3 bg-purple-50/50 dark:bg-purple-900/10 rounded-xl border border-purple-100/50 dark:border-purple-800/30">
                      <div className="flex items-center gap-1.5 text-purple-600 mb-1">
                        <Activity size={14} /> <span className="text-[10px] font-bold uppercase tracking-wider">Active</span>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{section.analytics?.activeToday}</p>
                    </div>
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100/50 dark:border-amber-800/30">
                      <div className="flex items-center gap-1.5 text-amber-600 mb-1">
                        <FileText size={14} /> <span className="text-[10px] font-bold uppercase tracking-wider">Notes</span>
                      </div>
                      <p className="text-2xl font-black text-gray-900 dark:text-gray-100">{section.analytics?.notesCreated}</p>
                    </div>
                  </div>

                  {/* Bottom Bar: Join Code & Manage Link */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] uppercase font-bold text-gray-400">Join Code:</span>
                      <span className="text-lg font-mono font-black tracking-widest text-[var(--foreground)] bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-md">
                        {section.join_code}
                      </span>
                      <button onClick={() => handleCopy(section.join_code)} className="text-gray-400 hover:text-blue-600 transition-colors">
                        <Copy size={16} />
                      </button>
                    </div>
                    <button 
                      onClick={() => setRosterModal(section)}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-all"
                    >
                      Manage Roster &rarr;
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- ROSTER MODAL OVERLAY --- */}
      {rosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--background)] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <div>
                <h3 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
                  <Users size={20} className="text-blue-600" />
                  {rosterModal.name} Roster
                </h3>
                <p className="text-xs text-gray-500 mt-1">Manage students, ban access, or remove members.</p>
              </div>
              <button onClick={() => setRosterModal(null)} className="p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Scrollable Student List) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {rosterModal.roster?.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Users size={40} className="mx-auto mb-3 opacity-20" />
                  <p>No students have joined this section yet.</p>
                </div>
              ) : (
                rosterModal.roster?.map((student: any) => (
                  <div key={student.user_id} className={`flex items-center justify-between p-4 rounded-xl border ${student.status === 'banned' ? 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'} shadow-sm transition-all`}>
                    
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border ${student.status === 'banned' ? 'bg-red-100 text-red-600 border-red-200' : 'bg-blue-100 text-blue-600 border-blue-200'}`}>
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${student.status === 'banned' ? 'text-red-700 dark:text-red-400 line-through opacity-70' : 'text-[var(--foreground)]'}`}>
                          {student.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          <span className="font-mono uppercase">{student.course}</span>
                          <span>•</span>
                          <span>Joined {new Date(student.joined_at).toLocaleDateString()}</span>
                          {student.status === 'banned' && (
                            <>
                              <span>•</span>
                              <span className="text-red-600 font-bold uppercase">Banned</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {student.status === 'active' ? (
                        <button 
                          onClick={() => handleStatusChange(rosterModal.id, student.user_id, 'banned')}
                          disabled={loadingAction === `status-${student.user_id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg text-xs font-bold transition-colors"
                          title="Ban student (Prevents them from seeing this section)"
                        >
                          <Ban size={14} /> Ban
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleStatusChange(rosterModal.id, student.user_id, 'active')}
                          disabled={loadingAction === `status-${student.user_id}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-bold transition-colors"
                        >
                          <ShieldCheck size={14} /> Unban
                        </button>
                      )}

                      <button 
                        onClick={() => handleRemove(rosterModal.id, student.user_id, student.name)}
                        disabled={loadingAction === `remove-${student.user_id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors"
                        title="Permanently remove student from roster"
                      >
                        <UserMinus size={14} /> Remove
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}