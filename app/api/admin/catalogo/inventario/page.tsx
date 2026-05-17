'use client'
// app/admin/catalogo/inventario/page.tsx

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Archive, RefreshCw, Search, Plus, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, XCircle, Package
} from 'lucide-react'
import { SHADOWS, fmtMoney, fmtDate, EmptyState } from '@/components/DesignSystem'

interface Movement {
  id: string
  product_id: string
  variant_id: string | null
  order_id: string | null
  type: 'sale' | 'restock' | 'adjustment' | 'damage' | 'return'
  qty_change: number
  qty_before: number
  qty_after: number
  notes: string | null
  created_by: string
  created_at: string
  catalog_products: { name: string } | null
  product_variants: { variant_name: string } | null
}

interface Product {
  id: string
  name: string
  cover_image: string | null
  stock_qty: number
  stock_status: string
  low_stock_threshold: number
  track_stock: boolean
  category_name: string | null
}

const TYPE_CFG: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  sale:       { label: 'Venta',      bg: '#dbeafe', color: '#1e40af', icon: '🛒' },
  restock:    { label: 'Reposición', bg: '#dcfce7', color: '#166534', icon: '📦' },
  adjustment: { label: 'Ajuste',     bg: '#fef3c7', color: '#92400e', icon: '⚙️' },
  damage:     { label: 'Daño',       bg: '#fef2f2', color: '#991b1b', icon: '⚠️' },
  return:     { label: 'Devolución', bg: '#f3e8ff', color: '#6b21a8', icon: '↩️' },
}

