'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import dynamic from 'next/dynamic'

const EmailEditor = dynamic(() => import('@/components/EmailEditor'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
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
    pdfAttachments: Array<{ name: string; url: string; size: number }>
  }) => {
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:            data.name,
        description:     data.description,
        html:            data.html,
        gjsData:         data.gjsData,
        pdfAttachments:  data.pdfAttachments,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Error guardando plantilla')
    }

    const { id } = await res.json()
    router.replace(`/admin/emails/${id}`)
  }, [router])

  return <EmailEditor onSave={handleSave} />
}
