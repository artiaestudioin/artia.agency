'use client'
// app/admin/catalogo/inventario/page.tsx — FIXED v2
// Fixes: empty inventory, broken product selector, edit/delete movements, history timeline

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Package, RefreshCw, Search, Plus, Minus, TrendingUp, TrendingDown,
  CheckCircle, XCircle, AlertTriangle, Pencil, Trash2, Save, Clock,
  BarChart2, ArrowUpCircle, ArrowDownCircle,
} from 'lucide-react'
import { SHADOWS, fmtMoney, fmtDate, EmptyState } from '@/components/DesignSystem'

interface Product {
  id: string
  name: string
  slug: string
  sku: string | null
  stock_qty: number
  stock_status: string
  track_stock: boolean
  low_stock_threshold: number
  price: number
  category_name: string | null
}

interface Movement {
  id: string
  product_id: string
  variant_id: string | null
  order_id: string | null
  type: 'sale' | 'restock' | 'adjustment' | 'return' | 'loss'
  qty_change: number
  qty_before: number
  qty_after: number
  notes: string | null
  created_by: string | null
  created_at: string
  // joined
  product_name?: string
}

const MOVE_TYPES: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  sale:       { label: 'Venta',       color: '#dc2626', icon: <ArrowDownCircle size={14} /> },
  restock:    { label: 'Restock',     color: '#16a34a', icon: <ArrowUpCircle   size={14} /> },
  adjustment: { label: 'Ajuste',      color: '#2552ca', icon: <BarChart2       size={14} /> },
  return:     { label: 'Devolución',  color: '#7c3aed', icon: <ArrowUpCircle   size={14} /> },
  loss:       { label: 'Pérdida',     color: '#d97706', icon: <ArrowDownCircle size={14} /> },
}

const STOCK_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  in_stock:     { label: 'En stock',     color: '#16a34a', bg: '#dcfce7' },
  low_stock:    { label: 'Stock bajo',   color: '#d97706', bg: '#fef3c7' },
  out_of_stock: { label: 'Sin stock',    color: '#dc2626', bg: '#fef2f2' },
}

const inp: React.CSSProperties = {
  padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 9,
  fontSize: 13, outline: 'none', background: '#fafafa',
  fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box',
}

