'use client'
// app/admin/catalogo/categorias/page.tsx

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Layers, Plus, Edit3, Trash2, GripVertical, Check, X, RefreshCw } from 'lucide-react'
import { COLORS, SHADOWS, fmtDate, EmptyState } from '@/components/DesignSystem'

interface Category {
  id: string; name: string; slug: string
  description: string | null; icon: string | null
  sort_order: number; active: boolean; created_at: string
}

const EMPTY: Partial<Category> = { name: '', slug: '', description: '', icon: '📦', sort_order: 0, active: true }

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0',
  borderRadius: 9, fontSize: 13, outline: 'none', background: '#fafafa',
  fontFamily: 'Inter, sans-serif', transition: 'border-color .2s',
}

export default function CategoriasPage() {
  const supabase = createClient()
  const [cats, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Category> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000) }

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('catalog_categories').select('*').order('sort_order')
    setCats(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!editing?.name) return
    setSaving(true)
    const payload = {
      name: editing.name, slug: editing.slug || slugify(editing.name),
      description: editing.description || null, icon: editing.icon || '📦',
      sort_order: editing.sort_order ?? 0, active: editing.active ?? true,
    }
    if (isNew) {
      await supabase.from('catalog_categories').insert(payload)
    } else if (editing.id) {
      await supabase.from('catalog_categories').update(payload).eq('id', editing.id)
    }
    setEditing(null); setSaving(false)
    showToast(isNew ? 'Categoría creada ✓' : 'Categoría actualizada ✓')
    load()
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar esta categoría? Los productos quedarán sin categoría.')) return
    await supabase.from('catalog_categories').delete().eq('id', id)
    showToast('Categoría eliminada')
    load()
  }

  async function toggle(cat: Category) {
    await supabase.from('catalog_categories').update({ active: !cat.active }).eq('id', cat.id)
    setCats(prev => prev.map(c => c.id === cat.id ? { ...c, active: !cat.active } : c))
  }

  const ICON_PRESETS = ['📦', '💳', '☕', '👕', '🎨', '📋', '🏷️', '🔖', '📄', '📦', '🪧', '🎁', '🖨️', '✨', '🎯', '⭐', '🔥', '💡', '🎪', '🏆']

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', padding: 24, fontFamily: 'Inter, sans-serif' }}>

      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 2000, background: '#00113a', color: '#fff', padding: '12px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', gap: 8, animation: 'artiaFadeIn .3s ease' }}>
          <Check size={16} /> {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={24} color="#7c3aed" /> Categorías del Catálogo
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>{cats.length} categorías · {cats.filter(c => c.active).length} activas</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
            <RefreshCw size={13} /> Actualizar
          </button>
          <button onClick={() => { setEditing(EMPTY); setIsNew(true) }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>
            <Plus size={15} /> Nueva Categoría
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: editing ? '1fr 380px' : '1fr', gap: 20 }}>

        {/* Category list */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: SHADOWS.sm }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : cats.length === 0 ? (
            <EmptyState icon="🏷️" title="Sin categorías" subtitle="Crea tu primera categoría para organizar el catálogo" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Icono', 'Nombre', 'Slug', 'Orden', 'Estado', 'Fecha', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: '.5px', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cats.map(cat => (
                    <tr key={cat.id} style={{ borderBottom: '1px solid #f8fafc', opacity: cat.active ? 1 : 0.55 }}>
                      <td style={{ padding: '12px 16px', fontSize: 22 }}>{cat.icon || '📦'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{cat.name}</span>
                        {cat.description && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{cat.description}</p>}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{cat.slug}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#475569', textAlign: 'center' }}>{cat.sort_order}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => toggle(cat)} style={{ padding: '3px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 800, background: cat.active ? '#dcfce7' : '#fee2e2', color: cat.active ? '#166534' : '#dc2626' }}>
                          {cat.active ? '● Activa' : '○ Inactiva'}
                        </button>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{fmtDate(cat.created_at)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { setEditing(cat); setIsNew(false) }} style={{ background: '#f5f3ff', border: 'none', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#7c3aed', display: 'flex', alignItems: 'center' }}>
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => del(cat.id)} style={{ background: '#fef2f2', border: 'none', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit panel */}
        {editing && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 24, boxShadow: SHADOWS.sm, position: 'sticky', top: 24, alignSelf: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {isNew ? '+ Nueva Categoría' : 'Editar Categoría'}
              </h3>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18 }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Icono</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {ICON_PRESETS.map(icon => (
                    <button key={icon} onClick={() => setEditing(e => ({ ...e, icon }))}
                      style={{ width: 36, height: 36, borderRadius: 8, border: `2px solid ${editing.icon === icon ? '#7c3aed' : '#e2e8f0'}`, background: editing.icon === icon ? '#f5f3ff' : '#fafafa', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {icon}
                    </button>
                  ))}
                </div>
                <input value={editing.icon || ''} onChange={e => setEditing(p => ({ ...p, icon: e.target.value }))} placeholder="O escribe un emoji..." style={{ ...inp }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Nombre *</label>
                <input value={editing.name || ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value, slug: isNew ? slugify(e.target.value) : p.slug }))} style={inp} placeholder="Ej: Tazas Sublimadas" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Slug (URL)</label>
                <input value={editing.slug || ''} onChange={e => setEditing(p => ({ ...p, slug: e.target.value }))} style={inp} placeholder="tazas-sublimadas" />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Descripción</label>
                <textarea rows={2} value={editing.description || ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} style={{ ...inp, resize: 'vertical' }} placeholder="Describe brevemente esta categoría..." />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Orden (menor = primero)</label>
                <input type="number" value={editing.sort_order ?? 0} onChange={e => setEditing(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} style={inp} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                <input type="checkbox" checked={editing.active ?? true} onChange={e => setEditing(p => ({ ...p, active: e.target.checked }))} style={{ width: 16, height: 16, accentColor: '#7c3aed' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Categoría activa</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Visible en el catálogo público</div>
                </div>
              </label>

              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button onClick={() => setEditing(null)} style={{ flex: 1, padding: '10px 0', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b' }}>Cancelar</button>
                <button onClick={save} disabled={saving} style={{ flex: 2, padding: '10px 0', border: 'none', borderRadius: 10, background: saving ? '#94a3b8' : 'linear-gradient(135deg,#00113a,#2552ca)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700 }}>
                  {saving ? 'Guardando...' : (isNew ? 'Crear Categoría' : 'Guardar Cambios')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes artiaFadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  )
}
