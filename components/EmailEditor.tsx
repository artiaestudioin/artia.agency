'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GrapesjsEditor = any

type PdfAttachment = {
  name: string
  url: string
  size: number
}

interface EmailEditorProps {
  templateId?: string
  initialName?: string
  initialDescription?: string
  initialHtml?: string
  initialGjsData?: object
  initialPdfAttachments?: PdfAttachment[]
  onSave: (data: {
    name: string
    description: string
    html: string
    gjsData: object
    pdfAttachments: PdfAttachment[]
  }) => Promise<void>
}

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function EmailEditor({
  initialName = '',
  initialDescription = '',
  initialHtml,
  initialGjsData,
  initialPdfAttachments = [],
  onSave,
}: EmailEditorProps) {
  const editorRef     = useRef<GrapesjsEditor>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  const pdfInputRef   = useRef<HTMLInputElement>(null)

  const [name, setName]                       = useState(initialName)
  const [description, setDescription]         = useState(initialDescription)
  const [saving, setSaving]                   = useState(false)
  const [saved, setSaved]                     = useState(false)
  const [editorReady, setEditorReady]         = useState(false)
  const [pdfAttachments, setPdfAttachments]   = useState<PdfAttachment[]>(initialPdfAttachments)
  const [uploadingPdf, setUploadingPdf]       = useState(false)
  const [pdfError, setPdfError]               = useState('')
  const [showPdfPanel, setShowPdfPanel]       = useState(false)

  useEffect(() => {
    if (!containerRef.current) return

    const initEditor = async () => {
      const grapesjs            = (await import('grapesjs')).default
      const gjsPresetNewsletter = (await import('grapesjs-preset-newsletter')).default

      if (!document.getElementById('grapesjs-css')) {
        const link = document.createElement('link')
        link.id   = 'grapesjs-css'
        link.rel  = 'stylesheet'
        link.href = 'https://unpkg.com/grapesjs/dist/css/grapes.min.css'
        document.head.appendChild(link)
      }

      // ── Cargar imágenes de Supabase para el Asset Manager ─────────────────
      let supabaseAssets: Array<{ src: string; name: string }> = []
      try {
        const res  = await fetch('/api/upload/list')
        const data = await res.json()
        supabaseAssets = (data.images ?? []).map((img: { url: string; name: string }) => ({
          src:  img.url,
          name: img.name,
        }))
      } catch { /* silencioso */ }

      const editor: GrapesjsEditor = grapesjs.init({
        container: containerRef.current!,
        height: 'calc(100vh - 180px)',
        width: 'auto',
        storageManager: false,
        plugins: [gjsPresetNewsletter],
        pluginsOpts: {
          [gjsPresetNewsletter as never]: {
            colors: ['#00113a', '#2552ca', '#b3c5ff', '#ffffff', '#f8fafc'],
          },
        },

        assetManager: {
          assets: supabaseAssets,
          uploadFile: async (e: Event) => {
            const input = e.target as HTMLInputElement
            if (!input.files?.length) return

            const form = new FormData()
            form.append('file', input.files[0])

            const res  = await fetch('/api/upload', { method: 'POST', body: form })
            const data = await res.json()

            if (res.ok && data.url) {
              editor.AssetManager.add([{ src: data.url, name: data.url.split('/').pop() }])
            } else {
              alert(`Error al subir: ${data.error}`)
            }
          },
          upload: '',
        },

        blockManager: {
          appendTo: '#gjs-blocks',
          blocks: [
            {
              id: 'artia-header',
              label: 'Header Artia',
              category: 'Artia',
              content: `<table width="100%" cellpadding="0" cellspacing="0" style="background:#00113a;border-radius:12px 12px 0 0;">
                <tr><td style="background:#2552ca;height:4px;font-size:0;">&nbsp;</td></tr>
                <tr><td style="padding:32px 40px;text-align:center;">
                  <img src="https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png" alt="ARTIA" width="150" style="display:block;margin:0 auto;height:auto;"/>
                </td></tr>
              </table>`,
            },
            {
              id: 'artia-footer',
              label: 'Footer Artia',
              category: 'Artia',
              content: `<table width="100%" cellpadding="0" cellspacing="0" style="background:#00113a;border-radius:0 0 12px 12px;">
                <tr><td style="padding:24px 40px;text-align:center;">
                  <p style="margin:0 0 4px;font-size:12px;color:#fff;font-weight:700;">Artia Studio</p>
                  <p style="margin:0 0 8px;font-size:11px;color:rgba(255,255,255,0.55);">Marketing &amp; Publicidad Integral · Ecuador</p>
                  <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.3);">artia.estudioin@gmail.com &nbsp;|&nbsp; +593 969 937 265</p>
                </td></tr>
              </table>`,
            },
            {
              id: 'artia-cta-wa',
              label: 'Botón WhatsApp',
              category: 'Artia',
              content: `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px 0;">
                <a href="https://wa.me/593969937265" style="display:inline-block;background:#10b981;color:#fff;padding:12px 32px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">
                  Contactar por WhatsApp
                </a>
              </td></tr></table>`,
            },
            {
              id: 'artia-pdf-notice',
              label: 'Aviso adjunto PDF',
              category: 'Artia',
              content: `<table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;">
                <tr><td style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 18px;">
                  <p style="margin:0;font-size:13px;color:#1d4ed8;font-weight:600;">📎 Este correo incluye documentos adjuntos. Por favor revísalos.</p>
                </td></tr>
              </table>`,
            },
            {
              id: 'artia-divider',
              label: 'Separador',
              category: 'Artia',
              content: `<table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;"><tr><td style="border-top:1px solid #e2e8f0;">&nbsp;</td></tr></table>`,
            },
            {
              id: 'artia-variable-nombre',
              label: 'Variable: nombre',
              category: 'Variables',
              content: `<span style="background:#fef9c3;border-radius:4px;padding:2px 6px;font-size:13px;">{{nombre}}</span>`,
            },
            {
              id: 'artia-variable-folio',
              label: 'Variable: folio',
              category: 'Variables',
              content: `<span style="background:#dbeafe;border-radius:4px;padding:2px 6px;font-size:13px;color:#1d4ed8;font-weight:700;">{{folio}}</span>`,
            },
            {
              id: 'artia-variable-codigo',
              label: 'Variable: código acceso',
              category: 'Variables',
              content: `<span style="background:#f0fdf4;border-radius:4px;padding:2px 6px;font-size:13px;color:#15803d;font-weight:700;font-family:monospace;">{{access_code}}</span>`,
            },
          ],
        },

        panels: {
          defaults: [
            {
              id: 'panel-switcher',
              el: '#panel-switcher',
              buttons: [
                { id: 'show-blocks', active: true, label: 'Bloques',  command: 'show-blocks',  togglable: false },
                { id: 'show-style',                label: 'Estilos',  command: 'show-styles',  togglable: false },
                { id: 'show-layers',               label: 'Capas',    command: 'show-layers',  togglable: false },
                { id: 'show-assets',               label: 'Imágenes', command: 'open-assets',  togglable: false },
              ],
            },
          ],
        },
      })

      editor.Commands.add('show-blocks', {
        run() {
          document.getElementById('gjs-blocks')!.style.display = 'block'
          document.getElementById('gjs-styles')!.style.display = 'none'
          document.getElementById('gjs-layers')!.style.display = 'none'
        },
      })
      editor.Commands.add('show-styles', {
        run() {
          document.getElementById('gjs-blocks')!.style.display = 'none'
          document.getElementById('gjs-styles')!.style.display = 'block'
          document.getElementById('gjs-layers')!.style.display = 'none'
        },
      })
      editor.Commands.add('show-layers', {
        run() {
          document.getElementById('gjs-blocks')!.style.display = 'none'
          document.getElementById('gjs-styles')!.style.display = 'none'
          document.getElementById('gjs-layers')!.style.display = 'block'
        },
      })

      if (initialGjsData) {
        editor.loadProjectData(initialGjsData)
      } else if (initialHtml) {
        editor.setComponents(initialHtml)
      }

      editorRef.current = editor
      setEditorReady(true)
    }

    initEditor()

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy()
        editorRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Subir PDF ────────────────────────────────────────────────
  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setPdfError('Solo se permiten archivos PDF')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setPdfError('El PDF no debe superar 10 MB')
      return
    }

    setUploadingPdf(true)
    setPdfError('')

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('bucket', 'email-attachments') // bucket específico para adjuntos

      const res  = await fetch('/api/upload/pdf', { method: 'POST', body: form })
      const data = await res.json()

      if (res.ok && data.url) {
        setPdfAttachments(prev => [...prev, { name: file.name, url: data.url, size: file.size }])
      } else {
        setPdfError(data.error ?? 'Error al subir el PDF')
      }
    } catch {
      setPdfError('Error de conexión al subir el PDF')
    } finally {
      setUploadingPdf(false)
      if (pdfInputRef.current) pdfInputRef.current.value = ''
    }
  }

  function removePdf(index: number) {
    setPdfAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // ── Guardar plantilla ────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!editorRef.current || !name.trim()) return
    setSaving(true)
    try {
      const html    = editorRef.current.getHtml()
      const css     = editorRef.current.getCss()
      const gjsData = editorRef.current.getProjectData()

      const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>${css}</style>
</head>
<body style="margin:0;padding:32px 16px;background:#eef0f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
${html}
</body>
</html>`

      await onSave({ name, description, html: fullHtml, gjsData, pdfAttachments })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }, [name, description, pdfAttachments, onSave])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── Barra superior ── */}
      <div style={{
        background: '#00113a',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexShrink: 0,
        zIndex: 10,
      }}>
        <a href="/admin/emails" style={{ color: 'rgba(179,197,255,0.7)', fontSize: 12, textDecoration: 'none', fontWeight: 500, flexShrink: 0 }}>
          ← Volver
        </a>

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nombre de la plantilla *"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '0.5px solid rgba(255,255,255,0.2)',
            borderRadius: 6, padding: '7px 12px',
            color: '#fff', fontSize: 13, fontWeight: 600,
            outline: 'none', width: 220,
          }}
        />

        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Descripción (opcional)"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '0.5px solid rgba(255,255,255,0.2)',
            borderRadius: 6, padding: '7px 12px',
            color: 'rgba(255,255,255,0.8)', fontSize: 13,
            outline: 'none', flex: 1,
          }}
        />

        {/* Botón PDF */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowPdfPanel(!showPdfPanel)}
            style={{
              background: pdfAttachments.length > 0 ? '#2552ca' : 'rgba(255,255,255,0.1)',
              border: 'none', borderRadius: 8, padding: '8px 14px',
              color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            📎 PDF {pdfAttachments.length > 0 && <span style={{ background: '#ef4444', borderRadius: 10, padding: '1px 7px', fontSize: 10 }}>{pdfAttachments.length}</span>}
          </button>

          {showPdfPanel && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 8,
              background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
              padding: 16, width: 320, zIndex: 100, boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#64748b', marginBottom: 12 }}>
                Adjuntos PDF
              </div>

              {/* Lista de PDFs adjuntos */}
              {pdfAttachments.map((pdf, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 18 }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pdf.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{fmtSize(pdf.size)}</div>
                  </div>
                  <button onClick={() => removePdf(i)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, padding: 2 }}>×</button>
                </div>
              ))}

              {/* Subir PDF */}
              <div
                onClick={() => pdfInputRef.current?.click()}
                style={{
                  border: '1.5px dashed #334155', borderRadius: 8, padding: '14px',
                  textAlign: 'center', cursor: uploadingPdf ? 'not-allowed' : 'pointer',
                  transition: 'border-color 0.15s', marginTop: 4,
                }}
                onMouseOver={e => !uploadingPdf && ((e.currentTarget as HTMLElement).style.borderColor = '#2552ca')}
                onMouseOut={e => ((e.currentTarget as HTMLElement).style.borderColor = '#334155')}
              >
                {uploadingPdf ? (
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Subiendo…</span>
                ) : (
                  <>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>📎</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Haz clic para adjuntar un PDF</div>
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>Máximo 10 MB</div>
                  </>
                )}
              </div>

              {pdfError && (
                <div style={{ marginTop: 8, fontSize: 11, color: '#f87171', fontWeight: 600 }}>{pdfError}</div>
              )}

              <input
                ref={pdfInputRef}
                type="file"
                accept="application/pdf"
                onChange={handlePdfUpload}
                style={{ display: 'none' }}
              />

              <button onClick={() => setShowPdfPanel(false)} style={{ marginTop: 12, width: '100%', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, padding: '8px', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          )}
        </div>

        <div id="panel-switcher" style={{ display: 'flex', gap: 6, flexShrink: 0 }} />

        <button
          onClick={handleSave}
          disabled={saving || !editorReady || !name.trim()}
          style={{
            background: saved ? '#10b981' : saving ? '#93c5fd' : '#2552ca',
            color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px',
            fontSize: 12, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase',
            cursor: saving || !editorReady || !name.trim() ? 'not-allowed' : 'pointer',
            flexShrink: 0, transition: 'background 0.2s',
          }}
        >
          {saved ? '✓ Guardado' : saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      {/* ── Indicador de PDFs adjuntos (visible en editor) ── */}
      {pdfAttachments.length > 0 && (
        <div style={{ background: '#1e40af', padding: '6px 20px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12 }}>📎</span>
          <span style={{ fontSize: 12, color: '#bfdbfe', fontWeight: 600 }}>
            {pdfAttachments.length} PDF{pdfAttachments.length > 1 ? 's' : ''} adjunto{pdfAttachments.length > 1 ? 's' : ''}:&nbsp;
            {pdfAttachments.map(p => p.name).join(', ')}
          </span>
          <span style={{ fontSize: 11, color: 'rgba(191,219,254,0.6)', marginLeft: 'auto' }}>
            Se enviarán junto con el correo
          </span>
        </div>
      )}

      {/* ── Editor ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: 240, background: '#1e293b', flexShrink: 0, overflowY: 'auto', borderRight: '1px solid #334155' }}>
          <div id="gjs-blocks" style={{ display: 'block' }} />
          <div id="gjs-styles" style={{ display: 'none' }} />
          <div id="gjs-layers" style={{ display: 'none' }} />
        </div>
        <div ref={containerRef} style={{ flex: 1, overflow: 'hidden' }} />
      </div>
    </div>
  )
}
