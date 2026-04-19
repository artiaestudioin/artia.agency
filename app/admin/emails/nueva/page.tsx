'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import dynamic from 'next/dynamic'

// Importación dinámica obligatoria: GrapesJS usa APIs del navegador (window, document)
// ssr: false evita que Next.js intente ejecutarlo en el servidor y rompa el build
const EmailEditor = dynamic(() => import('@/components/EmailEditor'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0f172a',
      color: 'rgba(255,255,255,0.5)',
      fontSize: 14,
    }}>
      Cargando editor visual…
    </div>
  ),
})

export default function NuevaPlantillaPage() {
  const router = useRouter()

  const handleSave = useCallback(async (data: {
    name: string
    description: string
    html: string
    gjsData: object
  }) => {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Error guardando plantilla')
    }

    const { id } = await res.json()
    // Redirigir al editor de la plantilla recién creada
    router.replace(`/admin/emails/${id}`)
  }, [router])

  return <EmailEditor onSave={handleSave} />
}
