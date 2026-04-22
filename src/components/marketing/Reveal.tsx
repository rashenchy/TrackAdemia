'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

type RevealVariant = 'up' | 'left' | 'right' | 'scale'

const variantClasses: Record<RevealVariant, string> = {
  up: 'translate-y-8',
  left: '-translate-x-8',
  right: 'translate-x-8',
  scale: 'scale-[0.96]',
}

export function Reveal({
  children,
  className = '',
  delay = 0,
  variant = 'up',
}: {
  children: ReactNode
  className?: string
  delay?: number
  variant?: RevealVariant
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const node = ref.current

    if (!node) return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    if (mediaQuery.matches) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]

        if (!entry?.isIntersecting) return

        setIsVisible(true)
        observer.disconnect()
      },
      {
        threshold: 0.01,
        rootMargin: '0px 0px 12% 0px',
      }
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={[
        'transition-[opacity,transform,filter] duration-700 ease-out will-change-transform',
        isVisible ? 'translate-x-0 translate-y-0 scale-100 opacity-100 blur-0' : `opacity-0 blur-[6px] ${variantClasses[variant]}`,
        className,
      ].join(' ')}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
