'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'

import { toggleTaskStatus } from '@/app/(main)/dashboard/tasks/actions'
import { usePopup } from '@/components/ui/PopupProvider'

type TaskSource = 'teacher' | 'personal' | 'annotation'

type TaskResolveButtonProps = {
  taskId: string
  currentStatus: string
  source: TaskSource
}

function getConfirmationCopy(source: TaskSource) {
  if (source === 'annotation') {
    return {
      title: 'Mark feedback as resolved?',
      message: 'This feedback item will move to resolved once you confirm.',
      confirmLabel: 'Resolve feedback',
    }
  }

  if (source === 'teacher') {
    return {
      title: 'Mark task as completed?',
      message: 'This assigned task will be marked as resolved once you confirm.',
      confirmLabel: 'Resolve task',
    }
  }

  return {
    title: 'Mark task as resolved?',
    message: 'This personal task will be marked as resolved once you confirm.',
    confirmLabel: 'Resolve task',
  }
}

export function TaskResolveButton({
  taskId,
  currentStatus,
  source,
}: TaskResolveButtonProps) {
  const router = useRouter()
  const { confirm, notify } = usePopup()
  const [isPending, startTransition] = useTransition()
  const [optimisticStatus, setOptimisticStatus] = useState(currentStatus)

  const isResolved = optimisticStatus === 'resolved'

  const handleClick = async () => {
    if (isPending) {
      return
    }

    if (!isResolved) {
      const confirmed = await confirm(getConfirmationCopy(source))

      if (!confirmed) {
        return
      }
    }

    const nextStatus = isResolved ? 'unresolved' : 'resolved'
    setOptimisticStatus(nextStatus)

    startTransition(async () => {
      try {
        await toggleTaskStatus(taskId, currentStatus, source)
        router.refresh()
      } catch {
        setOptimisticStatus(currentStatus)
        notify({
          title: 'Update failed',
          message: 'We could not update this task right now. Please try again.',
          variant: 'error',
        })
      }
    })
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={isPending}
      aria-label={isResolved ? 'Mark task as unresolved' : 'Mark task as resolved'}
      className={`mt-1 rounded-full p-1 transition-all ${
        isResolved
          ? 'bg-green-50 text-green-500 dark:bg-green-900/20'
          : 'text-gray-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20'
      } disabled:cursor-not-allowed disabled:opacity-70`}
    >
      {isPending ? (
        <Loader2 size={24} className="animate-spin" />
      ) : isResolved ? (
        <CheckCircle size={24} />
      ) : (
        <Circle size={24} />
      )}
    </button>
  )
}
