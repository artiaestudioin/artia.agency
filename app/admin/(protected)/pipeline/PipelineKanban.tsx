'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

// ── Tipos ─────────────────────────────────────────────────────
type Lead = {
  id: string
  folio: string | null
  nombre: string
  email: string | null
  servicio: string | null
  estado: string
  estimated_value: number | null
  payment_status: string | null
  created_at: string
}

type Column = {
  id: string
  label: string
  color: string
  bg: string
  accent: string
}

// ── Configuración de columnas ─────────────────────────────────
const COLUMNS: Column[] = [
  { id: 'nuevo',      label: 'Nuevo',      color: '#3b82f6', bg: '#eff6ff', accent: '#dbeafe' },
  { id: 'contactado', label: 'Contactado', color: '#f59e0b', bg: '#fefce8', accent: '#fef08a' },
  { id: 'en_proceso', label: 'En proceso', color: '#8b5cf6', bg: '#f5f3ff', accent: '#ede9fe' },
  { id: 'cerrado',    label: 'Cerrado ✓',  color: '#10b981', bg: '#f0fdf4', accent: '#bbf7d0' },
  { id: 'perdido',    label: 'Perdido',    color: '#ef4444', bg: '#fef2f2', accent: '#fecaca' },
]

// ── Helpers ───────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function avatarBg(name: string) {
  const p = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % p.length
  return p[h]
}

function fmtMoney(n: number | null) {
  if (!n) return null
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

// ── Componente Kanban ─────────────────────────────────────────
export default function PipelineKanban({ leads: initialLeads }: { leads: Lead[] }) {
  const [leads, setLeads]         = useState<Lead[]>(initialLeads)
  const [dragging, setDragging]   = useState<string | null>(null)
  const [dragOver, setDragOver]   = useState<string | null>(null)
  const [updating, setUpdating]   = useState<string | null>(null)

  // Organizar por columna
  const byColumn = useCallback((colId: string) =>
    leads.filter(l => (l.estado ?? 'nuevo') === colId)
  , [leads])

  // Drag handlers
  function onDragStart(e: React.DragEvent, leadId: string) {
    setDragging(leadId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(colId)
  }

  async function onDrop(e: React.DragEvent, colId: string) {
    e.preventDefault()
    const leadId = dragging
    setDragging(null)
    setDragOver(null)

    if (!leadId) return
    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.estado === colId) return

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, estado: colId } : l))
    setUpdating(leadId)

    try {
      const res = await fetch('/api/admin/lead-estado', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, estado: colId }),
      })
      if (!res.ok) throw new Error()

      // Si pasa a Cerrado → disparar creación de proyecto si no existe
      if (colId === 'cerrado') {
        await fetch('/api/admin/pipeline-cerrado', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId }),
        })
      }
    } catch {
      // Revert on error
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, estado: lead.estado } : l))
    } finally {
      setUpdating(null)
    }
  }

  function onDragEnd() {
    setDragging(null)
    setDragOver(null)
  }

  const totalValue = leads
    .filter(l => l.estado === 'cerrado')
    .reduce((s, l) => s + (l.estimated_value ?? 0), 0)

  return (
    <div style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#00113a', margin: 0 }}>Pipeline Kanban</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            {leads.length} leads · {fmtMoney(totalValue) ?? '$0'} valor cerrado
          </p>
        </div>
        <Link href="/admin/leads" style={{ background: '#00113a', color: '#fff', padding: '9px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
          + Nuevo lead
        </Link>
      </div>

      {/* Board */}
      <div style={{ display: 'flex', gap: 14, flex: 1, overflow: 'auto', paddingBottom: 16 }}>
        {COLUMNS.map(col => {
          const colLeads = byColumn(col.id)
          const isOver   = dragOver === col.id
          const colValue = colLeads.reduce((s, l) => s + (l.estimated_value ?? 0), 0)

          return (
            <div
              key={col.id}
              onDragOver={e => onDragOver(e, col.id)}
              onDrop={e => onDrop(e, col.id)}
              style={{
                minWidth: 240, flex: 1, display: 'flex', flexDirection: 'column',
                background: isOver ? col.accent : col.bg,
                border: `1.5px ${isOver ? 'solid' : 'dashed'} ${isOver ? col.color : col.accent}`,
                borderRadius: 14, padding: '14px 12px',
                transition: 'all 0.15s',
              }}
            >
              {/* Columna header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: col.color, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    {col.label}
                  </span>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, background: col.color, color: '#fff', borderRadius: 20, padding: '2px 8px' }}>
                  {colLeads.length}
                </span>
              </div>

              {colValue > 0 && (
                <div style={{ fontSize: 11, color: col.color, fontWeight: 700, marginBottom: 10, opacity: 0.8 }}>
                  {fmtMoney(colValue)}
                </div>
              )}

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto' }}>
                {colLeads.map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={e => onDragStart(e, lead.id)}
                    onDragEnd={onDragEnd}
                    style={{
                      background: '#fff',
                      border: '0.5px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '12px 14px',
                      cursor: 'grab',
                      opacity: dragging === lead.id ? 0.4 : updating === lead.id ? 0.7 : 1,
                      transition: 'all 0.15s',
                      boxShadow: dragging === lead.id ? '0 8px 24px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: avatarBg(lead.nombre), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {initials(lead.nombre)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {lead.nombre}
                        </div>
                        {lead.folio && (
                          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>{lead.folio}</div>
                        )}
                      </div>
                    </div>

                    {lead.servicio && (
                      <div style={{ fontSize: 11, color: '#475569', marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {lead.servicio}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {lead.estimated_value ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>{fmtMoney(lead.estimated_value)}</span>
                      ) : <span />}
                      {lead.payment_status === 'pagado' ? (
                        <span style={{ fontSize: 9, fontWeight: 700, background: '#f0fdf4', color: '#10b981', padding: '2px 6px', borderRadius: 10 }}>PAGADO</span>
                      ) : lead.payment_status === 'pendiente' && col.id === 'cerrado' ? (
                        <span style={{ fontSize: 9, fontWeight: 700, background: '#fef9ec', color: '#d97706', padding: '2px 6px', borderRadius: 10 }}>PENDIENTE</span>
                      ) : null}
                    </div>

                    <Link href={`/admin/cliente/${lead.folio ?? lead.id}`}
                      style={{ display: 'block', marginTop: 8, fontSize: 10, color: '#2552ca', textDecoration: 'none', fontWeight: 700 }}
                      onClick={e => e.stopPropagation()}
                    >
                      Ver detalle →
                    </Link>
                  </div>
                ))}

                {colLeads.length === 0 && !isOver && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#cbd5e1', fontSize: 12 }}>
                    Arrastra leads aquí
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
