import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Los HTML estáticos se sirven desde la raíz del repo.
  // Next.js solo toma control de /admin/* y /api/*
  // El resto lo maneja Vercel directamente como archivos estáticos.
  
  // Evita que Next.js intente procesar rutas que ya existen como .html
  trailingSlash: false,
  
  // Permite importar imágenes desde Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'qnslgtbsilqhcyitskuv.supabase.co',
      },
    ],
  },
}

export default nextConfig
