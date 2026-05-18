'use client'
// app/admin/catalogo/pedidos/page.tsx — v3 FIXED
// Fixes: Edit order, Delete order, confirmation modal, total recalculation

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ShoppingCart, RefreshCw, Search, Eye, CheckCircle,
  XCircle, ChevronDown, ExternalLink, MessageCircle,
  Pencil, Trash2, Plus, Minus, Save, AlertTriangle,
} from 'lucide-react'
import { SHADOWS, fmtMoney, fmtDate, EmptyState } from '@/components/DesignSystem'

interface OrderItem {
  product_id: string
  variant_id: string | null
  name: string
  variant_name: string | null
  qty: number
  unit_price: number
  subtotal: number
}

interface Order {
  id: string
  order_number: string
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  items: OrderItem[]
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
  fontFamily: 'Inter, sans-serif', transition: 'border-color .2s', width: '100%', boxSizing: 'border-box',
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

// ─── Confirm Modal ────────────────────────────────────────────────
function ConfirmModal({
  open, title, message, confirmLabel = 'Confirmar', danger = false,
  onConfirm, onCancel,
}: {
  open: boolean; title: string; message: string
  confirmLabel?: string; danger?: boolean
  onConfirm: () => void; onCancel: () => void
}) {
  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onCancel}>
      <div style={{
        background: '#fff', borderRadius: 18, padding: 32, maxWidth: 420, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,.25)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: danger ? '#fef2f2' : '#dbeafe',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <AlertTriangle size={22} color={danger ? '#dc2626' : '#2552ca'} />
          </div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{title}</h3>
        </div>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '9px 20px', border: '1.5px solid #e2e8f0', borderRadius: 9,
            background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569',
          }}>Cancelar</button>
          <button onClick={onConfirm} style={{
            padding: '9px 20px', border: 'none', borderRadius: 9,
            background: danger ? '#dc2626' : '#2552ca',
            cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff',
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Order Modal ─────────────────────────────────────────────
function EditOrderModal({
  order, onClose, onSave,
}: {
  order: Order; onClose: () => void; onSave: (updated: Partial<Order>) => Promise<void>
}) {
  // Use local state with stable keys — prevents focus loss
  const [customerName,  setCustomerName]  = useState(order.customer_name  || '')
  const [customerPhone, setCustomerPhone] = useState(order.customer_phone || '')
  const [customerEmail, setCustomerEmail] = useState(order.customer_email || '')
  const [notes,         setNotes]         = useState(order.notes || '')
  const [status,        setStatus]        = useState(order.status)
  const [items,         setItems]         = useState<OrderItem[]>(
    (order.items || []).map(i => ({ ...i }))
  )
  const [saving, setSaving] = useState(false)

  function updateItemQty(index: number, delta: number) {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const newQty = Math.max(1, item.qty + delta)
      return { ...item, qty: newQty, subtotal: newQty * item.unit_price }
    }))
  }

  function updateItemPrice(index: number, price: number) {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      return { ...item, unit_price: price, subtotal: item.qty * price }
    }))
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  const total = subtotal // per Artia's model

  async function handleSave() {
    if (!items.length) return
    setSaving(true)
    await onSave({
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      customer_email: customerEmail || null,
      notes: notes || null,
      status,
      items,
      subtotal,
      total,
    })
    setSaving(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2500, background: 'rgba(0,0,0,.5)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '24px 16px', overflowY: 'auto',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 640,
        boxShadow: '0 20px 60px rgba(0,0,0,.3)', marginTop: 24,
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
              Editar Pedido
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{order.order_number}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <XCircle size={22} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Customer info */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>Cliente</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Nombre</label>
                {/* KEY PATTERN: stable key prevents remount/focus loss */}
                <input
                  key="edit-name"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Nombre del cliente"
                  style={inp}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Teléfono</label>
                <input
                  key="edit-phone"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="+593..."
                  style={inp}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Email</label>
                <input
                  key="edit-email"
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  style={inp}
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>Productos</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((item, idx) => (
                <div key={`item-${idx}`} style={{
                  background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11,
                  padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
                    {item.variant_name && (
                      <div style={{ fontSize: 11, color: '#64748b' }}>{item.variant_name}</div>
                    )}
                  </div>

                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, color: '#64748b' }}>$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={e => updateItemPrice(idx, parseFloat(e.target.value) || 0)}
                      style={{ ...inp, width: 80, textAlign: 'right' }}
                    />
                  </div>

                  {/* Qty controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => updateItemQty(idx, -1)}
                      style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      <Minus size={12} />
                    </button>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', minWidth: 24, textAlign: 'center' }}>{item.qty}</span>
                    <button
                      onClick={() => updateItemQty(idx, 1)}
                      style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', minWidth: 70, textAlign: 'right' }}>
                    ${item.subtotal.toFixed(2)}
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(idx)}
                    style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#dc2626' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Estado</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inp }}>
              {ALL_STATUSES.map(s => (
                <option key={s} value={s}>{STATUS_CFG[s].label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 4 }}>Notas</label>
            <textarea
              key="edit-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Notas adicionales..."
              style={{ ...inp, resize: 'vertical' }}
            />
          </div>

          {/* Total summary */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Total recalculado</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#00113a', fontFamily: 'Manrope, sans-serif' }}>${total.toFixed(2)} USD</span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{
              padding: '10px 22px', border: '1.5px solid #e2e8f0', borderRadius: 9,
              background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569',
            }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving || !items.length} style={{
              padding: '10px 22px', border: 'none', borderRadius: 9, background: '#2552ca',
              cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, color: '#fff',
              opacity: saving ? .7 : 1, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Save size={14} /> {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function PedidosPage() {
  const supabase = createClient()

  const [orders,       setOrders]       = useState<Order[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [expandedId,   setExpandedId]   = useState<string | null>(null)
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null)
  const [page,         setPage]         = useState(1)
  const [editOrder,    setEditOrder]    = useState<Order | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null)
  const PER = 20

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3500)
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
    const { error } = await supabase.from('catalog_orders').update({ status }).eq('id', id)
    if (!error) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
      showToast(`Estado: ${STATUS_CFG[status]?.label}`)
    } else {
      showToast('Error al actualizar', false)
    }
  }

  // ── Edit Order ──────────────────────────────────────────────────
  async function handleSaveEdit(updated: Partial<Order>) {
    if (!editOrder) return
    const { error } = await supabase
      .from('catalog_orders')
      .update({
        customer_name:  updated.customer_name,
        customer_phone: updated.customer_phone,
        customer_email: updated.customer_email,
        notes:          updated.notes,
        status:         updated.status,
        items:          updated.items,
        subtotal:       updated.subtotal,
        total:          updated.total,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', editOrder.id)

    if (!error) {
      setOrders(prev => prev.map(o =>
        o.id === editOrder.id ? { ...o, ...updated } : o
      ))
      setEditOrder(null)
      showToast('Pedido actualizado correctamente')
    } else {
      showToast('Error al guardar cambios', false)
    }
  }

  // ── Delete Order ────────────────────────────────────────────────
  async function handleConfirmDelete() {
    if (!deleteTarget) return
    const { error } = await supabase
      .from('catalog_orders')
      .delete()
      .eq('id', deleteTarget.id)

    if (!error) {
      setOrders(prev => prev.filter(o => o.id !== deleteTarget.id))
      setDeleteTarget(null)
      showToast('Pedido eliminado')
    } else {
      showToast('Error al eliminar pedido', false)
    }
  }

  // Filtered + paginated
  const filtered = orders.filter(o => {
    const ms = !search ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_name  || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_phone || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_email || '').toLowerCase().includes(search.toLowerCase())
    const mst = filterStatus === 'all' || o.status === filterStatus
    return ms && mst
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER))
  const paginated  = filtered.slice((page - 1) * PER, page * PER)

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
    const num = phone.startsWith('593') ? phone : phone.startsWith('0') ? '593' + phone.slice(1) : '593' + phone
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
          animation: 'slideIn .25s ease',
        }}>
          {toast.ok ? <CheckCircle size={15} /> : <XCircle size={15} />} {toast.msg}
        </div>
      )}

      {/* Modals */}
      {editOrder && (
        <EditOrderModal
          order={editOrder}
          onClose={() => setEditOrder(null)}
          onSave={handleSaveEdit}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Eliminar pedido"
        message={`¿Estás seguro de que quieres eliminar el pedido ${deleteTarget?.order_number}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

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
          { label: 'Total pedidos',  value: stats.total,              color: '#2552ca', bg: '#dbeafe' },
          { label: 'Pendientes',     value: stats.pending,            color: '#d97706', bg: '#fef3c7' },
          { label: 'En producción',  value: stats.production,         color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Entregados',     value: stats.delivered,          color: '#16a34a', bg: '#dcfce7' },
          { label: 'Ingresos',       value: fmtMoney(stats.revenue),  color: '#0f172a', bg: '#f1f5f9', isText: true },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 13, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: SHADOWS.sm }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: (s as any).isText ? 13 : 21, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por N° pedido, cliente, teléfono..."
            style={{ ...inp, paddingLeft: 32 }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
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
                background: '#fff',
                border: `1px solid ${order.status === 'pending' ? '#fde68a' : '#e2e8f0'}`,
                borderRadius: 14, overflow: 'hidden', boxShadow: SHADOWS.sm,
              }}>
                {/* Row */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr auto auto auto auto auto',
                  gap: 12, alignItems: 'center', padding: '14px 18px',
                  cursor: 'pointer',
                }} onClick={() => setExpandedId(isExpanded ? null : order.id)}>

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
                    {/* Edit button */}
                    <button
                      onClick={() => setEditOrder(order)}
                      title="Editar pedido"
                      style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#2552ca' }}>
                      <Pencil size={13} />
                    </button>

                    {/* WhatsApp */}
                    {order.customer_phone && (
                      <a href={buildWALink(order)} target="_blank" rel="noopener noreferrer"
                        title="Contactar por WhatsApp"
                        style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, padding: '5px 7px', display: 'flex', alignItems: 'center', color: '#16a34a', textDecoration: 'none' }}>
                        <MessageCircle size={13} />
                      </a>
                    )}

                    {/* CRM link */}
                    {order.lead_id && (
                      <a href={`/admin/leads?lead=${order.lead_id}`}
                        title="Ver lead en CRM"
                        style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 7, padding: '5px 7px', display: 'flex', alignItems: 'center', color: '#2552ca', textDecoration: 'none' }}>
                        <ExternalLink size={13} />
                      </a>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={() => setDeleteTarget(order)}
                      title="Eliminar pedido"
                      style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#dc2626' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Expand chevron */}
                  <ChevronDown size={15} color="#94a3b8"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s' }} />
                </div>

                {/* Expanded items */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
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
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(n => (
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
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  )
}
