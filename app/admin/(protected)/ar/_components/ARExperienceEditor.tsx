'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Save, Eye, ArrowLeft, Upload, Palette, Type, Camera,
  Music, Layout, Globe, CheckCircle, AlertCircle, Loader2
} from 'lucide-react'
import type { ARExperience, OccasionType, UpdateARExperienceInput } from '@/types/ar'
import { DEFAULT_AR_EXPERIENCE, OCCASION_LABELS, OCCASION_EMOJIS } from '@/types/ar'

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  mode: 'create' | 'edit'
  experienceId?: string
}

// ── Sección del editor ────────────────────────────────────────────────────────
type Section = 'content' | 'design' | 'model' | 'cta' | 'audio' | 'publish'

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'content', label: 'Contenido',  icon: <Type size={14} /> },
  { id: 'design',  label: 'Diseño',     icon: <Palette size={14} /> },
  { id: 'model',   label: 'Modelo 3D',  icon: <Camera size={14} /> },
  { id: 'cta',     label: 'Botón AR',   icon: <Globe size={14} /> },
  { id: 'audio',   label: 'Audio',      icon: <Music size={14} /> },
  { id: 'publish', label: 'Publicar',   icon: <CheckCircle size={14} /> },
]

const FONTS = ['Playfair Display', 'Cormorant Garamond', 'Montserrat', 'Inter', 'Lora', 'Raleway']
const FRAMES = [
  { value: 'none',    label: 'Sin marco' },
  { value: 'elegant', label: 'Elegante' },
  { value: 'floral',  label: 'Floral' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'luxury',  label: 'Lujo' },
]

