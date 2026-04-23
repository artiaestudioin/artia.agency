'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function EnviarEmailPage() {
  const params = useParams()
  const id     = params.id as string

  const [template, setTemplate]   = useState<{ name: string; html: string } | null>(null)
  const [loading, setLoading]     = useState(true)
  const [sending, setSending]     = useState(false)
  const [result, setResult]       = useState<{ ok?: boolean; error?: string } | null>(null)

  // Campos dinámicos para reemplazar variables en la plantilla
  const [to, setTo]               = useState('')
  const [nombre, setNombre]       = useState('')
  const [folio, setFolio]         = useState('')
  const [asunto, setAsunto]       = useState('')

  useEffect(() => {
    fetch(`/api/templates/${id}`)
      .then(r => r.json())
      .then(data => {
        setTemplate(data)
        setAsunto(`Mensaje de Artia Studio`)
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handleSend() {
    if (!to || !asunto) return
    setSending(true)
    setResult(null)

    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: id, to, asunto, variables: { nombre, folio } }),
      })
      const data = await res.json()
      setResult(data.ok ? { ok: true } : { error: data.error })
    } catch {
      setResult({ error: 'Error de conexión' })
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Cargando…</div>
  if (!template) return <div style={{ padding: 40, color: '#dc2626' }}>Plantilla no encontrada</div>

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 32 }}>
        <Link href="/admin/emails" style={{ fontSize: 13, color: '#2552ca', textDecoration: 'none' }}>
          ← Volver a plantillas
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#00113a', margin: '12px 0 6px' }}>
          Enviar plantilla
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
          <strong>{template.name}</strong> — rellena los campos y las variables se reemplazarán en el HTML.
        </p>
      </div>

      <div style={{
        background: '#fff',
        border: '0.5px solid #e2e8f0',
        borderRadius: 12,
        padding: '28px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}>
        {/* Destinatario */}
        <Field label="Destinatario (email) *">
          <input
            type="email"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="cliente@ejemplo.com"
            required
          />
        </Field>

        {/* Asunto */}
        <Field label="Asunto del email *">
          <input
            type="text"
            value={asunto}
            onChange={e => setAsunto(e.target.value)}
            placeholder="Mensaje de Artia Studio"
          />
        </Field>

        <div style={{ borderTop: '0.5px solid #f1f5f9', paddingTop: 18 }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8' }}>
            Variables de la plantilla
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="{{nombre}} — nombre del cliente">
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="ej: Juan Pérez"
              />
            </Field>

            <Field label="{{folio}} — número de folio">
              <input
                type="text"
                value={folio}
                onChange={e => setFolio(e.target.value)}
                placeholder="ej: ASMKT-0362"
              />
            </Field>
          </div>
        </div>

        {result && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: result.ok ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${result.ok ? '#bbf7d0' : '#fecaca'}`,
            fontSize: 13,
            color: result.ok ? '#15803d' : '#dc2626',
            fontWeight: 600,
          }}>
            {result.ok ? '✓ Email enviado correctamente' : `✗ Error: ${result.error}`}
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={sending || !to || !asunto}
          style={{
            background: sending ? '#93c5fd' : '#00113a',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '13px',
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            cursor: sending || !to || !asunto ? 'not-allowed' : 'pointer',
          }}
        >
          {sending ? 'Enviando…' : 'Enviar email'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ fontSize: 14 }}>
        {children}
      </div>
    </div>
  )
}
