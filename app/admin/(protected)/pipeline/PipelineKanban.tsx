'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

type Lead = {
  id: string; folio: string | null; nombre: string; servicio: string | null
  estado: string; estimated_value: number | null; payment_status: string | null
}

const COLS = [
  { id: 'nuevo',      label: 'Nuevo',      emoji: '🔵', color: '#3b82f6', light: '#eff6ff', border: '#bfdbfe' },
  { id: 'contactado', label: 'Contactado', emoji: '🟡', color: '#f59e0b', light: '#fefce8', border: '#fde68a' },
  { id: 'en_proceso', label: 'En proceso', emoji: '🟣', color: '#8b5cf6', light: '#f5f3ff', border: '#ddd6fe' },
  { id: 'cerrado',    label: 'Cerrado',    emoji: '🟢', color: '#10b981', light: '#f0fdf4', border: '#bbf7d0' },
  { id: 'perdido',    label: 'Perdido',    emoji: '🔴', color: '#ef4444', light: '#fef2f2', border: '#fecaca' },
]

function initials(n: string) {
  return n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function avatarColor(n: string) {
  const p = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444']
  let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % p.length
  return p[h]
}
function fmtMoney(n: number | null) {
  if (!n) return null
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function PipelineKanban({ leads: init }: { leads: Lead[] }) {
  const [leads, setLeads]       = useState(init)
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver]         = useState<string | null>(null)
  const [saving, setSaving]     = useState<string | null>(null)

  const byCol = (id: string) => leads.filter(l => (l.estado ?? 'nuevo') === id)

  function onDragStart(e: React.DragEvent, id: string) {
    setDragging(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  async function onDrop(e: React.DragEvent, colId: string) {
    e.preventDefault()
    const id = dragging; setDragging(null); setOver(null)
    if (!id) return
    const lead = leads.find(l => l.id === id)
    if (!lead || lead.estado === colId) return

    setLeads(prev => prev.map(l => l.id === id ? { ...l, estado: colId } : l))
    setSaving(id)
    try {
      await fetch('/api/admin/lead-estado', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: colId }),
      })
      // NO auto-crear proyecto al cerrar — solo actualiza estado
    } catch {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, estado: lead.estado } : l))
    } finally { setSaving(null) }
  }

  const totalCerrado = leads.filter(l => l.estado === 'cerrado').reduce((s, l) => s + (l.estimated_value ?? 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`
        .kcard { transition: box-shadow 0.15s, opacity 0.15s; }
        .kcard:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.10) !important; }
        .kcol-drop { transition: background 0.15s, border-color 0.15s; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#00113a', margin: 0 }}>Pipeline</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>
            {leads.length} leads · {fmtMoney(totalCerrado) ?? '$0'} cerrado
          </p>
        </div>
        <Link href="/admin/leads" style={{ background: '#00113a', color: '#fff', padding: '9px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
          + Nuevo lead
        </Link>
      </div>

      {/* Board — scroll horizontal solo si no cabe */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(200px, 1fr))', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {COLS.map(col => {
          const colLeads = byCol(col.id)
          const isOver   = over === col.id
          return (
            <div key={col.id}
              className="kcol-drop"
              onDragOver={e => { e.preventDefault(); setOver(col.id) }}
              onDragLeave={() => setOver(null)}
              onDrop={e => onDrop(e, col.id)}
              style={{
                background: isOver ? col.border : '#f8fafc',
                border: `2px ${isOver ? 'solid' : 'dashed'} ${isOver ? col.color : '#e2e8f0'}`,
                borderRadius: 12,
                padding: 12,
                minHeight: 200,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {/* Col header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: col.color, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    {col.label}
                  </span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, background: col.color, color: '#fff', borderRadius: 20, padding: '1px 8px', minWidth: 20, textAlign: 'center' }}>
                  {colLeads.length}
                </span>
              </div>

              {/* Cards */}
              {colLeads.map(lead => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={e => onDragStart(e, lead.id)}
                  onDragEnd={() => { setDragging(null); setOver(null) }}
                  className="kcard"
                  style={{
                    background: '#fff',
                    border: '0.5px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '10px 12px',
                    cursor: 'grab',
                    opacity: dragging === lead.id ? 0.4 : saving === lead.id ? 0.7 : 1,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: avatarColor(lead.nombre), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {initials(lead.nombre)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lead.nombre}
                      </div>
                      {lead.folio && (
                        <div style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'monospace' }}>{lead.folio}</div>
                      )}
                    </div>
                  </div>

                  {lead.servicio && (
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.servicio}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {lead.estimated_value ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>{fmtMoney(lead.estimated_value)}</span>
                    ) : <span />}
                    {lead.payment_status === 'pagado' ? (
                      <span style={{ fontSize: 9, fontWeight: 700, background: '#f0fdf4', color: '#10b981', padding: '2px 6px', borderRadius: 10 }}>✓ PAGADO</span>
                    ) : col.id === 'cerrado' ? (
                      <span style={{ fontSize: 9, fontWeight: 700, background: '#fef9ec', color: '#d97706', padding: '2px 6px', borderRadius: 10 }}>PENDIENTE</span>
                    ) : null}
                  </div>

                  <Link href={`/admin/cliente/${lead.folio ?? lead.id}`}
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'block', marginTop: 8, fontSize: 10, color: '#2552ca', textDecoration: 'none', fontWeight: 700 }}>
                    Ver detalle →
                  </Link>
                </div>
              ))}

              {colLeads.length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#cbd5e1', fontSize: 11 }}>
                  Arrastra aquí
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}