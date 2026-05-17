'use client'
// app/admin/catalogo/pedidos/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ShoppingCart, RefreshCw, Search, Eye, CheckCircle,
  XCircle, ChevronDown, ExternalLink, MessageCircle
} from 'lucide-react'
import { SHADOWS, fmtMoney, fmtDate, EmptyState } from '@/components/DesignSystem'

interface Order {
  id: string
  order_number: string
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  items: Array<{
    product_id: string
    variant_id: string | null
    name: string
    variant_name: string | null
    qty: number
    unit_price: number
    subtotal: number
  }>
  subtotal: number
  shipping_total: number
  total: number
  status: string
  source: string
  notes: string | null
  whatsapp_sent: boolean
  lead_id: string | null
  created_at: string
  updated_at: string
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  pending:       { label: 'Pendiente',     bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  confirmed:     { label: 'Confirmado',    bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
  in_production: { label: 'En producción', bg: '#f3e8ff', color: '#6b21a8', dot: '#9333ea' },
  ready:         { label: 'Listo',         bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  delivered:     { label: 'Entregado',     bg: '#d1fae5', color: '#064e3b', dot: '#10b981' },
  cancelled:     { label: 'Cancelado',     bg: '#fef2f2', color: '#991b1b', dot: '#ef4444' },
}

const ALL_STATUSES = Object.keys(STATUS_CFG)

const inp: React.CSSProperties = {
  padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9,
  fontSize: 13, outline: 'none', background: '#fafafa',
  fontFamily: 'Inter, sans-serif', transition: 'border-color .2s',
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || STATUS_CFG.pending
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: c.bg, color: c.color, fontSize: 11, fontWeight: 800,
      padding: '3px 9px', borderRadius: 6, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot }} />
      {c.label}
    </span>
  )
}

