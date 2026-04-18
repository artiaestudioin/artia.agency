import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Artia Studio Admin',
}

// Este layout solo aplica a rutas Next.js (/admin, /api).
// Los HTML estáticos tienen sus propios <head> y no pasan por aquí.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
