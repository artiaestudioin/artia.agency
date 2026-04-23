import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PostHogProvider } from '@/components/PostHogProvider'

export const metadata: Metadata = {
  title: 'Artia Studio',
}

// Este layout aplica a rutas Next.js (/admin, /api).
// Los HTML estáticos tienen sus propios <head> y no pasan por aquí.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {/*
          PostHogProvider usa useSearchParams() internamente,
          por eso necesita estar dentro de <Suspense>.
        */}
        <Suspense fallback={null}>
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </Suspense>
      </body>
    </html>
  )
}