export default function PedidosPage() {
  const supabase = createClient()

  const [orders,      setOrders]      = useState<Order[]>([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filterStatus,setFilterStatus]= useState('all')
  const [expandedId,  setExpandedId]  = useState<string | null>(null)
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null)
  const [page,        setPage]        = useState(1)
  const PER = 20

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('catalog_orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setOrders(data || [])
    else showToast('Error cargando pedidos', false)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from('catalog_orders')
      .update({ status })
      .eq('id', id)

    if (!error) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
      showToast(`Estado actualizado: ${STATUS_CFG[status]?.label}`)
    } else {
      showToast('Error al actualizar', false)
    }
  }

  async function cancelOrder(id: string) {
    if (!confirm('¿Cancelar este pedido?')) return
    await updateStatus(id, 'cancelled')
  }

  // Filtered + paginated
  const filtered = orders.filter(o => {
    const ms = !search ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_phone || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_email || '').toLowerCase().includes(search.toLowerCase())
    const mst = filterStatus === 'all' || o.status === filterStatus
    return ms && mst
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER))
  const paginated  = filtered.slice((page - 1) * PER, page * PER)

  // Stats
  const stats = {
    total:      orders.length,
    pending:    orders.filter(o => o.status === 'pending').length,
    production: orders.filter(o => o.status === 'in_production').length,
    delivered:  orders.filter(o => o.status === 'delivered').length,
    revenue:    orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0),
  }

  function buildWALink(order: Order) {
    const items = (order.items || []).map(i =>
      `• ${i.name}${i.variant_name ? ` — ${i.variant_name}` : ''}: *${i.qty} uds · $${i.unit_price.toFixed(2)}*`
    ).join('\n')
    const msg =
      `*Actualización de pedido — ARTIA STUDIO*\n` +
      `📋 Pedido: *${order.order_number}*\n\n` +
      `*Productos:*\n${items}\n\n` +
      `*Total: $${order.total.toFixed(2)} USD*\n\n` +
      `Estado actual: *${STATUS_CFG[order.status]?.label || order.status}*`
    const phone = (order.customer_phone || '').replace(/\D/g, '')
    const num   = phone.startsWith('593') ? phone : phone.startsWith('0') ? '593' + phone.slice(1) : '593' + phone
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', padding: 24, fontFamily: 'Inter, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 2000,
          background: toast.ok ? '#00113a' : '#ef4444', color: '#fff',
          padding: '12px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {toast.ok ? <CheckCircle size={15} /> : <XCircle size={15} />} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShoppingCart size={24} color="#2552ca" /> Pedidos del Catálogo
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
            {stats.pending > 0 && <span style={{ color: '#f59e0b', fontWeight: 700 }}>⚠️ {stats.pending} pendientes · </span>}
            {stats.total} pedidos en total
          </p>
        </div>
        <button onClick={load} style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px',
          border: '1px solid #e2e8f0', borderRadius: 9, background: '#fff',
          cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748b',
        }}>
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 22 }}>
        {[
          { label: 'Total pedidos',  value: stats.total,           color: '#2552ca', bg: '#dbeafe' },
          { label: 'Pendientes',     value: stats.pending,         color: '#d97706', bg: '#fef3c7' },
          { label: 'En producción',  value: stats.production,      color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Entregados',     value: stats.delivered,       color: '#16a34a', bg: '#dcfce7' },
          { label: 'Ingresos',       value: fmtMoney(stats.revenue), color: '#0f172a', bg: '#f1f5f9', isText: true },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 13, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: SHADOWS.sm }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: s.isText ? 13 : 21, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por N° pedido, cliente, teléfono..."
            style={{ ...inp, paddingLeft: 32, width: '100%' }} />
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          style={{ ...inp, width: 'auto', minWidth: 150 }}>
          <option value="all">Todos los estados</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_CFG[s].label}</option>
          ))}
        </select>
      </div>

      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
        {filtered.length} pedido{filtered.length !== 1 ? 's' : ''}
        {filterStatus !== 'all' ? ` · ${STATUS_CFG[filterStatus]?.label}` : ''}
      </p>

      {/* Orders list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
          <RefreshCw size={26} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: 10 }}>Cargando pedidos...</p>
        </div>
      ) : paginated.length === 0 ? (
        <EmptyState icon="🛒" title="Sin pedidos" subtitle="Los pedidos del catálogo aparecerán aquí automáticamente" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {paginated.map(order => {
            const isExpanded = expandedId === order.id
            const items = order.items || []

            return (
              <div key={order.id} style={{
                background: '#fff', border: `1px solid ${order.status === 'pending' ? '#fde68a' : '#e2e8f0'}`,
                borderRadius: 14, overflow: 'hidden', boxShadow: SHADOWS.sm,
              }}>
                {/* Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr auto auto auto auto',
                  gap: 12, alignItems: 'center', padding: '14px 18px',
                  cursor: 'pointer',
                }}
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}>

                  {/* Order number */}
                  <div>
                    <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, fontWeight: 800, color: '#2552ca' }}>
                      {order.order_number}
                    </span>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{fmtDate(order.created_at)}</div>
                  </div>

                  {/* Customer */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                      {order.customer_name || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin nombre</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {order.customer_phone || order.customer_email || '—'}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                      {items.length} ítem{items.length !== 1 ? 's' : ''}
                      {items.length > 0 && ` · ${items[0].name}${items.length > 1 ? ` +${items.length - 1}` : ''}`}
                    </div>
                  </div>

                  {/* Total */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>
                      {fmtMoney(order.total)}
                    </div>
                  </div>

                  {/* Status selector */}
                  <div onClick={e => e.stopPropagation()}>
                    <select
                      value={order.status}
                      onChange={e => updateStatus(order.id, e.target.value)}
                      style={{
                        fontSize: 11, fontWeight: 700, padding: '5px 8px', borderRadius: 7,
                        border: '1px solid #e2e8f0', cursor: 'pointer',
                        background: STATUS_CFG[order.status]?.bg || '#f8fafc',
                        color: STATUS_CFG[order.status]?.color || '#475569',
                        outline: 'none',
                      }}>
                      {ALL_STATUSES.map(s => (
                        <option key={s} value={s}>{STATUS_CFG[s].label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 5 }} onClick={e => e.stopPropagation()}>
                    {order.customer_phone && (
                      <a href={buildWALink(order)} target="_blank" rel="noopener noreferrer"
                        title="Contactar por WhatsApp"
                        style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, padding: '5px 7px', display: 'flex', alignItems: 'center', color: '#16a34a', textDecoration: 'none' }}>
                        <MessageCircle size={13} />
                      </a>
                    )}
                    {order.lead_id && (
                      <a href={`/admin/leads?lead=${order.lead_id}`}
                        title="Ver lead en CRM"
                        style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 7, padding: '5px 7px', display: 'flex', alignItems: 'center', color: '#2552ca', textDecoration: 'none' }}>
                        <ExternalLink size={13} />
                      </a>
                    )}
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <button onClick={() => cancelOrder(order.id)}
                        title="Cancelar pedido"
                        style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#dc2626' }}>
                        <XCircle size={13} />
                      </button>
                    )}
                  </div>

                  {/* Expand chevron */}
                  <ChevronDown size={15} color="#94a3b8"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s' }} />
                </div>

                {/* Expanded items */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
                    {/* Items table */}
                    <div style={{ padding: '16px 18px', overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            {['Producto', 'Variante / Acabado', 'Cant.', 'P. Unit.', 'Subtotal'].map(h => (
                              <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{item.name}</td>
                              <td style={{ padding: '9px 12px', fontSize: 12, color: '#64748b' }}>{item.variant_name || '—'}</td>
                              <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 700, color: '#475569', textAlign: 'center' }}>{item.qty}</td>
                              <td style={{ padding: '9px 12px', fontSize: 13, color: '#475569' }}>{fmtMoney(item.unit_price)}</td>
                              <td style={{ padding: '9px 12px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{fmtMoney(item.subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Footer of expanded */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          {order.notes && (
                            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                              <span style={{ fontWeight: 700, color: '#92400e' }}>📝 Notas: </span>
                              <span style={{ color: '#78350f' }}>{order.notes}</span>
                            </div>
                          )}
                          <div>Fuente: <strong>{order.source}</strong> · ID: <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{order.id.slice(0, 8)}...</span></div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Total del pedido</div>
                          <div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 22, fontWeight: 800, color: '#00113a' }}>{fmtMoney(order.total)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Status pipeline */}
                    <div style={{ padding: '12px 18px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {ALL_STATUSES.map(s => {
                        const c = STATUS_CFG[s]
                        const isActive = order.status === s
                        return (
                          <button key={s} onClick={() => updateStatus(order.id, s)}
                            style={{
                              padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${isActive ? c.dot : '#e2e8f0'}`,
                              background: isActive ? c.bg : '#fff', color: isActive ? c.color : '#94a3b8',
                              cursor: 'pointer', fontSize: 11, fontWeight: 700, transition: 'all .15s',
                              fontFamily: 'Manrope, sans-serif',
                            }}>
                            {isActive ? '● ' : ''}{c.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 22, flexWrap: 'wrap' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748b', opacity: page === 1 ? .4 : 1 }}>
            ← Anterior
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setPage(n)}
              style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: page === n ? '#2552ca' : '#fff', color: page === n ? '#fff' : '#475569', borderColor: page === n ? '#2552ca' : '#e2e8f0' }}>
              {n}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748b', opacity: page === totalPages ? .4 : 1 }}>
            Siguiente →
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
