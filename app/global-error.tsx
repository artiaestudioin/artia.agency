'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7f9fb',
          padding: 24,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '48px 40px',
            maxWidth: 440,
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            border: '0.5px solid #e2e8f0',
          }}>
            <p style={{ fontSize: 40, margin: '0 0 16px' }}>⚠️</p>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#00113a', margin: '0 0 8px' }}>
              Algo salió mal
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 28px', lineHeight: 1.6 }}>
              El error fue reportado automáticamente. Puedes intentar recargar la página.
            </p>
            <button
              onClick={reset}
              style={{
                background: '#00113a',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 28px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.5px',
              }}
            >
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