// ── Main Component ────────────────────────────────────────────────────────────
export default function ARExperienceEditor({ mode, experienceId }: Props) {
  const router  = useRouter()
  const [section, setSection] = useState<Section>('content')
  const [form, setForm] = useState<Partial<ARExperience>>(DEFAULT_AR_EXPERIENCE)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [uploading, setUploading] = useState<'glb' | 'usdz' | 'audio' | null>(null)
  const fileGlbRef  = useRef<HTMLInputElement>(null)
  const fileUsdzRef = useRef<HTMLInputElement>(null)
  const fileAudioRef = useRef<HTMLInputElement>(null)

  // Cargar experiencia existente
  useEffect(() => {
    if (mode === 'edit' && experienceId) {
      fetch(`/api/ar/experiences/${experienceId}`)
        .then(r => r.json())
        .then(j => { if (j.data) setForm(j.data) })
    }
  }, [mode, experienceId])

  function setField<K extends keyof ARExperience>(key: K, value: ARExperience[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSave(andPublish = false) {
    setSaving(true)
    if (andPublish) setPublishing(true)
    try {
      const payload: UpdateARExperienceInput = {
        title:            form.title,
        message:          form.message,
        recipient_name:   form.recipient_name,
        occasion:         form.occasion,
        bg_color:         form.bg_color,
        bg_image:         form.bg_image ?? null,
        primary_color:    form.primary_color,
        secondary_color:  form.secondary_color,
        font_family:      form.font_family,
        frame_style:      form.frame_style,
        model_url:        form.model_url ?? null,
        model_ios_url:    form.model_ios_url ?? null,
        model_type:       form.model_type,
        model_alt:        form.model_alt,
        cta_text:         form.cta_text,
        cta_color:        form.cta_color,
        cta_text_color:   form.cta_text_color,
        cta_border_radius: form.cta_border_radius,
        audio_url:        form.audio_url ?? null,
        audio_autoplay:   form.audio_autoplay,
        ...(andPublish ? { status: 'active' as const } : {}),
      }

      if (mode === 'create') {
        const res  = await fetch('/api/ar/experiences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        showToast('Experiencia creada ✓', 'ok')
        router.push(`/admin/ar/${json.data.id}/editar`)
      } else {
        const res  = await fetch(`/api/ar/experiences/${experienceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        setForm(json.data)
        showToast(andPublish ? 'Publicada y activa ✓' : 'Guardada ✓', 'ok')
      }
    } catch (err: any) {
      showToast(err.message ?? 'Error al guardar', 'err')
    } finally {
      setSaving(false)
      setPublishing(false)
    }
  }

  async function handleUpload(
    file: File,
    type: 'glb' | 'usdz' | 'audio',
    fieldGlb: keyof ARExperience,
    fieldIos?: keyof ARExperience
  ) {
    if (!experienceId) {
      showToast('Guarda primero la experiencia antes de subir archivos', 'err')
      return
    }
    setUploading(type)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('experience_id', experienceId)
      const res  = await fetch('/api/ar/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      if (type === 'glb')   setField(fieldGlb as any, json.url)
      if (type === 'usdz' && fieldIos) setField(fieldIos as any, json.url)
      if (type === 'audio') setField(fieldGlb as any, json.url)
      showToast('Archivo subido ✓', 'ok')
    } catch (err: any) {
      showToast(err.message ?? 'Error al subir', 'err')
    } finally {
      setUploading(null)
    }
  }

  // ── Preview URL ───────────────────────────────────────────────────────────
  const previewUrl = form.public_url
    ? `${form.public_url}?preview=1`
    : null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: '#0d0b1a' }}>

      {/* Panel izquierdo: editor */}
      <div style={{ width: 440, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #2a2642', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2642', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/admin/ar')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
              {mode === 'create' ? 'Nueva experiencia' : 'Editando'}
            </p>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f0f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {form.title || 'Sin título'}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #2a2642', background: '#1e1b2e', color: '#f1f0f9', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {saving && !publishing ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Guardar
            </button>
            {previewUrl && (
              <a
                href={previewUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1px solid #2a2642', background: '#1e1b2e', color: '#9ca3af', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
              >
                <Eye size={13} /> Ver
              </a>
            )}
          </div>
        </div>

        {/* Nav secciones */}
        <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid #2a2642', padding: '0 8px' }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 14px', fontSize: 12, fontWeight: 600,
                border: 'none', background: 'none', cursor: 'pointer',
                color: section === s.id ? '#c084fc' : '#9ca3af',
                borderBottom: section === s.id ? '2px solid #c084fc' : '2px solid transparent',
                whiteSpace: 'nowrap',
              }}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Campos */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {section === 'content' && (
            <SectionContent form={form} setField={setField} />
          )}
          {section === 'design' && (
            <SectionDesign form={form} setField={setField} />
          )}
          {section === 'model' && (
            <SectionModel
              form={form} setField={setField}
              uploading={uploading}
              fileGlbRef={fileGlbRef}
              fileUsdzRef={fileUsdzRef}
              onUpload={handleUpload}
              experienceId={experienceId}
            />
          )}
          {section === 'cta' && (
            <SectionCTA form={form} setField={setField} />
          )}
          {section === 'audio' && (
            <SectionAudio
              form={form} setField={setField}
              uploading={uploading}
              fileAudioRef={fileAudioRef}
              onUpload={handleUpload}
              experienceId={experienceId}
            />
          )}
          {section === 'publish' && (
            <SectionPublish
              form={form}
              onPublish={() => handleSave(true)}
              publishing={publishing}
            />
          )}
        </div>
      </div>

      {/* Panel derecho: preview */}
      <div style={{ flex: 1, background: '#0a0713', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#6b6894', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
          Preview — Experiencia del cliente
        </p>
        <div style={{
          width: 375, height: 812,
          borderRadius: 44, overflow: 'hidden',
          border: '8px solid #2a2642',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          background: form.bg_color || '#0a0a0f',
          position: 'relative',
        }}>
          <MobilePreview form={form} />
        </div>
        <p style={{ margin: '16px 0 0', fontSize: 12, color: '#6b6894' }}>
          iPhone 14 — 375×812
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 18px', borderRadius: 12,
          background: toast.type === 'ok' ? '#14532d' : '#450a0a',
          border: `1px solid ${toast.type === 'ok' ? '#22c55e' : '#ef4444'}`,
          color: toast.type === 'ok' ? '#86efac' : '#fca5a5',
          fontSize: 14, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {toast.type === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileGlbRef} type="file" accept=".glb,.gltf" style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'glb', 'model_url')}
      />
      <input
        ref={fileUsdzRef} type="file" accept=".usdz" style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'usdz', 'model_url', 'model_ios_url')}
      />
      <input
        ref={fileAudioRef} type="file" accept=".mp3,.ogg,.wav" style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'audio', 'audio_url')}
      />
    </div>
  )
}

// ── Sub-sections ──────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ca3af', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{children}</label>
}

function Field({ children, mb = 18 }: { children: React.ReactNode; mb?: number }) {
  return <div style={{ marginBottom: mb }}>{children}</div>
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  background: '#1e1b2e', border: '1px solid #2a2642',
  color: '#f1f0f9', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}

function SectionContent({ form, setField }: { form: Partial<ARExperience>; setField: any }) {
  return (
    <>
      <Field>
        <Label>Título de la experiencia</Label>
        <input style={inputStyle} value={form.title ?? ''} onChange={e => setField('title', e.target.value)} placeholder="Ej: Tu regalo de cumpleaños" />
      </Field>
      <Field>
        <Label>Nombre del destinatario</Label>
        <input style={inputStyle} value={form.recipient_name ?? ''} onChange={e => setField('recipient_name', e.target.value)} placeholder="Ej: Papá, María, Amor…" />
      </Field>
      <Field>
        <Label>Mensaje personalizado</Label>
        <textarea
          style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
          value={form.message ?? ''}
          onChange={e => setField('message', e.target.value)}
          placeholder="Escribe el mensaje que verá el destinatario al abrir el QR…"
        />
      </Field>
      <Field>
        <Label>Ocasión</Label>
        <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.occasion ?? 'birthday'} onChange={e => setField('occasion', e.target.value as OccasionType)}>
          {(Object.entries(OCCASION_LABELS) as [OccasionType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{OCCASION_EMOJIS[k]} {v}</option>
          ))}
        </select>
      </Field>
    </>
  )
}

function SectionDesign({ form, setField }: { form: Partial<ARExperience>; setField: any }) {
  return (
    <>
      <Field>
        <Label>Color de fondo</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="color" value={form.bg_color ?? '#0a0a0f'} onChange={e => setField('bg_color', e.target.value)}
            style={{ width: 44, height: 44, borderRadius: 8, border: 'none', padding: 2, background: '#1e1b2e', cursor: 'pointer' }} />
          <input style={{ ...inputStyle, flex: 1 }} value={form.bg_color ?? '#0a0a0f'} onChange={e => setField('bg_color', e.target.value)} />
        </div>
      </Field>
      <Field>
        <Label>Color primario (acento)</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="color" value={form.primary_color ?? '#c084fc'} onChange={e => setField('primary_color', e.target.value)}
            style={{ width: 44, height: 44, borderRadius: 8, border: 'none', padding: 2, background: '#1e1b2e', cursor: 'pointer' }} />
          <input style={{ ...inputStyle, flex: 1 }} value={form.primary_color ?? '#c084fc'} onChange={e => setField('primary_color', e.target.value)} />
        </div>
      </Field>
      <Field>
        <Label>Color secundario</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="color" value={form.secondary_color ?? '#818cf8'} onChange={e => setField('secondary_color', e.target.value)}
            style={{ width: 44, height: 44, borderRadius: 8, border: 'none', padding: 2, background: '#1e1b2e', cursor: 'pointer' }} />
          <input style={{ ...inputStyle, flex: 1 }} value={form.secondary_color ?? '#818cf8'} onChange={e => setField('secondary_color', e.target.value)} />
        </div>
      </Field>
      <Field>
        <Label>Tipografía</Label>
        <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.font_family ?? 'Playfair Display'} onChange={e => setField('font_family', e.target.value)}>
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </Field>
      <Field>
        <Label>Marco decorativo</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {FRAMES.map(fr => (
            <button
              key={fr.value}
              onClick={() => setField('frame_style', fr.value)}
              style={{
                padding: '10px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: form.frame_style === fr.value ? '#c084fc22' : '#1e1b2e',
                border: `1px solid ${form.frame_style === fr.value ? '#c084fc' : '#2a2642'}`,
                color: form.frame_style === fr.value ? '#c084fc' : '#9ca3af',
              }}
            >
              {fr.label}
            </button>
          ))}
        </div>
      </Field>
      <Field>
        <Label>URL imagen de fondo (opcional)</Label>
        <input style={inputStyle} value={form.bg_image ?? ''} onChange={e => setField('bg_image', e.target.value || null)} placeholder="https://…/imagen.jpg" />
      </Field>
    </>
  )
}

function SectionModel({ form, setField, uploading, fileGlbRef, fileUsdzRef, onUpload, experienceId }: any) {
  return (
    <>
      <div style={{ background: '#1e1b2e', border: '1px solid #2a2642', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#f1f0f9' }}>Modelo 3D (.glb — Android)</p>
        <button
          onClick={() => fileGlbRef.current?.click()}
          disabled={uploading === 'glb'}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: '#c084fc22', border: '1px dashed #c084fc', color: '#c084fc', fontWeight: 600, fontSize: 13, cursor: 'pointer', width: '100%', justifyContent: 'center' }}
        >
          {uploading === 'glb' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading === 'glb' ? 'Subiendo…' : 'Subir modelo .glb'}
        </button>
        {form.model_url && (
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#22c55e', wordBreak: 'break-all' }}>✓ {form.model_url}</p>
        )}
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b6894' }}>O pega una URL:</p>
        <input style={{ ...inputStyle, marginTop: 6 }} value={form.model_url ?? ''} onChange={e => setField('model_url', e.target.value)} placeholder="https://…/modelo.glb" />
      </div>

      <div style={{ background: '#1e1b2e', border: '1px solid #2a2642', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#f1f0f9' }}>Modelo iOS (.usdz — AR Quick Look)</p>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b6894' }}>Requerido para AR en iPhone/iPad</p>
        <button
          onClick={() => fileUsdzRef.current?.click()}
          disabled={uploading === 'usdz'}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: '#818cf822', border: '1px dashed #818cf8', color: '#818cf8', fontWeight: 600, fontSize: 13, cursor: 'pointer', width: '100%', justifyContent: 'center' }}
        >
          {uploading === 'usdz' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading === 'usdz' ? 'Subiendo…' : 'Subir modelo .usdz'}
        </button>
        {form.model_ios_url && (
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#22c55e', wordBreak: 'break-all' }}>✓ {form.model_ios_url}</p>
        )}
        <input style={{ ...inputStyle, marginTop: 8 }} value={form.model_ios_url ?? ''} onChange={e => setField('model_ios_url', e.target.value)} placeholder="https://…/modelo.usdz" />
      </div>

      <Field>
        <Label>Descripción del modelo (alt text)</Label>
        <input style={inputStyle} value={form.model_alt ?? ''} onChange={e => setField('model_alt', e.target.value)} placeholder="Tu regalo en realidad aumentada" />
      </Field>

      {!experienceId && (
        <div style={{ padding: 12, background: '#451a034d', border: '1px solid #f59e0b55', borderRadius: 10, fontSize: 13, color: '#fbbf24' }}>
          💡 Guarda la experiencia primero para poder subir archivos
        </div>
      )}
    </>
  )
}

function SectionCTA({ form, setField }: { form: Partial<ARExperience>; setField: any }) {
  return (
    <>
      <Field>
        <Label>Texto del botón</Label>
        <input style={inputStyle} value={form.cta_text ?? 'Abrir Cámara'} onChange={e => setField('cta_text', e.target.value)} placeholder="Abrir Cámara" />
        <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6b6894' }}>Ej: "Ver mi Sorpresa", "Abrir mi Regalo", "Ver en AR"</p>
      </Field>
      <Field>
        <Label>Color del botón</Label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="color" value={form.cta_color ?? '#c084fc'} onChange={e => setField('cta_color', e.target.value)}
            style={{ width: 44, height: 44, borderRadius: 8, border: 'none', padding: 2, background: '#1e1b2e', cursor: 'pointer' }} />
          <input style={{ ...inputStyle, flex: 1 }} value={form.cta_color ?? '#c084fc'} onChange={e => setField('cta_color', e.target.value)} />
        </div>
      </Field>
      <Field>
        <Label>Color del texto</Label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="color" value={form.cta_text_color ?? '#ffffff'} onChange={e => setField('cta_text_color', e.target.value)}
            style={{ width: 44, height: 44, borderRadius: 8, border: 'none', padding: 2, background: '#1e1b2e', cursor: 'pointer' }} />
          <input style={{ ...inputStyle, flex: 1 }} value={form.cta_text_color ?? '#ffffff'} onChange={e => setField('cta_text_color', e.target.value)} />
        </div>
      </Field>
      <Field>
        <Label>Border radius: {form.cta_border_radius ?? 999}px</Label>
        <input type="range" min={0} max={999} value={form.cta_border_radius ?? 999}
          onChange={e => setField('cta_border_radius', parseInt(e.target.value))}
          style={{ width: '100%', accentColor: '#c084fc' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b6894' }}>
          <span>Cuadrado</span><span>Redondeado</span>
        </div>
      </Field>
      {/* Preview del botón */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
        <button style={{
          padding: '16px 36px',
          background: form.cta_color ?? '#c084fc',
          color: form.cta_text_color ?? '#fff',
          borderRadius: form.cta_border_radius ?? 999,
          border: 'none', fontSize: 17, fontWeight: 700, cursor: 'default',
          boxShadow: `0 8px 28px ${form.cta_color ?? '#c084fc'}66`,
        }}>
          📷 {form.cta_text || 'Abrir Cámara'}
        </button>
      </div>
    </>
  )
}

function SectionAudio({ form, setField, uploading, fileAudioRef, onUpload, experienceId }: any) {
  return (
    <>
      <div style={{ background: '#1e1b2e', border: '1px solid #2a2642', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#f1f0f9' }}>Audio de fondo (opcional)</p>
        <button
          onClick={() => fileAudioRef.current?.click()}
          disabled={uploading === 'audio'}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: '#22c55e22', border: '1px dashed #22c55e', color: '#22c55e', fontWeight: 600, fontSize: 13, cursor: 'pointer', width: '100%', justifyContent: 'center' }}
        >
          {uploading === 'audio' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          Subir audio (.mp3, .ogg, .wav)
        </button>
        {form.audio_url && (
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#22c55e', wordBreak: 'break-all' }}>✓ {form.audio_url}</p>
        )}
        <input style={{ ...inputStyle, marginTop: 8 }} value={form.audio_url ?? ''} onChange={e => setField('audio_url', e.target.value || null)} placeholder="https://…/audio.mp3" />
      </div>
      <Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.audio_autoplay ?? false} onChange={e => setField('audio_autoplay', e.target.checked)}
            style={{ width: 18, height: 18, accentColor: '#c084fc', cursor: 'pointer' }} />
          <span style={{ fontSize: 14, color: '#f1f0f9' }}>Reproducir automáticamente al abrir</span>
        </label>
        <p style={{ margin: '6px 0 0 28px', fontSize: 12, color: '#6b6894' }}>Los navegadores modernos pueden bloquear el autoplay. El cliente siempre puede activarlo manualmente.</p>
      </Field>
    </>
  )
}

function SectionPublish({ form, onPublish, publishing }: { form: Partial<ARExperience>; onPublish: () => void; publishing: boolean }) {
  const isActive = form.status === 'active'
  return (
    <div>
      {form.public_url && (
        <div style={{ background: '#1e1b2e', border: '1px solid #2a2642', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>URL pública</p>
          <a href={form.public_url} target="_blank" rel="noopener noreferrer" style={{ color: '#c084fc', fontSize: 14, wordBreak: 'break-all' }}>
            {form.public_url}
          </a>
          <div style={{ marginTop: 16 }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Código QR</p>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(form.public_url)}&bgcolor=ffffff&color=0a0a0f&margin=4`}
              alt="QR"
              style={{ width: 160, height: 160, borderRadius: 12, border: '4px solid #fff', display: 'block' }}
            />
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(form.public_url)}&bgcolor=ffffff&color=0a0a0f&margin=6`}
              download={`qr-${form.slug}.png`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 13, color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}
            >
              ↓ Descargar QR (600×600)
            </a>
          </div>
        </div>
      )}

      <div style={{
        padding: 20, borderRadius: 12,
        background: isActive ? '#14532d33' : '#1e1b2e',
        border: `1px solid ${isActive ? '#22c55e' : '#2a2642'}`,
        marginBottom: 20,
      }}>
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: isActive ? '#22c55e' : '#f1f0f9' }}>
          Estado: {isActive ? '🟢 Activa' : '⚫ Borrador'}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
          {isActive
            ? 'Esta experiencia es pública. Cualquiera con el QR o URL puede acceder.'
            : 'En borrador. No es visible para el público todavía.'}
        </p>
      </div>

      {!isActive && (
        <button
          onClick={onPublish}
          disabled={publishing}
          style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: 'linear-gradient(135deg, #c084fc, #818cf8)',
            color: '#fff', fontWeight: 700, fontSize: 16,
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 8px 28px rgba(192,132,252,0.35)',
          }}
        >
          {publishing ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
          {publishing ? 'Publicando…' : 'Publicar Experiencia'}
        </button>
      )}
    </div>
  )
}

// ── Mobile Preview ────────────────────────────────────────────────────────────
function MobilePreview({ form }: { form: Partial<ARExperience> }) {
  const primary   = form.primary_color   ?? '#c084fc'
  const secondary = form.secondary_color ?? '#818cf8'
  const bg        = form.bg_color        ?? '#0a0a0f'
  const font      = form.font_family     ?? 'Playfair Display'
  const occasion  = form.occasion        ?? 'birthday'

  return (
    <div style={{
      width: '100%', height: '100%',
      background: form.bg_image
        ? `linear-gradient(to bottom, ${bg}cc, ${bg}), url(${form.bg_image}) center/cover`
        : `radial-gradient(ellipse at 50% 0%, ${primary}33 0%, ${bg} 65%)`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', fontFamily: font,
      overflow: 'hidden', padding: '48px 24px 32px',
      boxSizing: 'border-box',
    }}>
      {/* Notch */}
      <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 120, height: 30, background: '#111', borderRadius: 20 }} />

      {/* Emoji ocasión */}
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        background: `${primary}22`, border: `2px solid ${primary}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 36, marginBottom: 20, marginTop: 24,
        boxShadow: `0 0 40px ${primary}44`,
      }}>
        {OCCASION_EMOJIS[occasion]}
      </div>

      {/* Título */}
      {form.recipient_name && (
        <p style={{ margin: '0 0 6px', fontSize: 13, color: `${primary}aa`, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>
          Para {form.recipient_name}
        </p>
      )}
      <h1 style={{ margin: '0 0 16px', fontSize: 22, fontWeight: 700, color: '#ffffff', textAlign: 'center', lineHeight: 1.2 }}>
        {form.title || 'Mi Regalo Especial'}
      </h1>

      {/* Mensaje */}
      <p style={{ margin: '0 0 32px', fontSize: 14, color: '#ffffffaa', textAlign: 'center', lineHeight: 1.6, maxWidth: 280 }}>
        {form.message || 'Tienes un regalo esperándote…'}
      </p>

      {/* Botón AR */}
      <button style={{
        padding: '16px 40px', fontSize: 16, fontWeight: 700,
        background: form.cta_color ?? primary,
        color: form.cta_text_color ?? '#fff',
        border: 'none', borderRadius: form.cta_border_radius ?? 999,
        boxShadow: `0 10px 32px ${form.cta_color ?? primary}55`,
        cursor: 'default', pointerEvents: 'none',
      }}>
        📷 {form.cta_text || 'Abrir Cámara'}
      </button>

      {/* Hint */}
      <p style={{ margin: '16px 0 0', fontSize: 12, color: '#ffffff44', textAlign: 'center' }}>
        La cámara se activará al tocar el botón
      </p>

      {/* Artia logo */}
      <div style={{ marginTop: 'auto', paddingTop: 20, fontSize: 11, color: '#ffffff22', letterSpacing: '0.1em' }}>
        ARTIA · WebAR
      </div>
    </div>
  )
}
