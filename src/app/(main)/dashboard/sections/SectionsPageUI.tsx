'use client'

import { useActionState } from 'react'
import { createSection } from './actions'
import { SubmitButton } from '@/components/auth/SubmitButton'
import { Plus, GraduationCap, Copy, CheckCircle2, AlertCircle } from 'lucide-react'

export default function SectionsPageUI({ 
  success, 
  sections 
}: { 
  success?: string, 
  sections: any[] 
}) {
  const [state, formAction] = useActionState(createSection, null)

  // Safe copy function to prevent navigator.clipboard undefined errors
  const handleCopy = async (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        alert('Join code copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    } else {
      // Fallback for older browsers or insecure contexts
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert('Join code copied!');
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10">
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
          <form action={formAction} className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-[var(--background)] shadow-sm space-y-4">
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
            Active Sections
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {sections?.length === 0 ? (
              <div className="col-span-full py-10 text-center text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl">
                No active sections found.
              </div>
            ) : (
              sections?.map((section) => (
                <div key={section.id} className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-[var(--background)] shadow-sm flex flex-col justify-between group hover:border-blue-500 transition-colors">
                  <div>
                    <h4 className="font-bold text-lg text-[var(--foreground)]">{section.name}</h4>
                    <p className="text-xs text-gray-400 font-mono">{section.course_code}</p>
                  </div>
                  <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400">Join Code</p>
                      <p className="text-xl font-mono font-black tracking-widest text-blue-600">
                        {section.join_code}
                      </p>
                    </div>
                    <button 
                      type="button"
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      onClick={() => handleCopy(section.join_code)}
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}