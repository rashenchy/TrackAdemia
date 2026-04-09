'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { isSafeInternalPath } from '@/lib/navigation'

export function BackButton({
  fallbackHref = '/dashboard',
  from,
  label,
  className,
}: {
  fallbackHref?: string
  from?: string | null
  label?: string
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentQuery = searchParams.toString()
  const currentRoute = currentQuery ? `${pathname}?${currentQuery}` : pathname
  const searchParamFrom = searchParams.get('from')
  const preferredFrom = from ?? searchParamFrom

  const handleBack = () => {
    if (
      preferredFrom &&
      isSafeInternalPath(preferredFrom) &&
      preferredFrom !== currentRoute
    ) {
      router.push(preferredFrom)
      return
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }

    router.push(fallbackHref)
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={
        className ??
        'rounded-full border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-50'
      }
      aria-label={label ?? 'Go back'}
      title={label ?? 'Go back'}
    >
      <ArrowLeft size={18} />
    </button>
  )
}
