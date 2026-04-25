'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

type PdfAttachment = { name: string; url: string; size?: number }

function fmtSize(bytes?: number) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function EnviarEmailPage() {
  const params = useParams()
  const id     = params.id as string

  const [template, setTemplate]   = useState<{ name: string; html: string; pdf_attachments?: PdfAttachment[] } | null>(null)
  const [loading, setLoading]     = useState(true)
  const [sending, setSending]     = useState(false)
  const [result, setResult]       = useState<{ ok?: boolean; error?: string; count?: number } | null>(null)

  const [to, setTo]               = useState('')
  const [nombre, setNombre]       = useState('')
  const [folio, setFolio]         = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [asunto, setAsunto]       = useState('')

  // PDF adjuntos adicionales (además de los de la plantilla)
  const [extraPdfs, setExtraPdfs]       = useState<PdfAttachment[]>([])
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [pdfError, setPdfError]         = useState('')
  const pdfRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/templates/${id}`)
      .then(r => r.json())
      .then(data => {
        setTemplate(data)
        setAsunto(`Mensaje de Artia Studio`)
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { setPdfError('Solo PDFs'); return }
    if (file.size > 10 * 1024 * 1024) { setPdfError('Máximo 10 MB'); return }

    setUploadingPdf(true)
    setPdfError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res  = await fetch('/api/upload/pdf', { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok && data.url) {
        setExtraPdfs(prev => [...prev, { name: file.name, url: data.url, size: file.size }])
      } else {
        setPdfError(data.error ?? 'Error subiendo PDF')
      }
    } catch { setPdfError('Error de conexión') }
    finally {
      setUploadingPdf(false)
      if (pdfRef.current) pdfRef.current.value = ''
    }
  }

  async function handleSend() {
    if (!to || !asunto) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: id,
          to,
          asunto,
          variables: { nombre, folio, access_code: accessCode },
          pdfAttachments: extraPdfs,
        }),
      })
      const data = await res.json()
      setResult(data.ok ? { ok: true, count: data.attachmentCount } : { error: data.error })
    } catch {
      setResult({ error: 'Error de conexión' })
    } finally {
      setSending(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '0.5px solid #e2e8f0', borderRadius: 8,
    fontSize: 13, outline: 'none', background: '#fff', color: '#0f172a', boxSizing: 'border-box',
  }

  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Cargando…</div>
  if (!template) return <div style={{ padding: 40, color: '#dc2626' }}>Plantilla no encontrada</div>

  const templatePdfs = template.pdf_attachments ?? []
  const allPdfs      = [...templatePdfs, ...extraPdfs]

  return (
    <div style={{ maxWidth: 580 }}>
      <div style={{ marginBottom: 28 }}>
        <Link href="/admin/emails" style={{ fontSize: 13, color: '#2552ca', textDecoration: 'none' }}>
          ← Volver a plantillas
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#00113a', margin: '12px 0 6px' }}>
          Enviar plantilla
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
          <strong>{template.name}</strong>
        </p>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <Field label="Destinatario (email) *">
          <input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="cliente@ejemplo.com" style={inputStyle} required />
        </Field>

        <Field label="Asunto del email *">
          <input type="text" value={asunto} onChange={e => setAsunto(e.target.value)} placeholder="Mensaje de Artia Studio" style={inputStyle} />
        </Field>

        {/* Variables */}
        <div style={{ borderTop: '0.5px solid #f1f5f9', paddingTop: 16 }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8' }}>
            Variables de la plantilla
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="{{nombre}} — nombre del cliente">
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="ej: Juan Pérez" style={inputStyle} />
            </Field>
            <Field label="{{folio}} — número de folio">
              <input type="text" value={folio} onChange={e => setFolio(e.target.value)} placeholder="ej: ASMKT-0362" style={inputStyle} />
            </Field>
            <Field label="{{access_code}} — código de portal cliente">
              <input type="text" value={accessCode} onChange={e => setAccessCode(e.target.value)} placeholder="ej: ASMK-AB3D-1234" style={inputStyle} />
            </Field>
          </div>
        </div>

        {/* Adjuntos PDF */}
        <div style={{ borderTop: '0.5px solid #f1f5f9', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#94a3b8' }}>
              📎 Adjuntos PDF
            </p>
            <button
              onClick={() => pdfRef.current?.click()}
              disabled={uploadingPdf}
              style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 700, color: '#475569', cursor: 'pointer' }}
            >
              {uploadingPdf ? 'Subiendo…' : '+ Añadir PDF'}
            </button>
          </div>
          <input ref={pdfRef} type="file" accept="application/pdf" onChange={handlePdfUpload} style={{ display: 'none' }} />

          {allPdfs.length === 0 && (
            <div style={{ fontSize: 12, color: '#94a3b8', padding: '8px 0' }}>
              No hay PDFs adjuntos. Puedes añadir PDFs adicionales a este envío.
            </div>
          )}

          {allPdfs.map((pdf, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, marginBottom: 6 }}>
              <span>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pdf.name}</div>
                {pdf.size && <div style={{ fontSize: 10, color: '#94a3b8' }}>{fmtSize(pdf.size)}</div>}
              </div>
              {i >= templatePdfs.length && (
                <button onClick={() => setExtraPdfs(prev => prev.filter((_, j) => j !== i - templatePdfs.length))}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>×</button>
              )}
              {i < templatePdfs.length && (
                <span style={{ fontSize: 10, color: '#94a3b8' }}>plantilla</span>
              )}
            </div>
          ))}

          {pdfError && <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>{pdfError}</div>}
        </div>

        {/* Resultado */}
        {result && (
          <div style={{ padding: '12px 16px', borderRadius: 8, background: result.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${result.ok ? '#bbf7d0' : '#fecaca'}`, fontSize: 13, color: result.ok ? '#15803d' : '#dc2626', fontWeight: 600 }}>
            {result.ok
              ? `✓ Email enviado correctamente${result.count ? ` (${result.count} adjunto${result.count > 1 ? 's' : ''})` : ''}`
              : `✗ Error: ${result.error}`}
          </div>
        )}

        <button onClick={handleSend} disabled={sending || !to || !asunto} style={{
          background: sending ? '#93c5fd' : '#00113a', color: '#fff', border: 'none', borderRadius: 8,
          padding: '13px', fontSize: 12, fontWeight: 900, letterSpacing: '1.5px', textTransform: 'uppercase',
          cursor: sending || !to || !asunto ? 'not-allowed' : 'pointer',
        }}>
          {sending ? 'Enviando…' : allPdfs.length > 0 ? `Enviar email + ${allPdfs.length} PDF${allPdfs.length > 1 ? 's' : ''}` : 'Enviar email'}
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
      {children}
    </div>
  )
}
