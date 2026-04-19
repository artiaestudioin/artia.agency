'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'

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

interface Template {
  id: string
  name: string
  description: string
  html: string
  gjs_data: object
}

export default function EditarPlantillaPage() {
  const params = useParams()
  const id     = params.id as string

  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    fetch(`/api/templates/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setTemplate(data)
      })
      .catch(() => setError('Error cargando la plantilla'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSave = useCallback(async (data: {
    name: string
    description: string
    html: string
    gjsData: object
  }) => {
    const res = await fetch(`/api/templates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Error guardando')
    }
  }, [id])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
      Cargando plantilla…
    </div>
  )

  if (error) return (
    <div style={{ padding: 40, color: '#dc2626' }}>Error: {error}</div>
  )

  if (!template) return null

  return (
    <EmailEditor
      templateId={id}
      initialName={template.name}
      initialDescription={template.description}
      initialHtml={template.html}
      initialGjsData={template.gjs_data}
      onSave={handleSave}
    />
  )
}
