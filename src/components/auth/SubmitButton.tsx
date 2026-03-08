'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'

// Reusable submit button with loading state support
export function SubmitButton({
  children,
  className,
  onClick
}: {
  children: React.ReactNode
  className?: string
  onClick?: React.MouseEventHandler<HTMLButtonElement>
}) {

  // Track form submission state from React Server Actions
  const { pending } = useFormStatus()

  return (

    // Button that automatically disables during submission
    <button
      type="submit"
      disabled={pending}
      onClick={onClick}
      className={`${className} flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed`}
    >

      {/* Replace button text during submission */}
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}

      {/* Replace button text during submission */}
      {pending ? 'Processing...' : children}

    </button>

  )
}