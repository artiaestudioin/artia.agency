'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Inicializa PostHog solo en el navegador
if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host:              process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    ui_host:               'https://us.posthog.com',
    capture_pageview:      false, // lo manejamos manualmente abajo
    capture_pageleave:     true,
    session_recording: {
      maskAllInputs: false,       // puedes poner true si quieres más privacidad
    },
  })
}

// Componente interno que rastrea cambios de ruta (App Router)
function PageViewTracker() {
  const pathname       = usePathname()
  const searchParams   = useSearchParams()
  const ph             = usePostHog()
  const lastTracked    = useRef<string>('')

  useEffect(() => {
    const url = pathname + (searchParams.toString() ? `?${searchParams}` : '')
    if (url === lastTracked.current) return
    lastTracked.current = url
    ph.capture('$pageview', { $current_url: window.location.href })
  }, [pathname, searchParams, ph])

  return null
}

// Provider principal — envuelve toda la app
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <PageViewTracker />
      {children}
    </PHProvider>
  )
}
