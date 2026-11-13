'use client'

import { useRef, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { createSectionTask } from '@/app/(main)/dashboard/tasks/actions'
import { usePopup } from '@/components/ui/PopupProvider'

type ManagedSectionOption = {
  id: string
  name: string
}

export function BroadcastTaskForm({
  sections,
}: {
  sections: ManagedSectionOption[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const { notify } = usePopup()

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        await createSectionTask(formData)
        formRef.current?.reset()
        notify({
          title: 'Task broadcast',
          message: 'The task has been assigned to the selected section.',
          variant: 'success',
        })
      } catch (error) {
        notify({
          title: 'Broadcast failed',
          message:
            error instanceof Error
              ? error.message
              : 'Could not broadcast this task right now.',
          variant: 'error',
        })
      }
    })
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <input
          name="title"
          required
          disabled={isPending}
          placeholder="Task Title (e.g., Submit Chapter 1)"
          className="w-full bg-blue-700/50 border border-blue-400/30 rounded-xl p-3 placeholder:text-blue-200 outline-none focus:ring-2 focus:ring-white/50 transition-all disabled:opacity-60"
        />
        <textarea
          name="description"
          disabled={isPending}
          placeholder="Instructions for students..."
          rows={2}
          className="w-full bg-blue-700/50 border border-blue-400/30 rounded-xl p-3 placeholder:text-blue-200 outline-none focus:ring-2 focus:ring-white/50 transition-all resize-none disabled:opacity-60"
        />
      </div>
      <div className="space-y-3">
        <select
          name="sectionId"
          required
          defaultValue=""
          disabled={isPending}
          className="w-full bg-blue-700/50 border border-blue-400/30 rounded-xl p-3 outline-none focus:ring-2 focus:ring-white/50 transition-all text-gray-900 disabled:opacity-60"
        >
          <option value="" disabled>
            Select Section...
          </option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase opacity-70 ml-1">
            Deadline (Optional)
          </label>
          <input
            type="datetime-local"
            name="dueDate"
            disabled={isPending}
            className="w-full bg-blue-700/50 border border-blue-400/30 rounded-xl p-3 text-white outline-none focus:ring-2 focus:ring-white/50 transition-all [color-scheme:dark] disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-white text-blue-600 py-3 rounded-xl font-black hover:bg-blue-50 transition-colors disabled:opacity-70 inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Broadcasting...
            </>
          ) : (
            'Broadcast Task'
          )}
        </button>
      </div>
    </form>
  )
}

