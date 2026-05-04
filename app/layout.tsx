import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Inter, Playfair_Display } from 'next/font/google'
import { PostHogProvider } from '@/components/PostHogProvider'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

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
    <html lang="es" className={`${inter.variable} ${playfair.variable}`}>
      <body style={{ margin: 0, fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
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