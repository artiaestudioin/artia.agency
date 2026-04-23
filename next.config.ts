import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qnslgtbsilqhcyitskuv.supabase.co',
      },
    ],
  },

  async rewrites() {
    return [
      { source: '/',                            destination: '/inicio.html' },
      { source: '/nosotros',                    destination: '/nosotros.html' },
      { source: '/clientes',                    destination: '/clientes.html' },
      { source: '/servicios/marketing-digital', destination: '/servicio-marketing-digital.html' },
      { source: '/servicios/impresion',         destination: '/servicio-impresion.html' },
      { source: '/servicios/fotografia',        destination: '/servicio-fotografia.html' },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // ── Identificación del proyecto ──────────────────────────────────────────
  org:       process.env.SENTRY_ORG      ?? '',
  project:   process.env.SENTRY_PROJECT  ?? '',
  authToken: process.env.SENTRY_AUTH_TOKEN,        // ← Requerido para uploads

  // ── Build behavior ───────────────────────────────────────────────────────
  silent:          true,   // no spam en logs de Vercel
  disableLogger:   true,

  // ── Source maps ──────────────────────────────────────────────────────────
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
    // Si no hay auth token válido, no intentes subir (evita el build error)
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // ── Tunnel para evitar blockers de ad-blockers ───────────────────────────
  tunnelRoute: '/monitoring-tunnel',

  // ── Vercel Cron Monitors ─────────────────────────────────────────────────
  automaticVercelMonitors: true,
})
