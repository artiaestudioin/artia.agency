'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const CATEGORIAS: Record<string, { color: string; bg: string; emoji: string }> = {
  branding:   { color: '#e11d48', bg: '#fff1f2', emoji: '🎨' },
  fotografia: { color: '#9333ea', bg: '#fdf4ff', emoji: '📸' },
  impresion:  { color: '#d97706', bg: '#fef3c7', emoji: '🖨️' },
  marketing:  { color: '#16a34a', bg: '#f0fdf4', emoji: '📣' },
  web:        { color: '#2563eb', bg: '#eff6ff', emoji: '🌐' },
}

type Proyecto = {
  id: string; titulo: string; cliente?: string; categoria?: string
  descripcion?: string; imagen_url?: string; destacado?: boolean
  visible?: boolean; created_at: string
}

export default function ProyectosClient({ proyectos: init, error }: { proyectos: Proyecto[]; error?: string }) {
  const router   = useRouter()
  const [proyectos, setProyectos] = useState(init)
  const [editando, setEditando]   = useState<Proyecto | null>(null)
  const [creando, setCreando]     = useState(false)
  const [form, setForm]           = useState<Partial<Proyecto>>({})
  const [guardando, setGuardando] = useState(false)
  const [borrando, setBorrando]   = useState(false)
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null)

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  function abrirEditar(p: Proyecto) {
    setEditando(p)
    setForm({ ...p })
  }

  function abrirCrear() {
    setCreando(true)
    setForm({ visible: true, destacado: false })
  }

  function cerrarModal() {
    setEditando(null)
    setCreando(false)
    setForm({})
  }

  async function guardar() {
    setGuardando(true)
    try {
      if (creando) {
        const res = await fetch('/api/admin/proyecto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (res.ok) {
          showToast('Proyecto creado ✓', true)
          cerrarModal()
          router.refresh()
        } else {
          const d = await res.json()
          showToast(d.error ?? 'Error', false)
        }
      } else if (editando) {
        const res = await fetch('/api/admin/proyecto', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editando.id, ...form }),
        })
        const data = await res.json()
        if (data.ok) {
          setProyectos(prev => prev.map(p => p.id === editando.id ? { ...p, ...form } as Proyecto : p))
          showToast('Proyecto actualizado ✓', true)
          cerrarModal()
        } else {
          showToast(data.error ?? 'Error', false)
        }
      }
    } catch {
      showToast('Error de conexión', false)
    } finally {
      setGuardando(false)
    }
  }

  async function borrar() {
    if (!editando) return
    if (!confirm(`¿Borrar "${editando.titulo}"? Esta acción no se puede deshacer.`)) return
    setBorrando(true)
    try {
      const res = await fetch('/api/admin/proyecto', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editando.id }),
      })
      const data = await res.json()
      if (data.ok) {
        setProyectos(prev => prev.filter(p => p.id !== editando.id))
        showToast('Proyecto eliminado', true)
        cerrarModal()
      } else {
        showToast(data.error ?? 'Error', false)
      }
    } catch {
      showToast('Error de conexión', false)
    } finally {
      setBorrando(false)
    }
  }

  const modalAbierto = !!editando || creando

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: toast.ok ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${toast.ok ? '#bbf7d0' : '#fecaca'}`,
          color: toast.ok ? '#15803d' : '#dc2626',
          padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#00113a', margin: '0 0 4px' }}>Proyectos</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Portafolio de trabajos de Artia Studio · {proyectos.length} proyecto{proyectos.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={abrirCrear} style={{
          background: '#00113a', color: '#fff', border: 'none', borderRadius: 8,
          padding: '9px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>
          + Nuevo proyecto
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '20px', color: '#dc2626', fontSize: 13, marginBottom: 20 }}>
          <strong>Error:</strong> {error}. Ejecuta el archivo <code>migration_recreate_proyectos.sql</code> en Supabase.
        </div>
      )}

      {/* Grid */}
      {proyectos.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {proyectos.map(p => {
            const cat = CATEGORIAS[p.categoria?.toLowerCase() ?? ''] ?? { color: '#475569', bg: '#f1f5f9', emoji: '📁' }
            return (
              <div key={p.id} onClick={() => abrirEditar(p)}
                style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e2e8f0', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.15s', display: 'flex', flexDirection: 'column' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                {p.imagen_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imagen_url} alt={p.titulo} style={{ width: '100%', height: 150, objectFit: 'cover' }} />
                ) : (
                  <div style={{ height: 90, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                    {cat.emoji}
                  </div>
                )}
                <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{p.titulo}</p>
                    {p.destacado && <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', fontWeight: 700, padding: '2px 6px', borderRadius: 999, marginLeft: 6, whiteSpace: 'nowrap' }}>⭐ Dest.</span>}
                  </div>
                  {p.cliente && <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Cliente: <strong>{p.cliente}</strong></p>}
                  {p.descripcion && <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.descripcion}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 6 }}>
                    {p.categoria && <span style={{ background: cat.bg, color: cat.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>{cat.emoji} {p.categoria}</span>}
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>Clic para editar</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e2e8f0', padding: '64px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, margin: '0 0 14px' }}>🗂️</p>
          <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>No hay proyectos aún</p>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: '#94a3b8' }}>Crea tu primer proyecto con el botón de arriba.</p>
        </div>
      )}

      {/* Modal editar / crear */}
      {modalAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) cerrarModal() }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto', padding: '28px 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#00113a' }}>
                {creando ? '+ Nuevo proyecto' : 'Editar proyecto'}
              </h2>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'titulo',      label: 'Título *',       type: 'text',  placeholder: 'Identidad Corporativa — Branding' },
                { key: 'cliente',     label: 'Cliente',        type: 'text',  placeholder: 'Nombre del cliente' },
                { key: 'imagen_url',  label: 'URL de imagen',  type: 'url',   placeholder: 'https://...' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{field.label}</label>
                  <input
                    type={field.type}
                    value={(form as any)[field.key] ?? ''}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#1e293b', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Categoría</label>
                <select value={form.categoria ?? ''} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                  style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#1e293b', background: '#f8fafc', outline: 'none' }}>
                  <option value="">Sin categoría</option>
                  {Object.keys(CATEGORIAS).map(c => <option key={c} value={c}>{CATEGORIAS[c].emoji} {c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Descripción</label>
                <textarea
                  value={form.descripcion ?? ''}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Breve descripción del proyecto..."
                  rows={3}
                  style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#1e293b', background: '#f8fafc', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 20 }}>
                {[
                  { key: 'destacado', label: '⭐ Destacado' },
                  { key: 'visible',   label: '👁 Visible en sitio' },
                ].map(f => (
                  <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.checked }))} />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'space-between' }}>
              {!creando && (
                <button onClick={borrar} disabled={borrando} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '9px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {borrando ? 'Borrando...' : '🗑 Eliminar'}
                </button>
              )}
              <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
                <button onClick={cerrarModal} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={guardar} disabled={guardando || !form.titulo} style={{
                  background: guardando || !form.titulo ? '#93c5fd' : '#00113a',
                  color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px',
                  fontSize: 12, fontWeight: 700, cursor: guardando || !form.titulo ? 'not-allowed' : 'pointer',
                }}>
                  {guardando ? 'Guardando...' : creando ? 'Crear proyecto' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