// ─── Confirm Modal ────────────────────────────────────────────────
function ConfirmModal({ open, title, message, danger = false, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; danger?: boolean
  onConfirm: () => void; onCancel: () => void
}) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onCancel}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 32, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: danger ? '#fef2f2' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={22} color={danger ? '#dc2626' : '#2552ca'} />
          </div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{title}</h3>
        </div>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '9px 20px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}>Cancelar</button>
          <button onClick={onConfirm} style={{ padding: '9px 20px', border: 'none', borderRadius: 9, background: danger ? '#dc2626' : '#2552ca', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {danger ? 'Eliminar' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Manual Movement Modal ────────────────────────────────────────
function MovementModal({
  products, onClose, onSave,
}: {
  products: Product[]
  onClose: () => void
  onSave: (m: { product_id: string; type: string; qty: number; notes: string }) => Promise<void>
}) {
  const [productId, setProductId] = useState('')
  const [type, setType]           = useState('restock')
  const [qty, setQty]             = useState(1)
  const [notes, setNotes]         = useState('')
  const [saving, setSaving]       = useState(false)
  const [search, setSearch]       = useState('')

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase())
  )

  const selected = products.find(p => p.id === productId)

  async function handleSave() {
    if (!productId || qty < 1) return
    setSaving(true)
    await onSave({ product_id: productId, type, qty, notes })
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2500, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Movimiento Manual</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
            <XCircle size={22} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Product search + select */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>Producto *</label>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar producto..."
                style={{ ...inp, paddingLeft: 32 }}
              />
            </div>
            {/* Product list — fixed height scrollable, NOT a native select */}
            <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 9, overflow: 'hidden', maxHeight: 200, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <div style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>No se encontraron productos</div>
              ) : filtered.map(p => (
                <div
                  key={p.id}
                  onClick={() => setProductId(p.id)}
                  style={{
                    padding: '10px 16px', cursor: 'pointer',
                    background: productId === p.id ? '#eff6ff' : '#fff',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'background .1s',
                  }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: productId === p.id ? 700 : 500, color: '#0f172a' }}>{p.name}</div>
                    {p.sku && <div style={{ fontSize: 11, color: '#94a3b8' }}>SKU: {p.sku}</div>}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>Stock: {p.stock_qty}</div>
                    <div style={{ fontSize: 10 }}>{p.category_name || ''}</div>
                  </div>
                </div>
              ))}
            </div>
            {selected && (
              <div style={{ marginTop: 8, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#1e40af', fontWeight: 600 }}>
                ✓ Seleccionado: {selected.name} (Stock actual: {selected.stock_qty})
              </div>
            )}
          </div>

          {/* Type */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>Tipo de movimiento</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(MOVE_TYPES).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setType(key)}
                  style={{
                    padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    border: `1.5px solid ${type === key ? cfg.color : '#e2e8f0'}`,
                    background: type === key ? `${cfg.color}15` : '#fff',
                    color: type === key ? cfg.color : '#64748b',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Qty */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>Cantidad</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 36, height: 36, border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Minus size={14} />
              </button>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ ...inp, width: 100, textAlign: 'center', fontWeight: 700, fontSize: 16 }}
              />
              <button onClick={() => setQty(q => q + 1)} style={{ width: 36, height: 36, border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Preview */}
          {selected && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Vista previa del cambio</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 700 }}>
                <span style={{ color: '#64748b' }}>{selected.stock_qty}</span>
                <span style={{ color: '#94a3b8' }}>→</span>
                <span style={{ color: ['sale', 'loss'].includes(type) ? '#dc2626' : '#16a34a', fontSize: 18 }}>
                  {['sale', 'loss'].includes(type) ? selected.stock_qty - qty : selected.stock_qty + qty}
                </span>
                <span style={{ fontSize: 11, color: MOVE_TYPES[type].color, fontWeight: 600 }}>({MOVE_TYPES[type].label})</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Motivo del movimiento..."
              style={{ ...inp, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 22px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving || !productId || qty < 1} style={{ padding: '10px 22px', border: 'none', borderRadius: 9, background: '#2552ca', cursor: saving || !productId ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', opacity: saving || !productId ? .6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={14} /> {saving ? 'Guardando...' : 'Registrar movimiento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Movement Modal ──────────────────────────────────────────
function EditMovementModal({ movement, products, onClose, onSave }: {
  movement: Movement; products: Product[]
  onClose: () => void
  onSave: (id: string, data: { type: string; qty_change: number; notes: string }) => Promise<void>
}) {
  const isNegative = movement.qty_change < 0
  const [type, setType]   = useState(movement.type)
  const [qty, setQty]     = useState(Math.abs(movement.qty_change))
  const [notes, setNotes] = useState(movement.notes || '')
  const [saving, setSaving] = useState(false)

  const product = products.find(p => p.id === movement.product_id)

  async function handleSave() {
    setSaving(true)
    const sign = ['sale', 'loss'].includes(type) ? -1 : 1
    await onSave(movement.id, { type, qty_change: sign * qty, notes })
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2500, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Editar Movimiento</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><XCircle size={22} /></button>
        </div>
        <div style={{ padding: 24 }}>
          {product && (
            <div style={{ background: '#f8fafc', borderRadius: 9, padding: '10px 14px', marginBottom: 16, fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
              📦 {product.name}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>Tipo</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(MOVE_TYPES).map(([key, cfg]) => (
                <button key={key} onClick={() => setType(key as any)} style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  border: `1.5px solid ${type === key ? cfg.color : '#e2e8f0'}`,
                  background: type === key ? `${cfg.color}15` : '#fff',
                  color: type === key ? cfg.color : '#64748b', cursor: 'pointer',
                }}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>Cantidad</label>
            <input type="number" min="1" value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inp, maxWidth: 120 }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 22px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '10px 22px', border: 'none', borderRadius: 9, background: '#2552ca', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', opacity: saving ? .7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────
export default function InventarioPage() {
  const supabase = createClient()

  const [products,      setProducts]      = useState<Product[]>([])
  const [movements,     setMovements]     = useState<Movement[]>([])
  const [loading,       setLoading]       = useState(true)
  const [loadingMoves,  setLoadingMoves]  = useState(true)
  const [search,        setSearch]        = useState('')
  const [tab,           setTab]           = useState<'stock' | 'movements'>('stock')
  const [showMovModal,  setShowMovModal]  = useState(false)
  const [editMovement,  setEditMovement]  = useState<Movement | null>(null)
  const [deleteTarget,  setDeleteTarget]  = useState<Movement | null>(null)
  const [toast,         setToast]         = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3500)
  }

  // ── Load products ───────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    setLoading(true)
    // FIX: query catalog_products directly (not the view) for inventory management
    const { data, error } = await supabase
      .from('catalog_products')
      .select(`
        id, name, slug, sku, stock_qty, stock_status, track_stock,
        low_stock_threshold, price,
        catalog_categories ( name )
      `)
      .eq('active', true)
      .order('name', { ascending: true })

    if (!error && data) {
      setProducts(data.map((p: any) => ({
        ...p,
        category_name: p.catalog_categories?.name || null,
      })))
    } else if (error) {
      console.error('Products load error:', error)
      showToast('Error cargando productos', false)
    }
    setLoading(false)
  }, [])

  // ── Load movements with product name join ───────────────────────
  const loadMovements = useCallback(async () => {
    setLoadingMoves(true)
    const { data, error } = await supabase
      .from('inventory_movements')
      .select(`
        id, product_id, variant_id, order_id, type,
        qty_change, qty_before, qty_after, notes, created_by, created_at,
        catalog_products ( name )
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (!error && data) {
      setMovements(data.map((m: any) => ({
        ...m,
        product_name: m.catalog_products?.name || 'Producto desconocido',
      })))
    } else if (error) {
      console.error('Movements load error:', error)
    }
    setLoadingMoves(false)
  }, [])

  useEffect(() => {
    loadProducts()
    loadMovements()
  }, [loadProducts, loadMovements])

  // ── Create movement ─────────────────────────────────────────────
  async function handleCreateMovement(data: { product_id: string; type: string; qty: number; notes: string }) {
    const product = products.find(p => p.id === data.product_id)
    if (!product) return

    const isNegative  = ['sale', 'loss'].includes(data.type)
    const qtyChange   = isNegative ? -data.qty : data.qty
    const qtyBefore   = product.stock_qty
    const qtyAfter    = Math.max(0, qtyBefore + qtyChange)
    const newStatus   = qtyAfter === 0
      ? 'out_of_stock'
      : qtyAfter <= (product.low_stock_threshold || 5)
        ? 'low_stock'
        : 'in_stock'

    // Insert movement
    const { error: moveErr } = await supabase.from('inventory_movements').insert({
      product_id:  data.product_id,
      type:        data.type,
      qty_change:  qtyChange,
      qty_before:  qtyBefore,
      qty_after:   qtyAfter,
      notes:       data.notes || null,
      created_by:  'admin',
    })

    if (moveErr) { showToast('Error al registrar movimiento', false); return }

    // Update product stock if tracked
    if (product.track_stock) {
      await supabase.from('catalog_products').update({
        stock_qty:    qtyAfter,
        stock_status: newStatus,
      }).eq('id', data.product_id)
    }

    showToast('Movimiento registrado')
    setShowMovModal(false)
    loadProducts()
    loadMovements()
  }

  // ── Edit movement ───────────────────────────────────────────────
  async function handleEditMovement(id: string, data: { type: string; qty_change: number; notes: string }) {
    const { error } = await supabase
      .from('inventory_movements')
      .update({ type: data.type, qty_change: data.qty_change, notes: data.notes })
      .eq('id', id)

    if (!error) {
      // Recalculate stock for affected product
      const movement = movements.find(m => m.id === id)
      if (movement) {
        await recalcProductStock(movement.product_id)
      }
      showToast('Movimiento actualizado')
      setEditMovement(null)
      loadProducts()
      loadMovements()
    } else {
      showToast('Error al actualizar movimiento', false)
    }
  }

  // ── Delete movement ─────────────────────────────────────────────
  async function handleDeleteMovement() {
    if (!deleteTarget) return
    const { error } = await supabase
      .from('inventory_movements')
      .delete()
      .eq('id', deleteTarget.id)

    if (!error) {
      await recalcProductStock(deleteTarget.product_id)
      showToast('Movimiento eliminado')
      setDeleteTarget(null)
      loadProducts()
      loadMovements()
    } else {
      showToast('Error al eliminar movimiento', false)
    }
  }

  // ── Recalculate stock from movement history ─────────────────────
  async function recalcProductStock(productId: string) {
    // Re-fetch all movements for this product and replay
    const { data } = await supabase
      .from('inventory_movements')
      .select('qty_change')
      .eq('product_id', productId)
      .order('created_at', { ascending: true })

    if (!data) return

    const product = products.find(p => p.id === productId)
    if (!product) return

    const newQty = Math.max(0, data.reduce((sum, m) => sum + m.qty_change, 0))
    const newStatus = newQty === 0
      ? 'out_of_stock'
      : newQty <= (product.low_stock_threshold || 5)
        ? 'low_stock'
        : 'in_stock'

    await supabase.from('catalog_products').update({
      stock_qty:    newQty,
      stock_status: newStatus,
    }).eq('id', productId)
  }

  const filteredProducts = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase())
  )

  const filteredMovements = movements.filter(m =>
    !search || (m.product_name || '').toLowerCase().includes(search.toLowerCase()) || (m.notes || '').toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total:    products.length,
    inStock:  products.filter(p => p.stock_status === 'in_stock').length,
    low:      products.filter(p => p.stock_status === 'low_stock').length,
    out:      products.filter(p => p.stock_status === 'out_of_stock').length,
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

      {/* Modals */}
      {showMovModal && (
        <MovementModal
          products={products}
          onClose={() => setShowMovModal(false)}
          onSave={handleCreateMovement}
        />
      )}

      {editMovement && (
        <EditMovementModal
          movement={editMovement}
          products={products}
          onClose={() => setEditMovement(null)}
          onSave={handleEditMovement}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Eliminar movimiento"
        message="¿Eliminar este movimiento? El stock del producto será recalculado automáticamente."
        danger
        onConfirm={handleDeleteMovement}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Header */}
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={24} color="#2552ca" /> Inventario
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
            {stats.low > 0 && <span style={{ color: '#d97706', fontWeight: 700 }}>⚠️ {stats.low} con stock bajo · </span>}
            {stats.out > 0 && <span style={{ color: '#dc2626', fontWeight: 700 }}>🚫 {stats.out} sin stock · </span>}
            {stats.total} productos
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { loadProducts(); loadMovements() }} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: 9, background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
            <RefreshCw size={13} /> Actualizar
          </button>
          <button onClick={() => setShowMovModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', border: 'none', borderRadius: 9, background: '#2552ca', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#fff' }}>
            <Plus size={13} /> Movimiento manual
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 22 }}>
        {[
          { label: 'Total productos', value: stats.total,   color: '#2552ca' },
          { label: 'En stock',        value: stats.inStock, color: '#16a34a' },
          { label: 'Stock bajo',      value: stats.low,     color: '#d97706' },
          { label: 'Sin stock',       value: stats.out,     color: '#dc2626' },
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, background: '#e2e8f0', borderRadius: 11, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'stock', label: 'Stock de productos' },
          { key: 'movements', label: 'Historial de movimientos' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            background: tab === t.key ? '#fff' : 'transparent',
            color: tab === t.key ? '#0f172a' : '#64748b',
            boxShadow: tab === t.key ? SHADOWS.sm : 'none',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 400, marginBottom: 16 }}>
        <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={tab === 'stock' ? 'Buscar producto...' : 'Buscar en historial...'}
          style={{ ...inp, paddingLeft: 32 }}
        />
      </div>

      {/* ── STOCK TAB ──────────────────────────────────────────────── */}
      {tab === 'stock' && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
              <RefreshCw size={26} style={{ animation: 'spin 1s linear infinite' }} />
              <p>Cargando inventario...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState icon="📦" title="Sin productos" subtitle="No se encontraron productos en el inventario" />
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: SHADOWS.sm }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Producto', 'SKU', 'Categoría', 'Stock', 'Estado', 'Precio'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => {
                    const st = STOCK_STATUS[p.stock_status] || STOCK_STATUS.in_stock
                    return (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                          {!p.track_stock && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>No rastreado</div>}
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{p.sku || '—'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>{p.category_name || '—'}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: p.stock_qty === 0 ? '#dc2626' : p.stock_qty <= (p.low_stock_threshold || 5) ? '#d97706' : '#0f172a' }}>
                            {p.track_stock ? p.stock_qty : '∞'}
                          </span>
                          {p.track_stock && p.low_stock_threshold > 0 && (
                            <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 4 }}>/ {p.low_stock_threshold} mín.</span>
                          )}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: st.bg, color: st.color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6 }}>
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                          {fmtMoney(p.price)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── MOVEMENTS TAB ──────────────────────────────────────────── */}
      {tab === 'movements' && (
        <>
          {loadingMoves ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
              <RefreshCw size={26} style={{ animation: 'spin 1s linear infinite' }} />
              <p>Cargando historial...</p>
            </div>
          ) : filteredMovements.length === 0 ? (
            <EmptyState icon="📋" title="Sin movimientos" subtitle="Los movimientos de inventario aparecerán aquí" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: SHADOWS.sm }}>
              {/* Timeline header */}
              <div style={{ padding: '10px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 12, alignItems: 'center' }}>
                <Clock size={14} color="#64748b" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Historial de movimientos ({filteredMovements.length})</span>
              </div>

              {filteredMovements.map((m, idx) => {
                const cfg = MOVE_TYPES[m.type] || MOVE_TYPES.adjustment
                const isPositive = m.qty_change > 0
                return (
                  <div key={m.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr auto auto auto',
                    gap: 12, alignItems: 'center',
                    padding: '12px 18px',
                    borderBottom: idx < filteredMovements.length - 1 ? '1px solid #f1f5f9' : 'none',
                  }}>
                    {/* Type icon */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: `${cfg.color}15`, color: cfg.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {cfg.icon}
                    </div>

                    {/* Info */}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{m.product_name}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        <span style={{ fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                        {m.notes && ` · ${m.notes}`}
                        {m.order_id && ' · (desde pedido)'}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{fmtDate(m.created_at)} · {m.created_by || 'sistema'}</div>
                    </div>

                    {/* Stock change */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: isPositive ? '#16a34a' : '#dc2626' }}>
                        {isPositive ? '+' : ''}{m.qty_change}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{m.qty_before} → {m.qty_after}</div>
                    </div>

                    {/* Edit */}
                    <button
                      onClick={() => setEditMovement(m)}
                      style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#2552ca' }}>
                      <Pencil size={12} />
                    </button>

                    {/* Delete — only manual movements (not from orders) */}
                    {!m.order_id && (
                      <button
                        onClick={() => setDeleteTarget(m)}
                        style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#dc2626' }}>
                        <Trash2 size={12} />
                      </button>
                    )}
                    {m.order_id && <div style={{ width: 28 }} />}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
