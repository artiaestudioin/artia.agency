'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Save, Eye, ArrowLeft, Upload, Palette, Type, Camera,
  Music, Layout, Globe, CheckCircle, AlertCircle, Loader2,
  Smartphone, Monitor, Image as ImageIcon, Zap, Sliders,
} from 'lucide-react'
import type { ARExperience, OccasionType, UpdateARExperienceInput } from '@/types/ar'
import { DEFAULT_AR_EXPERIENCE, OCCASION_LABELS, OCCASION_EMOJIS } from '@/types/ar'

interface Props {
  mode: 'create' | 'edit'
  experienceId?: string
}

type Section = 'content' | 'design' | 'card' | 'model' | 'animation' | 'cta' | 'audio' | 'publish'

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: 'content',   label: 'Contenido',  icon: <Type size={13} /> },
  { id: 'design',    label: 'Fondo',      icon: <ImageIcon size={13} /> },
  { id: 'card',      label: 'Card',       icon: <Layout size={13} /> },
  { id: 'model',     label: 'Modelo 3D',  icon: <Camera size={13} /> },
  { id: 'animation', label: 'Animación',  icon: <Zap size={13} /> },
  { id: 'cta',       label: 'Botón',      icon: <Sliders size={13} /> },
  { id: 'audio',     label: 'Audio',      icon: <Music size={13} /> },
  { id: 'publish',   label: 'Publicar',   icon: <Globe size={13} /> },
]

const FONTS = [
  'Playfair Display', 'Cormorant Garamond', 'Lora', 'Libre Baskerville',
  'Montserrat', 'Raleway', 'Inter', 'Poppins', 'DM Sans',
]

const FRAMES = [
  { value: 'none',    label: 'Sin marco' },
  { value: 'elegant', label: '✦ Elegante' },
  { value: 'floral',  label: '🌸 Floral' },
  { value: 'minimal', label: '── Minimal' },
  { value: 'luxury',  label: '◆ Luxury' },
]

const CTA_ICONS = [
  { value: 'camera',   label: '📷 Cámara' },
  { value: 'gift',     label: '🎁 Regalo' },
  { value: 'heart',    label: '❤️ Corazón' },
  { value: 'star',     label: '⭐ Estrella' },
  { value: 'magic',    label: '✨ Magia' },
  { value: 'flower',   label: '🌸 Flor' },
  { value: 'surprise', label: '🎊 Sorpresa' },
  { value: 'rocket',   label: '🚀 Cohete' },
]

const CTA_ANIMATIONS = [
  { value: 'none',   label: 'Sin animación' },
  { value: 'pulse',  label: 'Pulso' },
  { value: 'bounce', label: 'Rebote' },
  { value: 'glow',   label: 'Brillo' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 9,
  background: '#1e1b2e', border: '1px solid #2a2642',
  color: '#f1f0f9', fontSize: 13, outline: 'none', boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer', appearance: 'none' as const,
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block', fontSize: 11, fontWeight: 700,
      color: '#6b6894', marginBottom: 5,
      letterSpacing: '0.06em', textTransform: 'uppercase',
    }}>
      {children}
    </label>
  )
}

function Field({ children, mb = 16 }: { children: React.ReactNode; mb?: number }) {
  return <div style={{ marginBottom: mb }}>{children}</div>
}

function ColorRow({
  label, value, onChange
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field>
      <Label>{label}</Label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 40, height: 40, borderRadius: 8, border: 'none', padding: 2, background: '#1e1b2e', cursor: 'pointer', flexShrink: 0 }} />
        <input style={{ ...inputStyle, flex: 1 }} value={value} onChange={e => onChange(e.target.value)} />
      </div>
    </Field>
  )
}

function RangeRow({
  label, value, min, max, step = 1, unit = '', onChange
}: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <Field>
      <Label>{label}: <span style={{ color: '#c084fc' }}>{value}{unit}</span></Label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#c084fc' }} />
    </Field>
  )
}

