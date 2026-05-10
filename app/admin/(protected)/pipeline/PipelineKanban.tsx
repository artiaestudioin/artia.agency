'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, Avatar, Badge, fmtMoney, COLORS, ESTADO_CONFIG, GLOBAL_STYLES } from '@/components/DesignSystem'

type Lead = {
  id: string; folio: string | null; nombre: string; servicio: string | null
  estado: string; estimated_value: number | null; payment_status: string | null
}

const COLS = [
  { id: 'nuevo',      label: 'Nuevo',      color: '#3b82f6', light: '#eff6ff', border: '#bfdbfe' },
  { id: 'contactado', label: 'Contactado', color: '#f59e0b', light: '#fefce8', border: '#fde68a' },
  { id: 'en_proceso', label: 'En proceso', color: '#8b5cf6', light: '#f5f3ff', border: '#ddd6fe' },
  { id: 'cerrado',    label: 'Cerrado',    color: '#10b981', light: '#f0fdf4', border: '#bbf7d0' },
  { id: 'perdido',    label: 'Perdido',    color: '#ef4444', light: '#fef2f2', border: '#fecaca' },
]

export default function PipelineKanban({ leads: init }: { leads: Lead[] }) {
  const [leads, setLeads] = useState(init)
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  const byCol = (id: string) => leads.filter(l => (l.estado ?? 'nuevo') === id)
  const totalCerrado = leads.filter(l => l.estado === 'cerrado').reduce((s, l) => s + (l.estimated_value ?? 0), 0)

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
    } catch {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, estado: lead.estado } : l))
    } finally { setSaving(null) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{GLOBAL_STYLES}</style>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: COLORS.primary, margin: '0 0 4px' }}>Estado de Clientes</h1>
          <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>
            {leads.length} Clientes · {fmtMoney(totalCerrado)} completados
          </p>
        </div>
        <Link href="/admin/leads">
          <button style={{
            background: COLORS.primary, color: '#fff', padding: '9px 18px', borderRadius: 10,
            fontSize: 13, fontWeight: 700, textDecoration: 'none', border: 'none', cursor: 'pointer',
          }}>
            + Registrar nuevo Cliente
          </button>
        </Link>
      </header>

      {/* Kanban Board */}
      <div className="kanban-board-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 8, marginBottom: -8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(210px, 1fr))', gap: 12, paddingBottom: 8, minWidth: 'max-content', width: '100%' }}>
        {COLS.map(col => {
          const colLeads = byCol(col.id)
          const isOver = over === col.id
          return (
            <div
              key={col.id}
              onDragOver={e => { e.preventDefault(); setOver(col.id) }}
              onDragLeave={() => setOver(null)}
              onDrop={e => onDrop(e, col.id)}
              style={{
                background: isOver ? col.border : COLORS.bgHover,
                border: `2px ${isOver ? 'solid' : 'dashed'} ${isOver ? col.color : COLORS.borderLight}`,
                borderRadius: BORDER_RADIUS.lg,
                padding: 12,
                minHeight: 200,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                transition: 'all 0.15s',
              }}
            >
              {/* Column Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                  <span style={{ fontSize: 11, fontWeight: 800, color: col.color, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    {col.label}
                  </span>
                </div>
                <Badge variant={col.id === 'cerrado' ? 'success' : col.id === 'perdido' ? 'danger' : 'default'}>
                  {colLeads.length}
                </Badge>
              </div>

              {/* Cards */}
              {colLeads.map(lead => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={e => onDragStart(e, lead.id)}
                  onDragEnd={() => { setDragging(null); setOver(null) }}
                  className="artia-card"
                  style={{
                    background: COLORS.bgCard,
                    border: `1px solid ${COLORS.borderLight}`,
                    borderRadius: BORDER_RADIUS.md,
                    padding: '10px 12px',
                    cursor: 'grab',
                    opacity: dragging === lead.id ? 0.4 : saving === lead.id ? 0.7 : 1,
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Avatar name={lead.nombre} size="sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lead.nombre}
                      </div>
                      {lead.folio && <div style={{ fontSize: 9, color: COLORS.textMuted, fontFamily: 'monospace' }}>{lead.folio}</div>}
                    </div>
                  </div>

                  {lead.servicio && (
                    <div style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.servicio}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {lead.estimated_value ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.success }}>{fmtMoney(lead.estimated_value)}</span>
                    ) : <span />}
                    {lead.payment_status === 'pagado' ? (
                      <Badge variant="success" size="sm">✓ PAGADO</Badge>
                    ) : col.id === 'cerrado' ? (
                      <Badge variant="warning" size="sm">PENDIENTE</Badge>
                    ) : null}
                  </div>

                  <Link href={`/admin/cliente/${lead.folio ?? lead.id}`} onClick={e => e.stopPropagation()} style={{ display: 'block', marginTop: 8, fontSize: 10, color: COLORS.secondary, textDecoration: 'none', fontWeight: 700 }}>
                    Ver detalle →
                  </Link>
                </div>
              ))}

              {colLeads.length === 0 && (
                <div style={{ textAlign: 'center', padding: '16px 0', color: COLORS.textLight, fontSize: 11 }}>
                  Arrastra aquí
                </div>
              )}
            </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}

const BORDER_RADIUS = { sm: 8, md: 12, lg: 14, xl: 16, '2xl': 20 }