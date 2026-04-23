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
  silent:  !process.env.CI,
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  widenClientFileUpload: true,

  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  tunnelRoute: '/monitoring-tunnel',
})
