'use client'

import { useState } from 'react'
import Link from 'next/link'

type Lead = {
  id: string; folio: string | null; nombre: string; servicio: string | null
  estado: string; estimated_value: number | null; payment_status: string | null
}

const COLS = [
  { id: 'nuevo',      label: 'Nuevo',      color: '#3b82f6', light: '#eff6ff', border: '#bfdbfe', icon: '🆕' },
  { id: 'contactado', label: 'Contactado', color: '#f59e0b', light: '#fefce8', border: '#fde68a', icon: '📞' },
  { id: 'en_proceso', label: 'En proceso', color: '#8b5cf6', light: '#f5f3ff', border: '#ddd6fe', icon: '⚙️' },
  { id: 'cerrado',    label: 'Cerrado',    color: '#10b981', light: '#f0fdf4', border: '#bbf7d0', icon: '✅' },
  { id: 'perdido',    label: 'Perdido',    color: '#ef4444', light: '#fef2f2', border: '#fecaca', icon: '❌' },
]

function fmtMoney(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function avatarBg(name: string) {
  const p = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f97316', '#14b8a6']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % p.length
  return p[h]
}

export default function PipelineKanban({ leads: init }: { leads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(init)
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  const byCol = (id: string) => leads.filter(l => (l.estado ?? 'nuevo') === id)
  const totalCerrado = leads
    .filter(l => l.estado === 'cerrado')
    .reduce((s, l) => s + (l.estimated_value ?? 0), 0)

  function onDragStart(e: React.DragEvent, id: string) {
    setDragging(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  async function onDrop(e: React.DragEvent, colId: string) {
    e.preventDefault()
    const id = dragging
    setDragging(null)
    setOver(null)
    if (!id) return

    const lead = leads.find(l => l.id === id)
    if (!lead || lead.estado === colId) return

    setLeads(prev => prev.map(l => l.id === id ? { ...l, estado: colId } : l))
    setSaving(id)

    try {
      const res = await fetch('/api/admin/lead-estado', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, estado: colId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Error al actualizar estado')
    } catch (err) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, estado: lead.estado } : l))
      console.error(err)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '100%' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 24,
          padding: '0 4px',
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>
            Estado de Clientes
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            {leads.length} Clientes · {fmtMoney(totalCerrado)} completados
          </p>
        </div>
        <Link href="/admin/leads">
          <button
            style={{
              background: '#0f172a',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            + Registrar nuevo Cliente
          </button>
        </Link>
      </header>

      <div
        className="kanban-scroll"
        style={{
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          margin: '0 -8px',
          padding: '4px 8px 16px',
        }}
      >
        <div
          className="kanban-columns"
          style={{
            display: 'flex',
            gap: 14,
            minWidth: 'max-content',
          }}
        >
          {COLS.map(col => {
            const colLeads = byCol(col.id)
            const isOver = over === col.id

            return (
              <div
                key={col.id}
                onDragOver={e => {
                  e.preventDefault()
                  setOver(col.id)
                }}
                onDragLeave={() => setOver(null)}
                onDrop={e => onDrop(e, col.id)}
                style={{
                  background: isOver ? col.light : '#f8fafc',
                  border: `2px ${isOver ? 'solid' : 'dashed'} ${isOver ? col.color : '#e2e8f0'}`,
                  borderRadius: 16,
                  padding: 12,
                  minHeight: 240,
                  width: 290,
                  minWidth: 270,
                  maxWidth: 340,
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 4,
                    padding: '2px 4px 10px',
                    borderBottom: `1.5px solid ${isOver ? col.border : '#f1f5f9'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>{col.icon}</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: col.color,
                        letterSpacing: '0.8px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {col.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: '#64748b',
                      background: '#fff',
                      padding: '3px 9px',
                      borderRadius: 10,
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {colLeads.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  {colLeads.map(lead => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={e => onDragStart(e, lead.id)}
                      onDragEnd={() => {
                        setDragging(null)
                        setOver(null)
                      }}
                      style={{
                        background: '#fff',
                        border: `1.5px solid ${dragging === lead.id ? col.color : '#e2e8f0'}`,
                        borderRadius: 12,
                        padding: '12px 14px',
                        cursor: 'grab',
                        opacity: dragging === lead.id ? 0.45 : saving === lead.id ? 0.65 : 1,
                        userSelect: 'none',
                        boxShadow:
                          dragging === lead.id
                            ? '0 8px 24px rgba(0,0,0,0.12)'
                            : '0 1px 2px rgba(0,0,0,0.05)',
                        transition: 'box-shadow 0.2s, border-color 0.2s, opacity 0.2s, transform 0.15s',
                        transform: dragging === lead.id ? 'scale(1.02)' : 'scale(1)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: avatarBg(lead.nombre),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 800,
                            color: '#fff',
                            flexShrink: 0,
                          }}
                        >
                          {initials(lead.nombre)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: '#0f172a',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {lead.nombre}
                          </div>
                          {lead.folio && (
                            <div
                              style={{
                                fontSize: 10,
                                color: '#94a3b8',
                                fontFamily: 'monospace',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {lead.folio}
                            </div>
                          )}
                        </div>
                      </div>

                      {lead.servicio && (
                        <div
                          style={{
                            fontSize: 12,
                            color: '#475569',
                            marginBottom: 10,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            paddingLeft: 44,
                          }}
                        >
                          {lead.servicio}
                        </div>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingLeft: 44,
                        }}
                      >
                        {lead.estimated_value ? (
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>
                            {fmtMoney(lead.estimated_value)}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                        )}

                        {lead.payment_status === 'pagado' ? (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: '#059669',
                              background: '#f0fdf4',
                              padding: '3px 8px',
                              borderRadius: 6,
                              border: '1px solid #bbf7d0',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ✓ PAGADO
                          </span>
                        ) : col.id === 'cerrado' ? (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: '#b45309',
                              background: '#fefce8',
                              padding: '3px 8px',
                              borderRadius: 6,
                              border: '1px solid #fde68a',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            PENDIENTE
                          </span>
                        ) : null}
                      </div>

                      <Link
                        href={`/admin/cliente/${lead.folio ?? lead.id}`}
                        onClick={e => e.stopPropagation()}
                        style={{
                          display: 'block',
                          marginTop: 10,
                          marginLeft: 44,
                          fontSize: 11,
                          color: '#2563eb',
                          textDecoration: 'none',
                          fontWeight: 700,
                        }}
                      >
                        Ver detalle →
                      </Link>
                    </div>
                  ))}

                  {colLeads.length === 0 && (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '24px 12px',
                        color: '#94a3b8',
                        fontSize: 12,
                        fontWeight: 500,
                        border: '1.5px dashed #e2e8f0',
                        borderRadius: 10,
                        marginTop: 2,
                      }}
                    >
                      Arrastra aquí
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .kanban-columns {
            flex-direction: column !important;
            min-width: 100% !important;
            width: 100% !important;
            gap: 20px !important;
          }
          .kanban-columns > div {
            width: 100% !important;
            min-width: auto !important;
            max-width: 100% !important;
          }
          .kanban-scroll {
            overflow-x: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}