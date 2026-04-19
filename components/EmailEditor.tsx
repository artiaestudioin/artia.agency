'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// Tipos mínimos para GrapesJS (evita instalar @types/grapesjs)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GrapesjsEditor = any

interface EmailEditorProps {
  templateId?: string
  initialName?: string
  initialDescription?: string
  initialHtml?: string
  initialGjsData?: object
  onSave: (data: {
    name: string
    description: string
    html: string
    gjsData: object
  }) => Promise<void>
}

export default function EmailEditor({
  templateId,
  initialName = '',
  initialDescription = '',
  initialHtml,
  initialGjsData,
  onSave,
}: EmailEditorProps) {
  const editorRef     = useRef<GrapesjsEditor>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  const [name, setName]               = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [editorReady, setEditorReady] = useState(false)

  // ── Inicializar GrapesJS después de montar ──────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    // Importación dinámica: GrapesJS usa window/document, NO puede ejecutarse en SSR
    const initEditor = async () => {
      const grapesjs = (await import('grapesjs')).default

      // Plugin de bloques de newsletter prearmados
      const gjsPresetNewsletter = (await import('grapesjs-preset-newsletter')).default

      // Cargar CSS de GrapesJS desde CDN
      if (!document.getElementById('grapesjs-css')) {
        const link = document.createElement('link')
        link.id   = 'grapesjs-css'
        link.rel  = 'stylesheet'
        link.href = 'https://unpkg.com/grapesjs/dist/css/grapes.min.css'
        document.head.appendChild(link)
      }

      const editor: GrapesjsEditor = grapesjs.init({
        container: containerRef.current!,
        height: 'calc(100vh - 180px)',
        width: 'auto',
        storageManager: false, // Guardamos manualmente en Supabase
        plugins: [gjsPresetNewsletter],
        pluginsOpts: {
          [gjsPresetNewsletter as never]: {
            // Colores corporativos de Artia
            colors: ['#00113a', '#2552ca', '#b3c5ff', '#ffffff', '#f8fafc'],
          },
        },
        // Bloques personalizados de Artia
        blockManager: {
          appendTo: '#gjs-blocks',
          blocks: [
            {
              id: 'artia-header',
              label: 'Header Artia',
              category: 'Artia',
              content: `
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#00113a;border-radius:12px 12px 0 0;">
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
              content: `
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#00113a;border-radius:0 0 12px 12px;">
                  <tr><td style="padding:24px 40px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:12px;color:#fff;font-weight:700;">Artia Studio</p>
                    <p style="margin:0 0 8px;font-size:11px;color:rgba(255,255,255,0.55);">Marketing & Publicidad Integral · Ecuador</p>
                    <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.3);">artia.estudioin@gmail.com &nbsp;|&nbsp; +593 969 937 265</p>
                  </td></tr>
                </table>`,
            },
            {
              id: 'artia-cta-wa',
              label: 'Botón WhatsApp',
              category: 'Artia',
              content: `<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px 0;">
                <a href="https://wa.me/593969937265" style="display:inline-block;background:#10b981;color:#fff;padding:12px 32px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
                  Contactar por WhatsApp
                </a>
              </td></tr></table>`,
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
          ],
        },
        // Panel de capas y estilos
        panels: {
          defaults: [
            {
              id: 'panel-switcher',
              el: '#panel-switcher',
              buttons: [
                {
                  id: 'show-blocks',
                  active: true,
                  label: 'Bloques',
                  command: 'show-blocks',
                  togglable: false,
                },
                {
                  id: 'show-style',
                  label: 'Estilos',
                  command: 'show-styles',
                  togglable: false,
                },
                {
                  id: 'show-layers',
                  label: 'Capas',
                  command: 'show-layers',
                  togglable: false,
                },
              ],
            },
          ],
        },
      })

      // Comandos para cambiar paneles
      editor.Commands.add('show-blocks', {
        run(e: GrapesjsEditor) {
          document.getElementById('gjs-blocks')!.style.display = 'block'
          document.getElementById('gjs-styles')!.style.display = 'none'
          document.getElementById('gjs-layers')!.style.display = 'none'
        },
      })
      editor.Commands.add('show-styles', {
        run(e: GrapesjsEditor) {
          document.getElementById('gjs-blocks')!.style.display = 'none'
          document.getElementById('gjs-styles')!.style.display = 'block'
          document.getElementById('gjs-layers')!.style.display = 'none'
        },
      })
      editor.Commands.add('show-layers', {
        run(e: GrapesjsEditor) {
          document.getElementById('gjs-blocks')!.style.display = 'none'
          document.getElementById('gjs-styles')!.style.display = 'none'
          document.getElementById('gjs-layers')!.style.display = 'block'
        },
      })

      // Cargar contenido existente si estamos editando
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

  // ── Guardar en Supabase ─────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!editorRef.current || !name.trim()) return

    setSaving(true)
    try {
      const html    = editorRef.current.getHtml()
      const css     = editorRef.current.getCss()
      const gjsData = editorRef.current.getProjectData()

      // El HTML final para enviar por email incluye los estilos inline
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

      await onSave({ name, description, html: fullHtml, gjsData })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }, [name, description, onSave])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Barra superior del editor */}
      <div style={{
        background: '#00113a',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexShrink: 0,
        zIndex: 10,
      }}>
        <a href="/admin/emails" style={{
          color: 'rgba(179,197,255,0.7)',
          fontSize: 12,
          textDecoration: 'none',
          fontWeight: 500,
          flexShrink: 0,
        }}>
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
            borderRadius: 6,
            padding: '7px 12px',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            outline: 'none',
            width: 220,
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
            borderRadius: 6,
            padding: '7px 12px',
            color: 'rgba(255,255,255,0.8)',
            fontSize: 13,
            outline: 'none',
            flex: 1,
          }}
        />

        <div id="panel-switcher" style={{ display: 'flex', gap: 6, flexShrink: 0 }} />

        <button
          onClick={handleSave}
          disabled={saving || !editorReady || !name.trim()}
          style={{
            background: saved ? '#10b981' : saving ? '#93c5fd' : '#2552ca',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 20px',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            cursor: saving || !editorReady || !name.trim() ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            transition: 'background 0.2s',
          }}
        >
          {saved ? '✓ Guardado' : saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      {/* Layout editor: sidebar izquierdo + canvas */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar paneles */}
        <div style={{
          width: 240,
          background: '#1e293b',
          flexShrink: 0,
          overflowY: 'auto',
          borderRight: '1px solid #334155',
        }}>
          <div id="gjs-blocks" style={{ display: 'block' }} />
          <div id="gjs-styles" style={{ display: 'none' }} />
          <div id="gjs-layers" style={{ display: 'none' }} />
        </div>

        {/* Canvas del editor */}
        <div ref={containerRef} style={{ flex: 1, overflow: 'hidden' }} />
      </div>
    </div>
  )
}
