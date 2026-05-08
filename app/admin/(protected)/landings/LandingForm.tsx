'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { LandingConfig, LandingFeature, LandingTestimonial, DEFAULT_LANDING_CONFIG } from '@/types/landing'

interface LandingFormProps {
  initialData?: {
    id?: string
    slug: string
    name: string
    description: string
    config: LandingConfig
    status: string
    html_content?: string
  }
}

const TABS = [
  { key: 'general', label: 'General', icon: '📄' },
  { key: 'content', label: 'Contenido', icon: '🎨' },
  { key: 'media', label: 'Media', icon: '🖼️' },
  { key: 'pricing', label: 'Precios', icon: '💰' },
  { key: 'features', label: 'Features', icon: '✨' },
  { key: 'testimonials', label: 'Testimonios', icon: '💬' },
  { key: 'tracking', label: 'Tracking', icon: '📊' },
  { key: 'advanced', label: 'Avanzado', icon: '⚙️' },
]

export default function LandingForm({ initialData }: LandingFormProps) {
  const router = useRouter()
  const isEdit = !!initialData?.id

  const [activeTab, setActiveTab] = useState('general')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [dirty, setDirty] = useState(false)
  const [dupeResult, setDupeResult] = useState<{ slug: string; id: string } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const initialFormRef = useRef(JSON.stringify(form))

  const [form, setForm] = useState({
    slug: initialData?.slug || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    status: initialData?.status || 'draft',
    config: { ...DEFAULT_LANDING_CONFIG, ...(initialData?.config || {}) } as LandingConfig,
    html_content: initialData?.html_content || '',
  })

  // Wrapper que marca dirty y auto-genera slug desde nombre
  const setFormDirty = useCallback((updater: React.SetStateAction<typeof form>) => {
    setForm(prev => {
      const next = typeof updater === 'function' ? (updater as (p: typeof prev) => typeof prev)(prev) : updater
      // Auto-generar slug si está vacío y el nombre cambió
      if (!next.slug?.trim() && next.name?.trim()) {
        next.slug = next.name.toLowerCase()
          .normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 60)
      }
      return next
    })
    setDirty(true)
  }, [])

  const showMsg = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const updateConfig = (field: string, value: any) => {
    setFormDirty(f => ({ ...f, config: { ...f.config, [field]: value } as LandingConfig }))
  }

  const addFeature = () => {
    updateConfig('features', [...form.config.features, { icon: '✨', title: '', desc: '' }])
  }

  const updateFeature = (idx: number, field: keyof LandingFeature, value: string) => {
    const features = [...form.config.features]
    features[idx] = { ...features[idx], [field]: value }
    updateConfig('features', features)
  }

  const removeFeature = (idx: number) => {
    updateConfig('features', form.config.features.filter((_, i) => i !== idx))
  }

  const addTestimonial = () => {
    updateConfig('testimonials', [...form.config.testimonials, { name: '', location: '', text: '', rating: 5, image: '' }])
  }

  const updateTestimonial = (idx: number, field: keyof LandingTestimonial, value: any) => {
    const testimonials = [...form.config.testimonials]
    testimonials[idx] = { ...testimonials[idx], [field]: value }
    updateConfig('testimonials', testimonials)
  }

  const removeTestimonial = (idx: number) => {
    updateConfig('testimonials', form.config.testimonials.filter((_, i) => i !== idx))
  }

  const addGalleryImage = () => {
    updateConfig('gallery', [...form.config.gallery, ''])
  }

  const updateGalleryImage = (idx: number, value: string) => {
    const gallery = [...form.config.gallery]
    gallery[idx] = value
    updateConfig('gallery', gallery)
  }

  const removeGalleryImage = (idx: number) => {
    updateConfig('gallery', form.config.gallery.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // ── Validación ──────────────────────────────────────────────
    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = 'El nombre es obligatorio'
    if (!form.slug.trim()) errors.slug = 'El slug es obligatorio'
    if (form.slug.length < 2) errors.slug = 'El slug debe tener al menos 2 caracteres'
    if (!/^[a-z0-9-]+$/.test(form.slug)) errors.slug = 'Solo letras minúsculas, números y guiones'
    if (form.config.price <= 0) errors.price = 'El precio debe ser mayor a 0'
    if (form.config.old_price && form.config.old_price <= 0) errors.old_price = 'El precio anterior debe ser mayor a 0'
    if (!form.config.headline.trim()) errors.headline = 'El headline es obligatorio'
    if (!form.config.image.trim()) errors.image = 'La imagen principal es obligatoria'
    if (form.config.whatsapp && !/^\d{10,15}$/.test(form.config.whatsapp.replace(/\D/g, ''))) {
      errors.whatsapp = 'Número de WhatsApp inválido (10-15 dígitos)'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      showMsg('Corrige los errores marcados en rojo', false)
      // Saltar al primer tab con error
      const errorFields = Object.keys(errors)
      if (errorFields.some(f => ['name', 'slug', 'description', 'status'].includes(f))) setActiveTab('general')
      else if (errorFields.some(f => ['headline', 'subheadline', 'cta_text', 'product_name'].includes(f))) setActiveTab('content')
      else if (errorFields.some(f => ['image', 'gallery'].includes(f))) setActiveTab('media')
      else if (errorFields.some(f => ['price', 'old_price', 'whatsapp'].includes(f))) setActiveTab('pricing')
      return
    }

    setFieldErrors({})
    setSaving(true)

    try {
      const url = isEdit ? `/api/admin/landings/${initialData!.id}` : '/api/admin/landings'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: form.slug,
          name: form.name,
          description: form.description,
          config: form.config,
          status: form.status,
          html_content: form.html_content || null,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setDirty(false)
        initialFormRef.current = JSON.stringify(form)
        showMsg(isEdit ? 'Landing actualizada ✓' : 'Landing creada ✓')
        if (!isEdit) {
          setTimeout(() => router.push('/admin/landings'), 1000)
        }
      } else {
        // Si el servidor devuelve errores por campo
        if (data.fieldErrors) setFieldErrors(data.fieldErrors)
        showMsg(data.error || 'Error al guardar', false)
      }
    } catch (e) {
      showMsg('Error de conexión', false)
    } finally {
      setSaving(false)
    }
  }

  const duplicateLanding = async () => {
    if (!initialData?.id) return
    const variantName = prompt('Nombre de la variante:', 'Variante A')
    if (!variantName) return

    try {
      const res = await fetch(`/api/admin/landings/${initialData.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant_name: variantName, traffic_split: 50 }),
      })
      const data = await res.json()

      if (res.ok && data.variant) {
        setDupeResult({ slug: data.variant.slug, id: data.variant.id })
        showMsg(`Variante "${variantName}" creada ✓`)
        router.refresh()
      } else {
        showMsg(data.error || 'Error creando variante', false)
      }
    } catch (e) {
      showMsg('Error de conexión', false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0',
    borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase',
    color: '#94a3b8', display: 'block', marginBottom: 5,
  }

  const tabBtn = (key: string) => ({
    padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
    cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: 6,
    background: activeTab === key ? '#0f172a' : '#f1f5f9',
    color: activeTab === key ? '#fff' : '#64748b',
    transition: 'all 0.15s',
  })

  // ── beforeunload: avisar si hay cambios sin guardar ───────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // ── Auto-save cada 30s si hay cambios ─────────────────────────
  useEffect(() => {
    if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    if (dirty && isEdit && initialData?.id) {
      autoSaveRef.current = setInterval(() => {
        handleSubmit({ preventDefault: () => {} } as React.FormEvent)
      }, 30000)
    }
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current) }
  }, [dirty, isEdit, initialData?.id])

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Modal: resultado de duplicar */}
      {dupeResult && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420,
            padding: '24px 28px', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          }}>
            <p style={{ fontSize: 28, margin: '0 0 8px' }}>🎉</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
              Variante creada exitosamente
            </p>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px' }}>
              Se generó un nuevo slug para la variante:
            </p>
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 10, padding: '12px 16px', marginBottom: 16,
            }}>
              <p style={{ margin: 0, fontSize: 12, fontFamily: 'monospace', color: '#15803d', fontWeight: 700 }}>
                /lp/{dupeResult.slug}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDupeResult(null)}
                style={{
                  background: '#f8fafc', border: '0.5px solid #e2e8f0', color: '#475569',
                  borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cerrar
              </button>
              <a
                href={`/admin/landings/${dupeResult.id}`}
                style={{
                  background: '#0f172a', color: '#fff', borderRadius: 8,
                  padding: '8px 16px', fontSize: 13, fontWeight: 700,
                  textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                }}
              >
                Editar variante →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${toast.ok ? '#bbf7d0' : '#fecaca'}`,
          color: toast.ok ? '#15803d' : '#dc2626',
          padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>
              {isEdit ? '✏️ Editar Landing' : '➕ Nueva Landing'}
            </h1>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
              {isEdit ? `Slug: /lp/${form.slug}` : 'Configura tu página de conversión'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isEdit && (
              <button type="button" onClick={duplicateLanding}
                style={{
                  padding: '9px 16px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                  background: '#fff', color: '#475569', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                🔄 Duplicar (A/B)
              </button>
            )}
            <button type="submit" disabled={saving}
              style={{
                padding: '9px 20px', borderRadius: 8, border: 'none',
                background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              {saving ? '⏳ Guardando...' : '💾 Guardar'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
          {TABS.map(t => (
            <button key={t.key} type="button" onClick={() => setActiveTab(t.key)} style={tabBtn(t.key)}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e2e8f0', padding: '20px 24px' }}>

          {/* GENERAL */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Slug (URL) *</label>
                  <input 
                    type="text" 
                    required 
                    value={form.slug} 
                    onChange={e => { clearFieldError('slug'); setFormDirty(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })) }}
                    placeholder="taza-personalizada" 
                    style={inputStyle} 
                  />
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>URL pública: /lp/{form.slug}</p>
                  {fieldErrors.slug && (
                    <p style={{ fontSize: 11, color: '#dc2626', margin: '4px 0 0', fontWeight: 600 }}>✗ {fieldErrors.slug}</p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Nombre interno *</label>
                  <input type="text" required value={form.name} onChange={e => { clearFieldError('name'); setFormDirty(f => ({ ...f, name: e.target.value })) }}
                    placeholder="Taza Personalizada Q2 2026" style={inputStyle} />
                  {fieldErrors.name && (
                    <p style={{ fontSize: 11, color: '#dc2626', margin: '4px 0 0', fontWeight: 600 }}>✗ {fieldErrors.name}</p>
                  )}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Descripción</label>
                <input type="text" value={form.description} onChange={e => setFormDirty(f => ({ ...f, description: e.target.value }))}
                  placeholder="Notas internas..." style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Estado</label>
                  <select value={form.status} onChange={e => setFormDirty(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                    <option value="draft">📝 Borrador</option>
                    <option value="active">🟢 Activa</option>
                    <option value="paused">⏸️ Pausada</option>
                    <option value="archived">🗄️ Archivada</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Método de pago</label>
                  <select value={form.config.payment_method} onChange={e => updateConfig('payment_method', e.target.value)} style={inputStyle}>
                    <option value="whatsapp">WhatsApp Directo</option>
                    <option value="redirect">Redirección URL</option>
                    <option value="form">Formulario + Email</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Meta de conversión</label>
                  <select value={(form.config as any).conversion_goal || 'purchase'} onChange={e => updateConfig('conversion_goal', e.target.value)} style={inputStyle}>
                    <option value="purchase">Compra</option>
                    <option value="lead">Lead</option>
                    <option value="signup">Registro</option>
                    <option value="call">Llamada</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* CONTENT */}
          {activeTab === 'content' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Headline principal *</label>
                <input type="text" required value={form.config.headline} onChange={e => updateConfig('headline', e.target.value)}
                  placeholder="La Taza Que Cuenta TU Historia" style={inputStyle} />
                {fieldErrors.headline && (
                  <p style={{ fontSize: 11, color: '#dc2626', margin: '4px 0 0', fontWeight: 600 }}>✗ {fieldErrors.headline}</p>
                )}
              </div>
              <div>
                <label style={labelStyle}>Subheadline</label>
                <input type="text" value={form.config.subheadline} onChange={e => updateConfig('subheadline', e.target.value)}
                  placeholder="Personalízala con tu foto favorita..." style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>CTA Texto</label>
                  <input type="text" value={form.config.cta_text} onChange={e => updateConfig('cta_text', e.target.value)}
                    placeholder="¡Quiero la mía ahora!" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>CTA Subtexto</label>
                  <input type="text" value={form.config.cta_subtext} onChange={e => updateConfig('cta_subtext', e.target.value)}
                    placeholder="Envío gratis hoy" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Nombre del producto</label>
                  <input type="text" value={form.config.product_name} onChange={e => updateConfig('product_name', e.target.value)}
                    placeholder="Taza Personalizada Premium" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Subtítulo producto</label>
                  <input type="text" value={form.config.product_subtitle} onChange={e => updateConfig('product_subtitle', e.target.value)}
                    placeholder="Diseño único con tu foto..." style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Meta Title</label>
                  <input type="text" value={form.config.meta_title} onChange={e => updateConfig('meta_title', e.target.value)}
                    placeholder="SEO title..." style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Meta Description</label>
                  <input type="text" value={form.config.meta_description} onChange={e => updateConfig('meta_description', e.target.value)}
                    placeholder="SEO description..." style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {/* MEDIA */}
          {activeTab === 'media' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Imagen principal *</label>
                <input type="text" required value={form.config.image} onChange={e => updateConfig('image', e.target.value)}
                  placeholder="https://..." style={inputStyle} />
                {fieldErrors.image && (
                  <p style={{ fontSize: 11, color: '#dc2626', margin: '4px 0 0', fontWeight: 600 }}>✗ {fieldErrors.image}</p>
                )}
                {form.config.image && (
                  <img src={form.config.image} alt="Preview" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />
                )}
              </div>
              <div>
                <label style={labelStyle}>Meta Image (OG)</label>
                <input type="text" value={form.config.meta_image} onChange={e => updateConfig('meta_image', e.target.value)}
                  placeholder="https://..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Galería de imágenes</label>
                {form.config.gallery.map((img, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                    <input type="text" value={img} onChange={e => updateGalleryImage(idx, e.target.value)}
                      placeholder="URL imagen..." style={{ ...inputStyle, flex: 1 }} />
                    <button type="button" onClick={() => removeGalleryImage(idx)}
                      style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                      🗑️
                    </button>
                  </div>
                ))}
                <button type="button" onClick={addGalleryImage}
                  style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  + Añadir imagen
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Color primario</label>
                  <input type="color" value={form.config.color_primary} onChange={e => updateConfig('color_primary', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Color secundario</label>
                  <input type="color" value={form.config.color_secondary} onChange={e => updateConfig('color_secondary', e.target.value)} style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {/* PRICING */}
          {activeTab === 'pricing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Precio actual *</label>
                  <input type="number" step="0.01" required value={form.config.price} onChange={e => updateConfig('price', parseFloat(e.target.value || '0'))}
                    style={inputStyle} />
                  {fieldErrors.price && (
                    <p style={{ fontSize: 11, color: '#dc2626', margin: '4px 0 0', fontWeight: 600 }}>✗ {fieldErrors.price}</p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Precio anterior</label>
                  <input type="number" step="0.01" value={form.config.old_price} onChange={e => updateConfig('old_price', parseFloat(e.target.value || '0'))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Descuento</label>
                  <input type="text" value={form.config.discount} onChange={e => updateConfig('discount', e.target.value)}
                    placeholder="50%" style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Moneda</label>
                  <select value={form.config.currency} onChange={e => updateConfig('currency', e.target.value)} style={inputStyle}>
                    <option value="$">$ USD</option>
                    <option value="€">€ EUR</option>
                    <option value="£">£ GBP</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>WhatsApp número</label>
                  <input type="text" value={form.config.whatsapp} onChange={e => updateConfig('whatsapp', e.target.value)}
                    placeholder="593969937265" style={inputStyle} />
                  {fieldErrors.whatsapp && (
                    <p style={{ fontSize: 11, color: '#dc2626', margin: '4px 0 0', fontWeight: 600 }}>✗ {fieldErrors.whatsapp}</p>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Stock total</label>
                  <input type="number" value={form.config.stock_total} onChange={e => updateConfig('stock_total', parseInt(e.target.value || '0'))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Stock actual</label>
                  <input type="number" value={form.config.stock_current} onChange={e => updateConfig('stock_current', parseInt(e.target.value || '0'))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Horas countdown</label>
                  <input type="number" value={form.config.countdown_hours} onChange={e => updateConfig('countdown_hours', parseInt(e.target.value || '0'))}
                    style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {/* FEATURES */}
          {activeTab === 'features' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={labelStyle}>Características del producto</label>
                <button type="button" onClick={addFeature}
                  style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  + Añadir feature
                </button>
              </div>
              {form.config.features.map((f, idx) => (
                <div key={idx} style={{ background: '#f8fafc', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Feature #{idx + 1}</span>
                    <button type="button" onClick={() => removeFeature(idx)}
                      style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                      Eliminar
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: 8 }}>
                    <input type="text" value={f.icon} onChange={e => updateFeature(idx, 'icon', e.target.value)}
                      placeholder="🎨" style={inputStyle} />
                    <input type="text" value={f.title} onChange={e => updateFeature(idx, 'title', e.target.value)}
                      placeholder="Título..." style={inputStyle} />
                    <input type="text" value={f.desc} onChange={e => updateFeature(idx, 'desc', e.target.value)}
                      placeholder="Descripción..." style={inputStyle} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TESTIMONIALS */}
          {activeTab === 'testimonials' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={labelStyle}>Testimonios</label>
                <button type="button" onClick={addTestimonial}
                  style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  + Añadir testimonio
                </button>
              </div>
              {form.config.testimonials.map((t, idx) => (
                <div key={idx} style={{ background: '#f8fafc', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a' }}>Testimonio #{idx + 1}</span>
                    <button type="button" onClick={() => removeTestimonial(idx)}
                      style={{ background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                      Eliminar
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input type="text" value={t.name} onChange={e => updateTestimonial(idx, 'name', e.target.value)}
                      placeholder="Nombre..." style={inputStyle} />
                    <input type="text" value={t.location} onChange={e => updateTestimonial(idx, 'location', e.target.value)}
                      placeholder="Ciudad..." style={inputStyle} />
                  </div>
                  <input type="text" value={t.image} onChange={e => updateTestimonial(idx, 'image', e.target.value)}
                    placeholder="URL foto..." style={inputStyle} />
                  <textarea value={t.text} onChange={e => updateTestimonial(idx, 'text', e.target.value)}
                    placeholder="Texto del testimonio..." rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                  <div>
                    <label style={{ ...labelStyle, marginBottom: 2 }}>Rating: {t.rating}/5</label>
                    <input type="range" min="1" max="5" value={t.rating} onChange={e => updateTestimonial(idx, 'rating', parseInt(e.target.value || '0'))}
                      style={{ width: '100%' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TRACKING */}
          {activeTab === 'tracking' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Meta Pixel ID</label>
                  <input type="text" value={form.config.pixel_id} onChange={e => updateConfig('pixel_id', e.target.value)}
                    placeholder="1234567890..." style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>CAPI Access Token</label>
                  <input type="password" value={form.config.capi_token} onChange={e => updateConfig('capi_token', e.target.value)}
                    placeholder="Token secreto..." style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>PostHog Project API Key</label>
                <input type="text" value={form.config.posthog_key} onChange={e => updateConfig('posthog_key', e.target.value)}
                  placeholder="phc_..." style={inputStyle} />
              </div>
              <div style={{ background: '#eff6ff', borderRadius: 10, padding: 14, border: '1px solid #bfdbfe' }}>
                <p style={{ fontSize: 12, color: '#1e40af', margin: 0, lineHeight: 1.6 }}>
                  <strong>💡 Tip:</strong> Configura tanto Pixel como CAPI para tracking híbrido. 
                  El Pixel captura eventos del navegador y CAPI envía conversiones server-side para 
                  evitar bloqueadores de anuncios. [^3^] [^4^]
                </p>
              </div>
            </div>
          )}

          {/* ADVANCED */}
          {activeTab === 'advanced' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Viewers mínimos</label>
                  <input type="number" value={form.config.viewers_min} onChange={e => updateConfig('viewers_min', parseInt(e.target.value || '0'))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Viewers máximos</label>
                  <input type="number" value={form.config.viewers_max} onChange={e => updateConfig('viewers_max', parseInt(e.target.value || '0'))}
                    style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Campos del formulario (JSON)</label>
                <textarea value={JSON.stringify(form.config.form_fields, null, 2)} 
                  onChange={e => {
                    try { updateConfig('form_fields', JSON.parse(e.target.value)) } catch {}
                  }}
                  rows={4} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { key: 'show_stock_bar', label: 'Barra stock' },
                  { key: 'show_countdown', label: 'Countdown' },
                  { key: 'show_testimonials', label: 'Testimonios' },
                  { key: 'show_features', label: 'Features' },
                  { key: 'show_gallery', label: 'Galería' },
                  { key: 'sticky_cta', label: 'Sticky CTA' },
                ].map(opt => (
                  <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
                    <input type="checkbox" checked={form.config[opt.key as keyof LandingConfig] as boolean}
                      onChange={e => updateConfig(opt.key as keyof LandingConfig, e.target.checked)}
                      style={{ width: 16, height: 16 }} />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <label style={labelStyle}>Custom CSS</label>
                <textarea value={form.config.custom_css} onChange={e => updateConfig('custom_css', e.target.value)}
                  rows={4} placeholder="/* CSS personalizado */" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
              </div>
              <div>
                <label style={labelStyle}>Custom JS</label>
                <textarea value={form.config.custom_js} onChange={e => updateConfig('custom_js', e.target.value)}
                  rows={4} placeholder="// JavaScript personalizado" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
              </div>
              <div>
                <label style={labelStyle}>HTML Override (opcional)</label>
                <textarea value={form.html_content} onChange={e => setFormDirty(f => ({ ...f, html_content: e.target.value }))}
                  rows={6} placeholder="<html>...</html>" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12 }} />
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>
                  Si se proporciona, reemplaza completamente el renderizado dinámico.
                </p>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}