const STOCK_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  in_stock:     { label: 'En stock',   bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  low_stock:    { label: 'Stock bajo', bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  out_of_stock: { label: 'Sin stock',  bg: '#fef2f2', color: '#991b1b', dot: '#ef4444' },
  unlimited:    { label: 'Ilimitado',  bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
}

const inp: React.CSSProperties = {
  padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9,
  fontSize: 13, outline: 'none', background: '#fafafa',
  fontFamily: 'Inter, sans-serif', transition: 'border-color .2s',
}

export default function InventarioPage() {
  const supabase = createClient()

  const [tab,        setTab]        = useState<'movements' | 'stock'>('movements')
  const [movements,  setMovements]  = useState<Movement[]>([])
  const [products,   setProducts]   = useState<Product[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [filterType, setFilterType] = useState('all')
  const [page,       setPage]       = useState(1)
  const PER = 30

  // Restock modal
  const [restockModal, setRestockModal] = useState(false)
  const [restockProduct, setRestockProduct] = useState<Product | null>(null)
  const [restockQty,   setRestockQty]   = useState(0)
  const [restockNote,  setRestockNote]  = useState('')
  const [restockType,  setRestockType]  = useState<'restock' | 'adjustment' | 'damage' | 'return'>('restock')
  const [saving,       setSaving]       = useState(false)

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: movs }, { data: prods }] = await Promise.all([
      supabase
        .from('inventory_movements')
        .select('*, catalog_products(name), product_variants(variant_name)')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('catalog_products_view')
        .select('id, name, cover_image, stock_qty, stock_status, low_stock_threshold, track_stock, category_name')
        .eq('active', true)
        .eq('track_stock', true)
        .order('name'),
    ])
    setMovements(movs || [])
    setProducts(prods || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function doRestock() {
    if (!restockProduct || !restockQty) return
    setSaving(true)

    const isPositive = ['restock', 'return'].includes(restockType)
    const change     = isPositive ? Math.abs(restockQty) : -Math.abs(restockQty)
    const newQty     = Math.max(0, restockProduct.stock_qty + change)
    const newStatus  = newQty === 0
      ? 'out_of_stock'
      : newQty <= restockProduct.low_stock_threshold
        ? 'low_stock'
        : 'in_stock'

    const [{ error: updErr }, { error: movErr }] = await Promise.all([
      supabase.from('catalog_products').update({ stock_qty: newQty, stock_status: newStatus }).eq('id', restockProduct.id),
      supabase.from('inventory_movements').insert({
        product_id:  restockProduct.id,
        type:        restockType,
        qty_change:  change,
        qty_before:  restockProduct.stock_qty,
        qty_after:   newQty,
        notes:       restockNote || `${TYPE_CFG[restockType].label} manual desde admin`,
        created_by:  'admin',
      }),
    ])

    if (!updErr && !movErr) {
      showToast(`Stock actualizado: ${newQty} unidades ✓`)
      setRestockModal(false)
      setRestockProduct(null)
      setRestockQty(0)
      setRestockNote('')
      load()
    } else {
      showToast('Error al actualizar stock', false)
    }
    setSaving(false)
  }

  // Filtered movements
  const filteredMovs = movements.filter(m => {
    const ms = !search ||
      (m.catalog_products?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.notes || '').toLowerCase().includes(search.toLowerCase())
    const mt = filterType === 'all' || m.type === filterType
    return ms && mt
  })

  const totalPages = Math.max(1, Math.ceil(filteredMovs.length / PER))
  const paginated  = filteredMovs.slice((page - 1) * PER, page * PER)

  // Alerts
  const alerts = products.filter(p => ['low_stock', 'out_of_stock'].includes(p.stock_status))

  // Stats
  const stats = {
    totalMovs:   movements.length,
    sales:       movements.filter(m => m.type === 'sale').length,
    restocks:    movements.filter(m => m.type === 'restock').length,
    alerts:      alerts.length,
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
            <Archive size={24} color="#16a34a" /> Inventario
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
            {stats.totalMovs} movimientos
            {stats.alerts > 0 && <span style={{ color: '#f59e0b', fontWeight: 700, marginLeft: 6 }}>· ⚠️ {stats.alerts} alertas de stock</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', border: '1px solid #e2e8f0', borderRadius: 9, background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
            <RefreshCw size={13} /> Actualizar
          </button>
          <button onClick={() => setRestockModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: 'none', borderRadius: 9, background: 'linear-gradient(135deg,#16a34a,#15803d)', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', boxShadow: '0 4px 14px rgba(22,163,74,.3)' }}>
            <Plus size={14} /> Movimiento manual
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 22 }}>
        {[
          { label: 'Movimientos',   value: stats.totalMovs, color: '#475569',  bg: '#f1f5f9' },
          { label: 'Ventas',        value: stats.sales,     color: '#1e40af',  bg: '#dbeafe' },
          { label: 'Reposiciones',  value: stats.restocks,  color: '#166534',  bg: '#dcfce7' },
          { label: 'Alertas stock', value: stats.alerts,    color: '#d97706',  bg: '#fef3c7' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 13, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: SHADOWS.sm }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 21, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts bar */}
      {alerts.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={16} color="#d97706" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
              {alerts.length} producto{alerts.length !== 1 ? 's' : ''} con stock bajo o agotado
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {alerts.map(p => {
              const sc = STOCK_CFG[p.stock_status]
              return (
                <button key={p.id}
                  onClick={() => { setRestockProduct(p); setRestockModal(true) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                    background: sc.bg, border: `1px solid ${sc.dot}20`, borderRadius: 9,
                    cursor: 'pointer', transition: 'all .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.1)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: sc.color }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: sc.color, opacity: .7 }}>({p.stock_qty} uds)</span>
                  <span style={{ fontSize: 10, color: sc.color, fontWeight: 800, background: `${sc.dot}20`, padding: '1px 6px', borderRadius: 4 }}>+ Reponer</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 18, borderBottom: '1px solid #e2e8f0' }}>
        {[['movements', '📋 Movimientos'], ['stock', '📦 Estado del stock']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as any)} style={{
            padding: '10px 16px', border: 'none',
            borderBottom: tab === id ? '2px solid #16a34a' : '2px solid transparent',
            background: 'none', cursor: 'pointer', fontSize: 13,
            fontWeight: tab === id ? 700 : 500, color: tab === id ? '#16a34a' : '#64748b',
            transition: 'all .15s', marginBottom: -1, fontFamily: 'Manrope, sans-serif',
          }}>{label}</button>
        ))}
      </div>

      {/* ── MOVEMENTS TAB ── */}
      {tab === 'movements' && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Buscar por producto o notas..."
                style={{ ...inp, paddingLeft: 32, width: '100%' }} />
            </div>
            <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}
              style={{ ...inp, width: 'auto', minWidth: 140 }}>
              <option value="all">Todos los tipos</option>
              {Object.entries(TYPE_CFG).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
              <RefreshCw size={26} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Producto', 'Variante', 'Tipo', 'Cambio', 'Antes → Después', 'Notas', 'Por', 'Fecha'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(m => {
                      const tc = TYPE_CFG[m.type] || TYPE_CFG.adjustment
                      return (
                        <tr key={m.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0f172a', maxWidth: 180 }}>
                            {m.catalog_products?.name || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Producto eliminado</span>}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>
                            {m.product_variants?.variant_name || '—'}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 800, background: tc.bg, color: tc.color }}>
                              {tc.icon} {tc.label}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 800, fontSize: 15, color: m.qty_change > 0 ? '#16a34a' : '#dc2626' }}>
                            {m.qty_change > 0 ? '+' : ''}{m.qty_change}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#475569', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                            {m.qty_before} → {m.qty_after}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b', maxWidth: 200 }}>
                            {m.notes || '—'}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 11, color: '#94a3b8' }}>
                            {m.created_by}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                            {fmtDate(m.created_at)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {paginated.length === 0 && (
                <EmptyState icon="📋" title="Sin movimientos" subtitle="Los movimientos de inventario aparecerán aquí" />
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 18, flexWrap: 'wrap' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748b', opacity: page === 1 ? .4 : 1 }}>
                ← Anterior
              </button>
              <span style={{ padding: '7px 14px', fontSize: 12, color: '#64748b' }}>
                Página {page} de {totalPages}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748b', opacity: page === totalPages ? .4 : 1 }}>
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}

      {/* ── STOCK TAB ── */}
      {tab === 'stock' && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Producto', 'Categoría', 'Stock actual', 'Umbral alerta', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const sc = STOCK_CFG[p.stock_status] || STOCK_CFG.unlimited
                  const pct = p.low_stock_threshold > 0
                    ? Math.min(100, (p.stock_qty / (p.low_stock_threshold * 4)) * 100)
                    : 100
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {p.cover_image && (
                            <img src={p.cover_image} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                          )}
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{p.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>{p.category_name || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', fontFamily: 'Manrope, sans-serif' }}>{p.stock_qty}</div>
                        <div style={{ height: 4, width: 80, background: '#f1f5f9', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: pct < 25 ? '#ef4444' : pct < 50 ? '#f59e0b' : '#22c55e', width: `${pct}%`, borderRadius: 2, transition: 'width .4s' }} />
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: '#64748b' }}>{p.low_stock_threshold} uds</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6 }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot }} />
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <button
                          onClick={() => { setRestockProduct(p); setRestockModal(true) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#166534' }}>
                          <Plus size={11} /> Ajustar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {products.length === 0 && (
              <EmptyState icon="📦" title="Sin productos con stock controlado" subtitle="Activa 'Controlar stock' en el producto para verlo aquí" />
            )}
          </div>
        </div>
      )}

      {/* ── RESTOCK MODAL ── */}
      {restockModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,.3)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg,#00113a,#002878)', padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0 }}>Movimiento de inventario</h3>
                {restockProduct && <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 12, margin: '3px 0 0' }}>{restockProduct.name}</p>}
              </div>
              <button onClick={() => { setRestockModal(false); setRestockProduct(null); setRestockQty(0); setRestockNote('') }}
                style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '5px 9px', fontSize: 16 }}>✕</button>
            </div>

            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Product selector if none pre-selected */}
              {!restockProduct && (
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>
                    Producto
                  </label>
                  <select style={inp} onChange={e => {
                    const p = products.find(x => x.id === e.target.value) || null
                    setRestockProduct(p)
                  }}>
                    <option value="">— Seleccionar —</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (stock actual: {p.stock_qty})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Current stock display */}
              {restockProduct && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Stock actual</span>
                  <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                    {restockProduct.stock_qty} uds
                  </span>
                </div>
              )}

              {/* Type */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>
                  Tipo de movimiento
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                  {(['restock', 'adjustment', 'damage', 'return'] as const).map(t => (
                    <button key={t} onClick={() => setRestockType(t)} style={{
                      padding: '9px 12px', borderRadius: 9, cursor: 'pointer', transition: 'all .15s',
                      border: `2px solid ${restockType === t ? '#00113a' : '#e2e8f0'}`,
                      background: restockType === t ? '#f0f4ff' : '#fafafa',
                      fontSize: 12, fontWeight: 700, color: restockType === t ? '#00113a' : '#64748b',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {TYPE_CFG[t].icon} {TYPE_CFG[t].label}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 7 }}>
                  {['restock', 'return'].includes(restockType) ? '↑ Incrementa el stock' : '↓ Reduce el stock'}
                </p>
              </div>

              {/* Quantity */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>
                  Cantidad
                </label>
                <input type="number" min="1" value={restockQty || ''}
                  onChange={e => setRestockQty(parseInt(e.target.value) || 0)}
                  placeholder="0" autoFocus
                  style={{ ...inp, width: '100%', fontSize: 20, fontWeight: 800, textAlign: 'center', fontFamily: 'Manrope, sans-serif' }} />
                {restockProduct && restockQty > 0 && (
                  <p style={{ fontSize: 12, color: '#475569', marginTop: 6, textAlign: 'center' }}>
                    Stock resultante: <strong style={{ fontFamily: 'Manrope, sans-serif', color: '#00113a' }}>
                      {Math.max(0, restockProduct.stock_qty + (['restock', 'return'].includes(restockType) ? restockQty : -restockQty))} uds
                    </strong>
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>
                  Notas (opcional)
                </label>
                <input value={restockNote} onChange={e => setRestockNote(e.target.value)}
                  placeholder="Ej: Llegó nuevo lote, se dañaron en transporte..."
                  style={{ ...inp, width: '100%' }} />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setRestockModal(false); setRestockProduct(null); setRestockQty(0) }}
                  style={{ flex: 1, padding: '11px 0', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                  Cancelar
                </button>
                <button onClick={doRestock} disabled={saving || !restockQty || !restockProduct}
                  style={{
                    flex: 2, padding: '11px 0', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff',
                    background: saving || !restockQty ? '#94a3b8' : 'linear-gradient(135deg,#00113a,#2552ca)',
                    cursor: saving || !restockQty ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  {saving
                    ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
                    : `Registrar ${['restock', 'return'].includes(restockType) ? '+' : '-'}${restockQty || 0} unidades`
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