// ── Editor principal ──────────────────────────────────────────────────────────
export default function ARExperienceEditor({ mode, experienceId }: Props) {
  const router = useRouter()
  const [section, setSection]     = useState<Section>('content')
  const [form, setForm]           = useState<Partial<ARExperience>>(DEFAULT_AR_EXPERIENCE)
  const [saving, setSaving]       = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [toast, setToast]         = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile')
  const fileGlbRef   = useRef<HTMLInputElement>(null)
  const fileUsdzRef  = useRef<HTMLInputElement>(null)
  const fileAudioRef = useRef<HTMLInputElement>(null)
  const fileBgRef    = useRef<HTMLInputElement>(null)
  const fileLogoRef  = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === 'edit' && experienceId) {
      fetch(`/api/ar/experiences/${experienceId}`)
        .then(r => r.json())
        .then(j => { if (j.data) setForm(j.data) })
    }
  }, [mode, experienceId])

  function set<K extends keyof ARExperience>(key: K, value: ARExperience[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function handleSave(andPublish = false) {
    setSaving(true)
    if (andPublish) setPublishing(true)
    try {
      const payload: UpdateARExperienceInput = {
        title: form.title, subtitle: form.subtitle,
        message: form.message, recipient_name: form.recipient_name,
        occasion: form.occasion,
        bg_image: form.bg_image ?? null, bg_color: form.bg_color,
        bg_overlay_opacity: form.bg_overlay_opacity,
        primary_color: form.primary_color, secondary_color: form.secondary_color,
        font_family: form.font_family, font_size_title: form.font_size_title,
        text_color: form.text_color,
        card_bg_color: form.card_bg_color, card_opacity: form.card_opacity,
        card_border_radius: form.card_border_radius,
        logo_url: form.logo_url ?? null,
        model_url: form.model_url ?? null, model_ios_url: form.model_ios_url ?? null,
        model_type: form.model_type, model_alt: form.model_alt,
        animation_name: form.animation_name ?? null,
        animation_autoplay: form.animation_autoplay, animation_loop: form.animation_loop,
        animation_speed: form.animation_speed,
        cta_text: form.cta_text, cta_color: form.cta_color,
        cta_text_color: form.cta_text_color, cta_border_radius: form.cta_border_radius,
        cta_icon: form.cta_icon, cta_animation: form.cta_animation,
        audio_url: form.audio_url ?? null, audio_autoplay: form.audio_autoplay,
        frame_style: form.frame_style, campaign_id: form.campaign_id ?? null,
        ...(andPublish ? { status: 'active' as const } : {}),
      }

      if (mode === 'create') {
        const res  = await fetch('/api/ar/experiences', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        showToast('Experiencia creada ✓', 'ok')
        router.push(`/admin/ar/${json.data.id}/editar`)
      } else {
        const res  = await fetch(`/api/ar/experiences/${experienceId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        setForm(json.data)
        showToast(andPublish ? 'Publicada ✓' : 'Guardada ✓', 'ok')
      }
    } catch (err: any) {
      showToast(err.message ?? 'Error al guardar', 'err')
    } finally {
      setSaving(false); setPublishing(false)
    }
  }

  async function handleUpload(file: File, uploadType: string, field: keyof ARExperience) {
    if (!experienceId) {
      showToast('Guarda primero para subir archivos', 'err'); return
    }
    setUploading(uploadType)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('experience_id', experienceId)
      const res  = await fetch('/api/ar/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? json.hint ?? 'Error al subir')
      set(field as any, json.url)
      showToast('Archivo subido ✓', 'ok')
    } catch (err: any) {
      showToast(err.message, 'err')
    } finally {
      setUploading(null)
    }
  }

  // Regenerar URL con host correcto
  async function handleRegenerateUrl() {
    if (!experienceId) return
    const res  = await fetch(`/api/ar/experiences/${experienceId}/regenerate-url`, { method: 'POST' })
    const json = await res.json()
    if (json.data) { setForm(prev => ({ ...prev, ...json.data })); showToast('URL actualizada ✓', 'ok') }
    else showToast(json.error, 'err')
  }

  const previewUrl = form.public_url

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: '#0d0b1a', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Panel izquierdo ── */}
      <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #2a2642', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2642', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => router.push('/admin/ar')}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6b6894', display: 'flex', padding: 4 }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 11, color: '#6b6894', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {mode === 'create' ? 'Nueva' : 'Editando'}
            </p>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#f1f0f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {form.title || 'Sin título'}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <button onClick={() => handleSave(false)} disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1px solid #2a2642', background: '#1e1b2e', color: '#f1f0f9', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              {saving && !publishing ? <Loader2 size={12} /> : <Save size={12} />} Guardar
            </button>
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: '1px solid #2a2642', background: '#1e1b2e', color: '#9ca3af', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                <Eye size={12} /> Ver
              </a>
            )}
          </div>
        </div>

        {/* Secciones nav */}
        <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid #2a2642', background: '#0d0b1a' }}>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '9px 12px', fontSize: 11, fontWeight: 700,
              border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              color: section === s.id ? '#c084fc' : '#6b6894',
              borderBottom: section === s.id ? '2px solid #c084fc' : '2px solid transparent',
            }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* Campos */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {section === 'content'   && <SectionContent   form={form} set={set} />}
          {section === 'design'    && <SectionDesign    form={form} set={set} fileRef={fileBgRef} uploading={uploading} onUpload={handleUpload} experienceId={experienceId} />}
          {section === 'card'      && <SectionCard      form={form} set={set} fileRef={fileLogoRef} uploading={uploading} onUpload={handleUpload} experienceId={experienceId} />}
          {section === 'model'     && <SectionModel     form={form} set={set} fileGlbRef={fileGlbRef} fileUsdzRef={fileUsdzRef} uploading={uploading} onUpload={handleUpload} experienceId={experienceId} />}
          {section === 'animation' && <SectionAnimation form={form} set={set} />}
          {section === 'cta'       && <SectionCTA       form={form} set={set} />}
          {section === 'audio'     && <SectionAudio     form={form} set={set} fileRef={fileAudioRef} uploading={uploading} onUpload={handleUpload} experienceId={experienceId} />}
          {section === 'publish'   && <SectionPublish   form={form} onPublish={() => handleSave(true)} publishing={publishing} onRegenerateUrl={handleRegenerateUrl} />}
        </div>
      </div>

      {/* ── Panel derecho: preview ── */}
      <div style={{ flex: 1, background: '#0a0713', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>

        {/* Toggle preview */}
        <div style={{ display: 'flex', gap: 6, background: '#1e1b2e', borderRadius: 10, padding: 4 }}>
          {(['mobile', 'desktop'] as const).map(m => (
            <button key={m} onClick={() => setPreviewMode(m)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: previewMode === m ? '#c084fc' : 'transparent',
              color: previewMode === m ? '#fff' : '#6b6894',
              border: 'none',
            }}>
              {m === 'mobile' ? <Smartphone size={12} /> : <Monitor size={12} />}
              {m === 'mobile' ? 'Móvil' : 'Desktop'}
            </button>
          ))}
        </div>

        {/* Preview frame */}
        {previewMode === 'mobile' ? (
          <div style={{
            width: 375, height: 720,
            borderRadius: 40, overflow: 'hidden',
            border: '6px solid #2a2642',
            boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
            flexShrink: 0,
          }}>
            <MobilePreview form={form} />
          </div>
        ) : (
          <div style={{
            width: '100%', maxWidth: 800, height: 500,
            borderRadius: 16, overflow: 'hidden',
            border: '3px solid #2a2642',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <MobilePreview form={form} desktop />
          </div>
        )}
        <p style={{ fontSize: 11, color: '#6b6894' }}>
          {previewMode === 'mobile' ? 'iPhone 14 – 375×720' : 'Desktop – 800×500'}
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 10,
          background: toast.type === 'ok' ? '#14532d' : '#450a0a',
          border: `1px solid ${toast.type === 'ok' ? '#22c55e' : '#ef4444'}`,
          color: toast.type === 'ok' ? '#86efac' : '#fca5a5',
          fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {toast.type === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={fileGlbRef}   type="file" accept=".glb,.gltf" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'glb', 'model_url')} />
      <input ref={fileUsdzRef}  type="file" accept=".usdz"      style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'usdz', 'model_ios_url')} />
      <input ref={fileAudioRef} type="file" accept=".mp3,.ogg,.wav" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'audio', 'audio_url')} />
      <input ref={fileBgRef}    type="file" accept="image/*"    style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'image', 'bg_image')} />
      <input ref={fileLogoRef}  type="file" accept="image/*"    style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], 'image', 'logo_url')} />
    </div>
  )
}

// ── Secciones ─────────────────────────────────────────────────────────────────

function SectionContent({ form, set }: any) {
  return (
    <>
      <Field>
        <Label>Título principal</Label>
        <input style={inputStyle} value={form.title ?? ''} onChange={e => set('title', e.target.value)} placeholder="¡Feliz Día, Papá!" />
      </Field>
      <Field>
        <Label>Subtítulo (opcional)</Label>
        <input style={inputStyle} value={form.subtitle ?? ''} onChange={e => set('subtitle', e.target.value)} placeholder="Un regalo especial para ti" />
      </Field>
      <Field>
        <Label>Nombre del destinatario</Label>
        <input style={inputStyle} value={form.recipient_name ?? ''} onChange={e => set('recipient_name', e.target.value)} placeholder="Papá, María, Amor…" />
      </Field>
      <Field>
        <Label>Mensaje personalizado</Label>
        <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
          value={form.message ?? ''} onChange={e => set('message', e.target.value)}
          placeholder="Gracias por cada enseñanza, cada abrazo y cada momento compartido…" />
      </Field>
      <Field>
        <Label>Ocasión</Label>
        <select style={selectStyle} value={form.occasion ?? 'birthday'} onChange={e => set('occasion', e.target.value as OccasionType)}>
          {(Object.entries(OCCASION_LABELS) as [OccasionType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{OCCASION_EMOJIS[k]} {v}</option>
          ))}
        </select>
      </Field>
    </>
  )
}

function SectionDesign({ form, set, fileRef, uploading, onUpload, experienceId }: any) {
  return (
    <>
      <div style={{ marginBottom: 16, padding: 12, background: '#1e1b2e', borderRadius: 12, border: '1px solid #2a2642' }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#f1f0f9' }}>Imagen de fondo</p>
        <button onClick={() => fileRef.current?.click()} disabled={uploading === 'image'}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 9, background: '#c084fc22', border: '1px dashed #c084fc', color: '#c084fc', fontWeight: 600, fontSize: 12, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
          {uploading === 'image' ? <Loader2 size={12} /> : <Upload size={12} />}
          {uploading === 'image' ? 'Subiendo…' : 'Subir imagen (.jpg, .png, .webp)'}
        </button>
        {form.bg_image && (
          <div style={{ marginTop: 8, position: 'relative' }}>
            <img src={form.bg_image} alt="bg" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8 }} />
            <button onClick={() => set('bg_image', null)}
              style={{ position: 'absolute', top: 4, right: 4, background: '#ef4444', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 7px', cursor: 'pointer' }}>
              ✕
            </button>
          </div>
        )}
        <p style={{ margin: '8px 0 0', fontSize: 11, color: '#6b6894' }}>O pega URL:</p>
        <input style={{ ...inputStyle, marginTop: 5 }} value={form.bg_image ?? ''} onChange={e => set('bg_image', e.target.value || null)} placeholder="https://…" />
        {!experienceId && (
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#f59e0b' }}>💡 Guarda primero para subir archivos</p>
        )}
      </div>

      {form.bg_image && (
        <RangeRow label="Opacidad del overlay" value={form.bg_overlay_opacity ?? 0.55} min={0} max={1} step={0.05}
          onChange={v => set('bg_overlay_opacity', v)} />
      )}

      <ColorRow label="Color de fondo" value={form.bg_color ?? '#0f0a1a'} onChange={v => set('bg_color', v)} />
      <ColorRow label="Color primario" value={form.primary_color ?? '#ff6b35'} onChange={v => set('primary_color', v)} />
      <ColorRow label="Color secundario" value={form.secondary_color ?? '#ff8c5a'} onChange={v => set('secondary_color', v)} />

      <Field>
        <Label>Fuente tipográfica</Label>
        <select style={selectStyle} value={form.font_family ?? 'Playfair Display'} onChange={e => set('font_family', e.target.value)}>
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </Field>

      <ColorRow label="Color del texto" value={form.text_color ?? '#ffffff'} onChange={v => set('text_color', v)} />
      <RangeRow label="Tamaño del título" value={form.font_size_title ?? 34} min={20} max={52} unit="px" onChange={v => set('font_size_title', v)} />

      <Field>
        <Label>Marco decorativo</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
          {FRAMES.map(fr => (
            <button key={fr.value} onClick={() => set('frame_style', fr.value)} style={{
              padding: '8px 6px', borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: form.frame_style === fr.value ? '#c084fc22' : '#1e1b2e',
              border: `1px solid ${form.frame_style === fr.value ? '#c084fc' : '#2a2642'}`,
              color: form.frame_style === fr.value ? '#c084fc' : '#6b6894',
            }}>{fr.label}</button>
          ))}
        </div>
      </Field>
    </>
  )
}

function SectionCard({ form, set, fileRef, uploading, onUpload, experienceId }: any) {
  return (
    <>
      <ColorRow label="Color de la card" value={form.card_bg_color ?? '#ffffff'} onChange={v => set('card_bg_color', v)} />
      <RangeRow label="Opacidad de la card" value={form.card_opacity ?? 0.12} min={0} max={1} step={0.01} onChange={v => set('card_opacity', v)} />
      <RangeRow label="Border radius de la card" value={form.card_border_radius ?? 28} min={0} max={48} unit="px" onChange={v => set('card_border_radius', v)} />

      <div style={{ margin: '16px 0', borderTop: '1px solid #2a2642' }} />

      <div style={{ padding: 12, background: '#1e1b2e', borderRadius: 12, border: '1px solid #2a2642' }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#f1f0f9' }}>Logo (opcional)</p>
        <button onClick={() => fileRef.current?.click()} disabled={uploading === 'logo'}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 9, background: '#818cf822', border: '1px dashed #818cf8', color: '#818cf8', fontWeight: 600, fontSize: 12, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
          {uploading === 'logo' ? <Loader2 size={12} /> : <Upload size={12} />}
          Subir logo
        </button>
        {form.logo_url && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={form.logo_url} alt="logo" style={{ height: 36, objectFit: 'contain', borderRadius: 6, background: '#fff', padding: 4 }} />
            <button onClick={() => set('logo_url', null)}
              style={{ background: '#ef4444', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 7px', cursor: 'pointer' }}>✕</button>
          </div>
        )}
        <input style={{ ...inputStyle, marginTop: 8 }} value={form.logo_url ?? ''} onChange={e => set('logo_url', e.target.value || null)} placeholder="https://…/logo.png" />
        {!experienceId && (
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#f59e0b' }}>💡 Guarda primero para subir archivos</p>
        )}
      </div>
    </>
  )
}

function SectionModel({ form, set, fileGlbRef, fileUsdzRef, uploading, onUpload, experienceId }: any) {
  return (
    <>
      <div style={{ background: '#1e1b2e', border: '1px solid #2a2642', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#f1f0f9' }}>Modelo .glb (Android / WebXR)</p>
        <button onClick={() => fileGlbRef.current?.click()} disabled={uploading === 'glb'}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 9, background: '#c084fc22', border: '1px dashed #c084fc', color: '#c084fc', fontWeight: 600, fontSize: 12, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
          {uploading === 'glb' ? <Loader2 size={12} /> : <Upload size={12} />}
          {uploading === 'glb' ? 'Subiendo…' : 'Subir .glb'}
        </button>
        {form.model_url && <p style={{ margin: '6px 0 0', fontSize: 11, color: '#22c55e', wordBreak: 'break-all' }}>✓ {form.model_url}</p>}
        <p style={{ margin: '8px 0 4px', fontSize: 11, color: '#6b6894' }}>O pega URL:</p>
        <input style={inputStyle} value={form.model_url ?? ''} onChange={e => set('model_url', e.target.value)} placeholder="https://…/modelo.glb" />
      </div>

      <div style={{ background: '#1e1b2e', border: '1px solid #2a2642', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#f1f0f9' }}>Modelo .usdz (iOS AR Quick Look)</p>
        <p style={{ margin: '0 0 10px', fontSize: 11, color: '#6b6894' }}>Requerido para AR en iPhone / iPad</p>
        <button onClick={() => fileUsdzRef.current?.click()} disabled={uploading === 'usdz'}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 9, background: '#818cf822', border: '1px dashed #818cf8', color: '#818cf8', fontWeight: 600, fontSize: 12, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
          {uploading === 'usdz' ? <Loader2 size={12} /> : <Upload size={12} />}
          {uploading === 'usdz' ? 'Subiendo…' : 'Subir .usdz'}
        </button>
        {form.model_ios_url && <p style={{ margin: '6px 0 0', fontSize: 11, color: '#22c55e', wordBreak: 'break-all' }}>✓ {form.model_ios_url}</p>}
        <input style={{ ...inputStyle, marginTop: 8 }} value={form.model_ios_url ?? ''} onChange={e => set('model_ios_url', e.target.value)} placeholder="https://…/modelo.usdz" />
      </div>

      <Field>
        <Label>Descripción accesible (alt text)</Label>
        <input style={inputStyle} value={form.model_alt ?? ''} onChange={e => set('model_alt', e.target.value)} placeholder="Tu regalo en realidad aumentada" />
      </Field>

      {!experienceId && (
        <div style={{ padding: 10, background: '#45221433', border: '1px solid #f59e0b44', borderRadius: 9, fontSize: 12, color: '#fbbf24' }}>
          💡 Guarda la experiencia primero para poder subir modelos
        </div>
      )}
    </>
  )
}

function SectionAnimation({ form, set }: any) {
  return (
    <>
      <div style={{ padding: 12, background: '#1e1b2e', borderRadius: 12, border: '1px solid #2a2642', marginBottom: 16 }}>
        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#f1f0f9' }}>Animación del modelo GLB</p>
        <p style={{ margin: '0 0 12px', fontSize: 11, color: '#6b6894' }}>Si tu modelo .glb tiene animaciones integradas, escribe aquí el nombre exacto de la animación.</p>
        <Field>
          <Label>Nombre de la animación</Label>
          <input style={inputStyle} value={form.animation_name ?? ''} onChange={e => set('animation_name', e.target.value || null)} placeholder="hug_loop / wave / celebration…" />
        </Field>
        <Field mb={10}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.animation_autoplay ?? true} onChange={e => set('animation_autoplay', e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#c084fc', cursor: 'pointer' }} />
            <span style={{ fontSize: 13, color: '#f1f0f9' }}>Reproducir automáticamente</span>
          </label>
        </Field>
        <Field mb={10}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.animation_loop ?? true} onChange={e => set('animation_loop', e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#c084fc', cursor: 'pointer' }} />
            <span style={{ fontSize: 13, color: '#f1f0f9' }}>Repetir en loop</span>
          </label>
        </Field>
        <RangeRow label="Velocidad de reproducción" value={form.animation_speed ?? 1} min={0.25} max={3} step={0.25}
          onChange={v => set('animation_speed', v)} unit="×" />
      </div>
      <div style={{ padding: 10, background: '#1e1b2e33', border: '1px solid #2a2642', borderRadius: 9, fontSize: 12, color: '#6b6894' }}>
        💡 Animaciones comunes en modelos de regalos:<br />
        <code style={{ color: '#c084fc' }}>Idle</code>, <code style={{ color: '#c084fc' }}>Wave</code>, <code style={{ color: '#c084fc' }}>Celebrate</code>, <code style={{ color: '#c084fc' }}>Hug_loop</code>
      </div>
    </>
  )
}

function SectionCTA({ form, set }: any) {
  const ctaIcons: Record<string, string> = {
    camera: '📷', gift: '🎁', heart: '❤️', star: '⭐', magic: '✨', flower: '🌸', surprise: '🎊', rocket: '🚀',
  }

  return (
    <>
      <Field>
        <Label>Texto del botón</Label>
        <input style={inputStyle} value={form.cta_text ?? 'Ver mi sorpresa'} onChange={e => set('cta_text', e.target.value)} />
        <p style={{ margin: '5px 0 0', fontSize: 11, color: '#6b6894' }}>Ej: "Ver mi sorpresa", "Abrir mi regalo", "Activar AR"</p>
      </Field>

      <Field>
        <Label>Ícono del botón</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
          {CTA_ICONS.map(ic => (
            <button key={ic.value} onClick={() => set('cta_icon', ic.value)} style={{
              padding: '8px 4px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: form.cta_icon === ic.value ? '#c084fc22' : '#1e1b2e',
              border: `1px solid ${form.cta_icon === ic.value ? '#c084fc' : '#2a2642'}`,
              color: form.cta_icon === ic.value ? '#c084fc' : '#6b6894',
              textAlign: 'center',
            }}>{ic.label}</button>
          ))}
        </div>
      </Field>

      <Field>
        <Label>Animación del botón</Label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CTA_ANIMATIONS.map(a => (
            <button key={a.value} onClick={() => set('cta_animation', a.value)} style={{
              padding: '7px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: form.cta_animation === a.value ? '#c084fc22' : '#1e1b2e',
              border: `1px solid ${form.cta_animation === a.value ? '#c084fc' : '#2a2642'}`,
              color: form.cta_animation === a.value ? '#c084fc' : '#6b6894',
            }}>{a.label}</button>
          ))}
        </div>
      </Field>

      <ColorRow label="Color del botón" value={form.cta_color ?? '#ff6b35'} onChange={v => set('cta_color', v)} />
      <ColorRow label="Color del texto" value={form.cta_text_color ?? '#ffffff'} onChange={v => set('cta_text_color', v)} />
      <RangeRow label="Border radius" value={form.cta_border_radius ?? 999} min={0} max={999} unit="px" onChange={v => set('cta_border_radius', v)} />

      {/* Preview botón */}
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center' }}>
        <button style={{
          padding: '16px 36px', fontSize: 16, fontWeight: 700,
          background: form.cta_color ?? '#ff6b35', color: form.cta_text_color ?? '#fff',
          border: 'none', borderRadius: form.cta_border_radius ?? 999,
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'default',
          boxShadow: `0 8px 28px ${form.cta_color ?? '#ff6b35'}55`,
        }}>
          <span style={{ fontSize: 20 }}>{ctaIcons[form.cta_icon ?? 'camera'] ?? '📷'}</span>
          {form.cta_text || 'Ver mi sorpresa'}
        </button>
      </div>
    </>
  )
}

function SectionAudio({ form, set, fileRef, uploading, onUpload, experienceId }: any) {
  return (
    <>
      <div style={{ background: '#1e1b2e', border: '1px solid #2a2642', borderRadius: 12, padding: 14, marginBottom: 14 }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#f1f0f9' }}>Música de fondo (opcional)</p>
        <button onClick={() => fileRef.current?.click()} disabled={uploading === 'audio'}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 9, background: '#22c55e22', border: '1px dashed #22c55e', color: '#22c55e', fontWeight: 600, fontSize: 12, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
          {uploading === 'audio' ? <Loader2 size={12} /> : <Upload size={12} />}
          Subir audio (.mp3, .ogg, .wav)
        </button>
        {form.audio_url && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <audio src={form.audio_url} controls style={{ width: '100%', height: 32 }} />
            <button onClick={() => set('audio_url', null)}
              style={{ background: '#ef4444', border: 'none', borderRadius: 6, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 7px', cursor: 'pointer' }}>✕</button>
          </div>
        )}
        <input style={{ ...inputStyle, marginTop: 8 }} value={form.audio_url ?? ''} onChange={e => set('audio_url', e.target.value || null)} placeholder="https://…/audio.mp3" />
      </div>
      <Field mb={8}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.audio_autoplay ?? false} onChange={e => set('audio_autoplay', e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#c084fc', cursor: 'pointer' }} />
          <span style={{ fontSize: 13, color: '#f1f0f9' }}>Reproducir automáticamente al abrir</span>
        </label>
        <p style={{ margin: '4px 0 0 24px', fontSize: 11, color: '#6b6894' }}>Los navegadores móviles pueden bloquear el autoplay sin interacción del usuario.</p>
      </Field>
    </>
  )
}

function SectionPublish({ form, onPublish, publishing, onRegenerateUrl }: any) {
  const isActive = form.status === 'active'
  return (
    <div>
      {/* Estado */}
      <div style={{
        padding: 16, borderRadius: 12, marginBottom: 16,
        background: isActive ? '#14532d33' : '#1e1b2e',
        border: `1px solid ${isActive ? '#22c55e' : '#2a2642'}`,
      }}>
        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: isActive ? '#22c55e' : '#f1f0f9' }}>
          {isActive ? '🟢 Activa — visible al público' : '⚫ Borrador — no visible'}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
          {isActive ? 'Cualquiera con el QR o URL puede acceder.' : 'Publica para que los clientes puedan acceder.'}
        </p>
      </div>

      {/* URL + QR */}
      {form.public_url && (
        <div style={{ background: '#1e1b2e', border: '1px solid #2a2642', borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#6b6894', textTransform: 'uppercase', letterSpacing: '0.06em' }}>URL pública</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <a href={form.public_url} target="_blank" rel="noopener noreferrer"
              style={{ color: '#c084fc', fontSize: 12, wordBreak: 'break-all', flex: 1 }}>
              {form.public_url}
            </a>
            <button onClick={onRegenerateUrl} title="Actualizar URL con el host actual"
              style={{ padding: '5px 10px', borderRadius: 7, background: '#1e1b2e', border: '1px solid #2a2642', color: '#9ca3af', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
              🔄
            </button>
          </div>

          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#6b6894', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Código QR</p>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(form.public_url)}&bgcolor=ffffff&color=0a0a0f&margin=4`}
            alt="QR" style={{ width: 140, height: 140, borderRadius: 10, border: '4px solid #fff', display: 'block' }}
          />
          <a
            href={`https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(form.public_url)}&bgcolor=ffffff&color=0a0a0f&margin=8`}
            download={`qr-${form.slug}.png`} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, fontSize: 12, color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
            ↓ Descargar QR (800×800)
          </a>
        </div>
      )}

      {/* Botón publicar */}
      {!isActive && (
        <button onClick={onPublish} disabled={publishing} style={{
          width: '100%', padding: '13px', borderRadius: 12, fontSize: 15, fontWeight: 700,
          background: 'linear-gradient(135deg, #c084fc, #818cf8)',
          color: '#fff', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 8px 24px rgba(192,132,252,0.35)',
        }}>
          {publishing ? <Loader2 size={15} /> : <Globe size={15} />}
          {publishing ? 'Publicando…' : 'Publicar Experiencia'}
        </button>
      )}
      {isActive && (
        <button onClick={async () => {
          await fetch(`/api/ar/experiences/${form.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'paused' }),
          })
          window.location.reload()
        }} style={{
          width: '100%', padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: '#451a034d', border: '1px solid #f59e0b55', color: '#fbbf24',
          cursor: 'pointer',
        }}>
          ⏸ Despublicar (pausa)
        </button>
      )}
    </div>
  )
}

// ── Preview ───────────────────────────────────────────────────────────────────
function MobilePreview({ form, desktop }: { form: Partial<ARExperience>; desktop?: boolean }) {
  const primary  = form.primary_color   ?? '#ff6b35'
  const bg       = form.bg_color        ?? '#0f0a1a'
  const font     = form.font_family     ?? 'Playfair Display'
  const occasion = form.occasion        ?? 'birthday'
  const ctaColor = form.cta_color       ?? primary
  const ctaTxt   = form.cta_text_color  ?? '#ffffff'
  const ctaRad   = form.cta_border_radius ?? 999
  const cardBg   = form.card_bg_color   ?? '#ffffff'
  const cardOp   = form.card_opacity    ?? 0.12
  const cardRad  = form.card_border_radius ?? 28
  const overlay  = form.bg_overlay_opacity ?? 0.55

  const ctaIcons: Record<string, string> = {
    camera: '📷', gift: '🎁', heart: '❤️', star: '⭐', magic: '✨', flower: '🌸', surprise: '🎊', rocket: '🚀',
  }
  const emoji = OCCASION_EMOJIS[occasion]

  // parse color hex to rgba for card
  function hexToRgba(hex: string, alpha: number) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
  const cardBgRgba = hexToRgba(cardBg.startsWith('#') ? cardBg : '#ffffff', cardOp)

  return (
    <div style={{
      width: '100%', height: '100%',
      background: form.bg_image
        ? undefined
        : `radial-gradient(ellipse 140% 80% at 50% -10%, ${primary}44 0%, ${bg} 65%)`,
      backgroundImage: form.bg_image ? `url(${form.bg_image})` : undefined,
      backgroundSize: 'cover', backgroundPosition: 'center',
      position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Overlay */}
      {form.bg_image && (
        <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${overlay})` }} />
      )}

      <div style={{
        position: 'relative', zIndex: 1,
        width: desktop ? '60%' : '84%',
        background: cardBgRgba,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: cardRad,
        padding: desktop ? '32px 28px' : '32px 20px',
        textAlign: 'center',
        boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
      }}>
        {/* Logo */}
        {form.logo_url && (
          <img src={form.logo_url} alt="logo" style={{ height: 28, objectFit: 'contain', marginBottom: 14, opacity: 0.8 }} />
        )}

        {/* Título */}
        <h1 style={{
          margin: '0 0 12px', fontFamily: `"${font}", serif`,
          fontSize: desktop ? 26 : 20, fontWeight: 700, lineHeight: 1.2,
          color: form.text_color ?? '#ffffff',
        }}>
          {form.title || 'Mi Regalo Especial'}
        </h1>

        {/* Emoji */}
        <div style={{ fontSize: desktop ? 36 : 32, lineHeight: 1, marginBottom: 12 }}>{emoji}</div>

        {/* Subtítulo */}
        {form.subtitle && (
          <p style={{ margin: '0 0 8px', fontSize: desktop ? 13 : 11, color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter, system-ui' }}>
            {form.subtitle}
          </p>
        )}

        {/* Recipient */}
        {form.recipient_name && (
          <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: `${primary}cc`, fontFamily: 'Inter, system-ui' }}>
            Para {form.recipient_name}
          </p>
        )}

        {/* Mensaje */}
        <p style={{
          margin: '0 0 24px', fontSize: desktop ? 13 : 11, lineHeight: 1.6,
          color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter, system-ui',
        }}>
          {(form.message ?? '').slice(0, 120)}{(form.message?.length ?? 0) > 120 ? '…' : ''}
        </p>

        {/* CTA */}
        <div style={{
          padding: `${desktop ? 14 : 12}px 20px`,
          background: ctaColor, color: ctaTxt,
          borderRadius: Math.min(ctaRad, 50),
          fontWeight: 700, fontSize: desktop ? 14 : 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: `0 6px 20px ${ctaColor}55`,
          fontFamily: 'Inter, system-ui',
        }}>
          <span style={{ fontSize: 16 }}>{ctaIcons[form.cta_icon ?? 'gift'] ?? '📷'}</span>
          {form.cta_text || 'Ver mi sorpresa'}
        </div>
      </div>

      {/* Watermark */}
      <div style={{
        position: 'absolute', bottom: 8, left: 0, right: 0,
        textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.2)',
        fontFamily: 'Inter, system-ui', letterSpacing: '0.1em',
      }}>
        ARTIA WebAR
      </div>
    </div>
  )
}
