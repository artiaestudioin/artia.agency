'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Message = { 
  role: 'user' | 'assistant'
  content: string
  data?: any[]
  meta?: any
}

const QUICK_QUERIES = [
  'Clientes que no han pagado',
  'Contratos activos',
  'Cuánto hemos facturado en total',
  'Total pagado',
  'Cuotas pendientes',
  'Cuotas vencidas',
  'Leads cerrados este mes',
  'Leads en proceso con mayor valor',
]

// ── Componente de fila clickeable ──
function ClickableRow({ 
  children, 
  navigateTo, 
  onNavigate 
}: { 
  children: React.ReactNode
  navigateTo: string | null
  onNavigate: (path: string) => void 
}) {
  if (!navigateTo) return <>{children}</>
  
  return (
    <tr 
      onClick={() => onNavigate(navigateTo)}
      style={{ 
        borderBottom: '0.5px solid #f1f5f9', 
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {children}
    </tr>
  )
}

// ── Celda con link inteligente ──
function SmartCell({ 
  value, 
  colName, 
  row, 
  onNavigate 
}: { 
  value: any
  colName: string
  row: any
  onNavigate: (path: string) => void
}) {
  const displayVal = value === null || value === undefined ? '—' : String(value)
  
  // Folio → navegar a finanzas
  if (colName === 'folio' && value) {
    return (
      <td style={{ padding: '8px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(`/dashboard/finanzas?folio=${value}`) }}
          style={{
            background: 'none', border: 'none', padding: 0,
            color: '#2552ca', fontWeight: 700, textDecoration: 'none',
            fontFamily: 'monospace', fontSize: 11, cursor: 'pointer',
          }}
        >
          {displayVal} →
        </button>
      </td>
    )
  }
  
  // Nombre con folio → navegar
  if (colName === 'nombre' && row.folio) {
    return (
      <td style={{ padding: '8px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(`/dashboard/finanzas?folio=${row.folio}`) }}
          style={{
            background: 'none', border: 'none', padding: 0,
            color: '#0f172a', fontWeight: 600, textDecoration: 'none',
            cursor: 'pointer', textAlign: 'left',
          }}
        >
          {displayVal}
        </button>
      </td>
    )
  }
  
  // Lead nombre (de relación) → navegar
  if ((colName === 'nombre' || colName === 'lead' || colName === '_displayName') && row._folio) {
    return (
      <td style={{ padding: '8px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(`/dashboard/finanzas?folio=${row._folio}`) }}
          style={{
            background: 'none', border: 'none', padding: 0,
            color: '#0f172a', fontWeight: 700, cursor: 'pointer', textAlign: 'left',
          }}
        >
          {displayVal}
        </button>
      </td>
    )
  }
  
  // Contract value / amount → formatear moneda
  if ((colName === 'contract_value' || colName === 'amount' || colName === '_pagado' || colName === '_pendiente') && value !== null) {
    const num = Number(value)
    return (
      <td style={{ padding: '8px 12px', color: '#00113a', fontWeight: 700, whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11 }}>
        {new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(num)}
      </td>
    )
  }
  
  // Progress bar
  if (colName === '_progress' && value !== null) {
    return (
      <td style={{ padding: '8px 12px', minWidth: 80 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${Math.min(value, 100)}%`,
              background: value >= 100 ? '#10b981' : '#667eea',
              borderRadius: 2, transition: 'width 0.3s',
            }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>{value}%</span>
        </div>
      </td>
    )
  }
  
  // Status badge
  if (colName === 'status' || colName === 'payment_status' || colName === 'estado') {
    const colors: Record<string, { bg: string; text: string; dot: string }> = {
      pagado: { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
      pendiente: { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b' },
      vencido: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
      activo: { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
      completado: { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
      cerrado: { bg: '#dcfce7', text: '#166534', dot: '#22c55e' },
      en_proceso: { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6' },
      nuevo: { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' },
      perdido: { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444' },
    }
    const c = colors[String(value)] ?? { bg: '#f3f4f6', text: '#374151', dot: '#9ca3af' }
    return (
      <td style={{ padding: '8px 12px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 50, fontSize: 10, fontWeight: 700,
          background: c.bg, color: c.text, whiteSpace: 'nowrap',
        }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: c.dot }} />
          {String(value)}
        </span>
      </td>
    )
  }
  
  // Fecha
  if ((colName === 'created_at' || colName === 'payment_date') && value) {
    const d = new Date(value)
    return (
      <td style={{ padding: '8px 12px', color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>
        {d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: '2-digit' })}
      </td>
    )
  }
  
  // Default
  return (
    <td style={{ padding: '8px 12px', color: '#475569', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
      {displayVal}
    </td>
  )
}

// ── Tarjeta de resumen actionable ──
function ActionCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color, 
  onClick 
}: { 
  title: string
  value: string
  subtitle?: string
  icon: string
  color: string
  onClick?: () => void
}) {
  return (
    <div 
      onClick={onClick}
      style={{
        background: 'white', borderRadius: 14, padding: '16px 20px',
        border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        display: 'flex', alignItems: 'center', gap: 14,
      }}
      onMouseEnter={e => { if (onClick) { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)' } }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)' }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${color}15`, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: '1.4rem', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: '1.2rem', fontWeight: 900, color, letterSpacing: '-0.5px' }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>{subtitle}</div>
        )}
      </div>
    </div>
  )
}

export default function IACRMPanel() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de CRM. Puedo consultar tu base de datos en lenguaje natural.\n\n**Pregúntame sobre:**\n• 💰 Facturación total y pagos recibidos\n• ⏳ Cuotas pendientes o vencidas\n• 📋 Contratos activos y su progreso\n• 👥 Clientes con saldos pendientes\n\nPrueba con: *"clientes que no han pagado"* o *"cuánto hemos facturado"*',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleNavigate = useCallback((path: string) => {
    router.push(path)
  }, [router])

  async function sendQuery(query: string) {
    if (!query.trim() || loading) return
    const userMsg: Message = { role: 'user', content: query }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/ia-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer ?? 'No pude procesar esa consulta.',
        data: data.rows,
        meta: data.meta,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error de conexión. Intenta de nuevo.',
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendQuery(input)
    }
  }

  // Extraer columnas visibles (ignorar metadatos internos)
  const getVisibleColumns = (row: any): string[] => {
    if (!row) return []
    return Object.keys(row).filter(k => 
      !k.startsWith('_') && 
      !['installments', 'lead', 'parent'].includes(k)
    )
  }

  // Renderizar tarjetas de resumen si hay meta
  const renderSummaryCards = (meta: any, data: any[]) => {
    if (!meta) return null
    
    const cards = []
    
    if (meta.entity === 'payment_parents' && meta.total !== undefined) {
      cards.push(
        { title: 'Total Facturado', value: new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(meta.total), icon: '💵', color: '#5b21b6' }
      )
    }
    
    if (meta.entity === 'payment_installments' && meta.total !== undefined) {
      const isPending = data?.[0]?.status === 'pendiente'
      const isVencido = data?.[0]?.status === 'vencido'
      cards.push({
        title: isVencido ? 'Total Vencido' : isPending ? 'Total Pendiente' : 'Total Pagado',
        value: new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(meta.total),
        icon: isVencido ? '⚠️' : isPending ? '⏳' : '✅',
        color: isVencido ? '#dc2626' : isPending ? '#d97706' : '#059669',
      })
    }
    
    if (meta.entity === 'unpaid_clients') {
      const totalPendiente = data?.reduce((s, r) => s + (r._pendiente || 0), 0) ?? 0
      cards.push(
        { title: 'Clientes con Deuda', value: String(data?.length ?? 0), subtitle: `Pendiente: ${new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(totalPendiente)}`, icon: '👥', color: '#dc2626' }
      )
    }
    
    if (cards.length === 0) return null
    
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
        {cards.map((card, i) => (
          <ActionCard key={i} {...card} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, marginTop: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#00113a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.6rem' }}>🤖</span>
          IA — Consulta tu CRM
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: '6px 0 0', lineHeight: 1.5 }}>
          Escribe en lenguaje natural. La IA consulta tu base de datos real y devuelve insights accionables.
          <span style={{ color: '#2552ca', fontWeight: 700 }}> Haz clic en cualquier resultado para navegar.</span>
        </p>
      </div>

      {/* Quick queries */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {QUICK_QUERIES.map(q => (
          <button key={q} onClick={() => sendQuery(q)} disabled={loading} style={{
            padding: '8px 16px', borderRadius: 50, fontSize: 12, fontWeight: 600,
            background: '#f1f5f9', color: '#475569', border: '1.5px solid #e2e8f0',
            cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
            transition: 'all 0.15s',
          }}
            onMouseOver={e => { if (!loading) { (e.currentTarget as HTMLElement).style.background = '#00113a'; (e.currentTarget as HTMLElement).style.color = '#fff'; (e.currentTarget as HTMLElement).style.borderColor = '#00113a' } }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLElement).style.color = '#475569'; (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0' }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div style={{
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', height: 'calc(100vh - 320px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 10, width: '100%' }}>
              
              {/* Burbuja de mensaje */}
              <div style={{
                maxWidth: '85%', padding: '14px 18px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                background: m.role === 'user' ? '#00113a' : '#f8fafc',
                color: m.role === 'user' ? '#fff' : '#0f172a',
                border: m.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                fontSize: 13.5, lineHeight: 1.65, whiteSpace: 'pre-wrap',
                boxShadow: m.role === 'user' ? '0 4px 16px rgba(0,17,58,0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                {m.content}
              </div>

              {/* Tarjetas de resumen */}
              {m.meta && m.data && renderSummaryCards(m.meta, m.data)}

              {/* Tabla de datos */}
              {m.data && m.data.length > 0 && (
                <div style={{ 
                  maxWidth: '100%', overflowX: 'auto', 
                  background: '#fff', border: '1px solid #e2e8f0', 
                  borderRadius: 14, width: '100%',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {getVisibleColumns(m.data[0]).map(col => (
                          <th key={col} style={{ 
                            padding: '10px 12px', textAlign: 'left', 
                            fontSize: 10, fontWeight: 800, 
                            letterSpacing: '0.8px', textTransform: 'uppercase', 
                            color: '#94a3b8', borderBottom: '1px solid #e2e8f0', 
                            whiteSpace: 'nowrap',
                          }}>
                            {col.replace(/_/g, ' ')}
                          </th>
                        ))}
                        <th style={{ 
                          padding: '10px 12px', textAlign: 'left',
                          fontSize: 10, fontWeight: 800,
                          letterSpacing: '0.8px', textTransform: 'uppercase',
                          color: '#94a3b8', borderBottom: '1px solid #e2e8f0',
                          whiteSpace: 'nowrap', width: 40,
                        }}>
                          →
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.data.slice(0, 25).map((row, ri) => (
                        <ClickableRow key={ri} navigateTo={row._navigateTo} onNavigate={handleNavigate}>
                          {getVisibleColumns(row).map((col, vi) => (
                            <SmartCell 
                              key={vi} 
                              value={row[col]} 
                              colName={col} 
                              row={row} 
                              onNavigate={handleNavigate}
                            />
                          ))}
                          <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                            {row._navigateTo && (
                              <span style={{ color: '#cbd5e1', fontSize: 14 }}>→</span>
                            )}
                          </td>
                        </ClickableRow>
                      ))}
                    </tbody>
                  </table>
                  {m.data.length > 25 && (
                    <div style={{ 
                      padding: '10px 16px', fontSize: 11, color: '#94a3b8',
                      borderTop: '1px solid #f1f5f9', textAlign: 'center',
                    }}>
                      Mostrando 25 de {m.data.length} resultados
                    </div>
                  )}
                </div>
              )}

              {/* Acciones rápidas si hay datos navegables */}
              {m.data && m.data.length > 0 && m.data.some((r: any) => r._navigateTo) && (
                <div style={{ 
                  display: 'flex', gap: 8, flexWrap: 'wrap',
                  padding: '8px 0',
                }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, alignSelf: 'center' }}>
                    Acciones rápidas:
                  </span>
                  {Array.from(new Set(m.data.filter((r: any) => r._navigateTo).map((r: any) => r._folio))).slice(0, 5).map((folio: any) => (
                    <button
                      key={folio}
                      onClick={() => handleNavigate(`/dashboard/finanzas?folio=${folio}`)}
                      style={{
                        padding: '4px 12px', borderRadius: 50, fontSize: 11,
                        background: '#eff6ff', color: '#2552ca', border: '1px solid #bfdbfe',
                        cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap',
                      }}
                    >
                      Ver {folio} →
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ 
                padding: '14px 18px', background: '#f8fafc', 
                border: '1px solid #e2e8f0', borderRadius: '4px 16px 16px 16px', 
                fontSize: 13, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ 
                  width: 16, height: 16, border: '2px solid #e2e8f0', 
                  borderTopColor: '#667eea', borderRadius: '50%',
                  display: 'inline-block',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Consultando base de datos…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ 
          borderTop: '1px solid #e2e8f0', padding: '16px 20px', 
          display: 'flex', gap: 12, alignItems: 'flex-end',
          background: '#fafbfc',
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu consulta… Ej: 'clientes sin pagar' o 'total facturado'"
            rows={1}
            disabled={loading}
            style={{
              flex: 1, padding: '12px 16px', border: '1.5px solid #e2e8f0', borderRadius: 12,
              fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
              background: loading ? '#f8fafc' : '#fff',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
            }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
          />
          <button 
            onClick={() => sendQuery(input)} 
            disabled={loading || !input.trim()} 
            style={{
              background: loading || !input.trim() ? '#f1f5f9' : '#00113a',
              color: loading || !input.trim() ? '#94a3b8' : '#fff',
              border: 'none', borderRadius: 12, padding: '12px 24px', 
              fontSize: 13, fontWeight: 800,
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', 
              flexShrink: 0,
              transition: 'all 0.15s',
              boxShadow: loading || !input.trim() ? 'none' : '0 4px 16px rgba(0,17,58,0.25)',
            }}
          >
            {loading ? '⏳' : 'Enviar →'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { 
          to { transform: rotate(360deg) } 
        }
      `}</style>
    </div>
  )
}