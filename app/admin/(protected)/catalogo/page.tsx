'use client'
// app/admin/catalogo/page.tsx — v3 FIXED
// FIXES:
//  1. Focus loss → ProductModal extraído al nivel de módulo (fuera de CatalogoPage)
//  2. key={i} en VariantRow → reemplazado por _localId estable
//  3. duplicateProduct → manejo robusto de errores + slug único garantizado
//  4. Atributos cualitativos: chips de acabado/color/material/talla + libre texto
//  5. Pedidos: Edit + Delete con modal de confirmación
//  6. Inventario: tabla completa + movimiento manual con selector funcional

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Package, Plus, Search, Edit3, Trash2, Copy, RefreshCw, Save,
  ChevronDown, ChevronUp, Star, AlertTriangle, CheckCircle, XCircle,
  BarChart3, Layers, ShoppingCart, Box, MoreVertical, DollarSign,
  TrendingUp, ImageIcon, X, Eye, EyeOff, Pencil, Minus,
  ArrowUpCircle, ArrowDownCircle, Clock,
} from 'lucide-react'
import {
  COLORS, SHADOWS, BORDER_RADIUS,
  fmtMoney, fmtDate, EmptyState,
} from '@/components/DesignSystem'

// ─── TYPES ────────────────────────────────────────────────────────
interface Category { id: string; name: string; slug: string; icon: string }

interface Variant {
  id?: string
  _localId: string          // ← clave estable para React (fix focus loss)
  product_id?: string
  variant_name: string
  sku: string | null
  quantity: number
  attributes: Record<string, string>
  cost_price: number
  shipping_cost: number
  final_cost: number
  market_price: number
  profit_margin: number
  is_default: boolean
  stock_status: string
  active: boolean
  sort_order: number
}

interface Product {
  id: string
  name: string; slug: string; sku: string | null
  category_id: string | null; category_name: string | null; category_icon: string | null
  subcategory: string | null; description: string | null; short_description: string | null
  price: number; discount_price: number | null
  stock_qty: number; stock_status: string; track_stock: boolean
  cover_image: string | null; images: string[]
  tags: string[]; custom_label: string | null; label_color: string
  whatsapp_message: string | null
  active: boolean; featured: boolean; visible_on_website: boolean
  total_orders: number; total_revenue: number
  created_at: string
  variants: Variant[]
  min_price: number; max_price: number
}

interface Order {
  id: string; order_number: string
  customer_name: string | null; customer_phone: string | null; customer_email: string | null
  items: any[]; subtotal: number; shipping_total: number; total: number
  status: string; source: string; notes: string | null
  created_at: string; updated_at: string; lead_id: string | null
}

// ─── CONSTANTS ────────────────────────────────────────────────────
const ORDER_STATUS: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  pending:       { label: 'Pendiente',     bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  confirmed:     { label: 'Confirmado',    bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
  in_production: { label: 'En producción', bg: '#f3e8ff', color: '#6b21a8', dot: '#9333ea' },
  ready:         { label: 'Listo',         bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  delivered:     { label: 'Entregado',     bg: '#d1fae5', color: '#064e3b', dot: '#10b981' },
  cancelled:     { label: 'Cancelado',     bg: '#fef2f2', color: '#991b1b', dot: '#ef4444' },
}

const STOCK_STATUS: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  in_stock:     { label: 'En stock',   bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  low_stock:    { label: 'Stock bajo', bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  out_of_stock: { label: 'Sin stock',  bg: '#fef2f2', color: '#991b1b', dot: '#ef4444' },
  unlimited:    { label: 'Ilimitado',  bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
}

const MOVE_TYPES: Record<string, { label: string; color: string }> = {
  restock:    { label: 'Restock',    color: '#16a34a' },
  sale:       { label: 'Venta',      color: '#dc2626' },
  adjustment: { label: 'Ajuste',     color: '#2552ca' },
  return:     { label: 'Devolución', color: '#7c3aed' },
  loss:       { label: 'Pérdida',    color: '#d97706' },
}

// Atributos cualitativos para variantes
const ATTR_PRESETS: Record<string, string[]> = {
  acabado:  ['Mate', 'Brillante', 'Satinado', 'UV', 'Soft Touch', 'Metálico'],
  material: ['PVC', 'Papel', 'Vinilo', 'Couché', 'Tela', 'Acrílico', 'Cartón'],
  color:    ['Negro', 'Blanco', 'Rojo', 'Azul', 'Verde', 'Transparente'],
  tamaño:   ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'A4', 'A5', 'Carta'],
  lados:    ['1 lado', '2 lados'],
}

function genId() { return `v_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }

function mkVariant(): Variant {
  return {
    _localId: genId(), variant_name: '', sku: null, quantity: 100,
    attributes: {}, cost_price: 0, shipping_cost: 6,
    final_cost: 6, market_price: 0, profit_margin: -6,
    is_default: false, stock_status: 'unlimited', active: true, sort_order: 0,
  }
}

const EMPTY_PRODUCT: Partial<Product & { variants: Variant[] }> = {
  name: '', slug: '', sku: '', category_id: null,
  description: '', short_description: '', price: 0,
  stock_qty: 0, stock_status: 'unlimited', track_stock: false,
  cover_image: '', images: [], tags: [],
  custom_label: '', label_color: '#2552ca', whatsapp_message: '',
  active: true, featured: false, visible_on_website: true,
  variants: [mkVariant()],
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ─── SHARED STYLES ─────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 11px', border: '1.5px solid #e2e8f0',
  borderRadius: 9, fontSize: 13, outline: 'none', background: '#fafafa',
  fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
}

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS — todos al nivel de módulo (NUNCA dentro del render)
// ═══════════════════════════════════════════════════════════════════

function SBadge({ status }: { status: string }) {
  const c = STOCK_STATUS[status] || STOCK_STATUS.unlimited
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: c.bg, color: c.color, fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot }} />{c.label}
    </span>
  )
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{children}</label>
}

// ─── CONFIRM MODAL ─────────────────────────────────────────────────
function ConfirmModal({ open, title, message, danger = false, confirmLabel = 'Confirmar', onConfirm, onCancel }: {
  open: boolean; title: string; message: string; danger?: boolean; confirmLabel?: string
  onConfirm: () => void; onCancel: () => void
}) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onCancel}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 30, maxWidth: 400, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: danger ? '#fef2f2' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={20} color={danger ? '#dc2626' : '#2552ca'} />
          </div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>{title}</h3>
        </div>
        <p style={{ margin: '0 0 22px', fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '9px 18px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}>Cancelar</button>
          <button onClick={onConfirm} style={{ padding: '9px 18px', border: 'none', borderRadius: 9, background: danger ? '#dc2626' : '#2552ca', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff' }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// ─── ATTR ADDER ────────────────────────────────────────────────────
function AttrAdder({ onAdd }: { onAdd: (key: string, val: string) => void }) {
  const [key, setKey] = useState('')
  const [val, setVal] = useState('')
  const presetKeys = Object.keys(ATTR_PRESETS)
  const valPresets = key && ATTR_PRESETS[key] ? ATTR_PRESETS[key] : []

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
        <select value={key} onChange={e => { setKey(e.target.value); setVal('') }}
          style={{ ...inp, width: 'auto', minWidth: 130, fontSize: 12, padding: '7px 10px' }}>
          <option value="">+ Tipo atributo</option>
          {presetKeys.map(p => <option key={p} value={p}>{p}</option>)}
          <option value="__custom__">Personalizado...</option>
        </select>
        {key === '__custom__' && (
          <input value={val} onChange={e => setKey(e.target.value === '__custom__' ? key : e.target.value)}
            placeholder="nombre atributo" style={{ ...inp, width: 130, fontSize: 12, padding: '7px 10px' }} />
        )}
        <input value={val} onChange={e => setVal(e.target.value)}
          placeholder="valor" style={{ ...inp, width: 130, fontSize: 12, padding: '7px 10px' }}
          list={`attrvals-${key}`} />
        {valPresets.length > 0 && (
          <datalist id={`attrvals-${key}`}>
            {valPresets.map(v => <option key={v} value={v} />)}
          </datalist>
        )}
        <button onClick={() => {
          const k = key === '__custom__' ? '' : key
          if (k && val) { onAdd(k, val); setVal('') }
        }} style={{ padding: '7px 13px', border: 'none', borderRadius: 8, background: '#7c3aed', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
          + Agregar
        </button>
      </div>
      {/* Quick chips for selected attribute */}
      {key && valPresets.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {valPresets.map(p => (
            <button key={p} type="button"
              onClick={() => { if (key && key !== '__custom__') { onAdd(key, p) } }}
              style={{ padding: '3px 9px', fontSize: 10, fontWeight: 600, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' }}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── VARIANT ROW ───────────────────────────────────────────────────
// CRÍTICO: definida al nivel de módulo, NUNCA dentro de otro componente
function VariantRow({ variant, index, onChange, onRemove, onSetDefault, isOnly }: {
  variant: Variant; index: number
  onChange: (localId: string, v: Variant) => void
  onRemove: (localId: string) => void
  onSetDefault: (localId: string) => void
  isOnly: boolean
}) {
  const [open, setOpen] = useState(index === 0)

  function upd(field: keyof Variant, val: any) {
    const u = { ...variant, [field]: val }
    if (field === 'cost_price' || field === 'shipping_cost') {
      u.final_cost = (Number(u.cost_price) || 0) + (Number(u.shipping_cost) || 0)
      u.profit_margin = (Number(u.market_price) || 0) - u.final_cost
    }
    if (field === 'market_price') {
      u.profit_margin = (Number(val) || 0) - (Number(u.final_cost) || 0)
    }
    onChange(variant._localId, u)
  }

  function updAttr(k: string, v: string) {
    onChange(variant._localId, { ...variant, attributes: { ...variant.attributes, [k]: v } })
  }
  function removeAttr(k: string) {
    const a = { ...variant.attributes }; delete a[k]
    onChange(variant._localId, { ...variant, attributes: a })
  }

  const margin = variant.profit_margin || 0
  const marginColor = margin > 0 ? '#16a34a' : margin < 0 ? '#dc2626' : '#64748b'
  const marginPct = variant.market_price > 0 ? ((margin / variant.market_price) * 100).toFixed(1) + '%' : '—'

  return (
    <div style={{ border: `2px solid ${variant.is_default ? '#7c3aed' : '#e2e8f0'}`, borderRadius: 12, overflow: 'hidden', background: variant.is_default ? '#faf5ff' : '#fafafa', marginBottom: 8 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setOpen(o => !o)}>
        <span style={{ color: '#cbd5e1', fontSize: 16 }}>⠿</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
            {variant.variant_name || `Variante ${index + 1}`}
          </span>
          {!open && (
            <span style={{ marginLeft: 10, fontSize: 12, color: '#64748b' }}>
              {variant.quantity} uds · <strong>${variant.market_price.toFixed(2)}</strong>
              {margin > 0 && <span style={{ color: marginColor, marginLeft: 6, fontWeight: 700 }}>+${margin.toFixed(2)} ({marginPct})</span>}
              {Object.entries(variant.attributes).slice(0, 2).map(([k, v]) => (
                <span key={k} style={{ marginLeft: 6, fontSize: 11, color: '#7c3aed' }}>{k}: {v}</span>
              ))}
            </span>
          )}
        </div>
        {variant.is_default && <span style={{ fontSize: 10, fontWeight: 800, background: '#7c3aed', color: '#fff', padding: '2px 8px', borderRadius: 6 }}>DEFAULT</span>}
        <button onClick={e => { e.stopPropagation(); onSetDefault(variant._localId) }}
          title="Marcar como predeterminada"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: variant.is_default ? '#f59e0b' : '#d1d5db', fontSize: 16 }}>★</button>
        {!isOnly && (
          <button onClick={e => { e.stopPropagation(); onRemove(variant._localId) }}
            style={{ background: '#fef2f2', border: 'none', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }}>
            <X size={13} />
          </button>
        )}
        {open ? <ChevronUp size={15} color="#94a3b8" /> : <ChevronDown size={15} color="#94a3b8" />}
      </div>

      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 12 }}>

            {/* Variant name */}
            <div style={{ gridColumn: 'span 2' }}>
              <Lbl>Nombre de la variante</Lbl>
              <input value={variant.variant_name} onChange={e => upd('variant_name', e.target.value)}
                placeholder="Ej: 1000 uds · Mate UV" style={inp} />
            </div>

            {/* Quantity */}
            <div>
              <Lbl>Cantidad (unidades)</Lbl>
              <input type="number" min="1" value={variant.quantity}
                onChange={e => upd('quantity', parseInt(e.target.value) || 0)} style={inp} />
            </div>

            {/* SKU */}
            <div>
              <Lbl>SKU variante</Lbl>
              <input value={variant.sku || ''} onChange={e => upd('sku', e.target.value || null)}
                placeholder="Opcional" style={inp} />
            </div>

            {/* Cost price */}
            <div>
              <Lbl>Costo producción ($)</Lbl>
              <input type="number" min="0" step="0.01" value={variant.cost_price}
                onChange={e => upd('cost_price', parseFloat(e.target.value) || 0)} style={inp} />
            </div>

            {/* Shipping */}
            <div>
              <Lbl>Costo envío ($)</Lbl>
              <input type="number" min="0" step="0.01" value={variant.shipping_cost}
                onChange={e => upd('shipping_cost', parseFloat(e.target.value) || 0)} style={inp} />
            </div>

            {/* Final cost readonly */}
            <div>
              <Lbl>Costo total (auto)</Lbl>
              <div style={{ ...inp, background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center' }}>
                ${((variant.cost_price || 0) + (variant.shipping_cost || 0)).toFixed(2)}
              </div>
            </div>

            {/* Market price */}
            <div>
              <Lbl>Precio venta público ($) *</Lbl>
              <input type="number" min="0" step="0.01" value={variant.market_price}
                onChange={e => upd('market_price', parseFloat(e.target.value) || 0)}
                style={{ ...inp, borderColor: variant.market_price > 0 ? '#e2e8f0' : '#fca5a5' }} />
            </div>

            {/* Margin */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ padding: '10px 14px', borderRadius: 10, background: margin > 0 ? '#f0fdf4' : margin < 0 ? '#fef2f2' : '#f8fafc', border: `1px solid ${margin > 0 ? '#bbf7d0' : margin < 0 ? '#fecaca' : '#e2e8f0'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Margen de ganancia</span>
                <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 16, fontWeight: 800, color: marginColor }}>${margin.toFixed(2)} ({marginPct})</span>
              </div>
            </div>

            {/* Stock status */}
            <div>
              <Lbl>Estado stock</Lbl>
              <select value={variant.stock_status} onChange={e => upd('stock_status', e.target.value)} style={inp}>
                <option value="unlimited">Ilimitado</option>
                <option value="in_stock">En stock</option>
                <option value="low_stock">Stock bajo</option>
                <option value="out_of_stock">Sin stock</option>
              </select>
            </div>

            {/* Sort order */}
            <div>
              <Lbl>Orden (menor = primero)</Lbl>
              <input type="number" value={variant.sort_order}
                onChange={e => upd('sort_order', parseInt(e.target.value) || 0)} style={inp} />
            </div>
          </div>

          {/* Attributes / Qualitative labels */}
          <div style={{ marginTop: 14 }}>
            <Lbl>Atributos cualitativos (acabado, material, color, talla…)</Lbl>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
              {Object.entries(variant.attributes).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ede9fe', borderRadius: 7, padding: '4px 10px', fontSize: 12 }}>
                  <span style={{ color: '#7c3aed', fontWeight: 700 }}>{k}:</span>
                  <input value={v} onChange={e => updAttr(k, e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: '#4c1d95', fontWeight: 600, width: `${Math.max(40, v.length * 8)}px` }} />
                  <button onClick={() => removeAttr(k)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                </div>
              ))}
            </div>
            <AttrAdder onAdd={updAttr} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PRODUCT CARD ──────────────────────────────────────────────────
function ProductCard({ product: p, onEdit, onDelete, onDuplicate, onToggleActive, onToggleFeatured }: {
  product: Product
  onEdit: () => void; onDelete: () => void; onDuplicate: () => void
  onToggleActive: () => void; onToggleFeatured: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const hasVariants = p.variants?.length > 0

  return (
    <div style={{ background: '#fff', border: `1px solid ${!hasVariants ? '#fde68a' : '#e2e8f0'}`, borderRadius: 15, overflow: 'hidden', boxShadow: SHADOWS.sm, opacity: p.active ? 1 : 0.65, position: 'relative' }}>
      <div style={{ height: 170, background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
        {p.cover_image
          ? <img src={p.cover_image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
          : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#d1d5db' }}><ImageIcon size={38} /></div>
        }
        {p.custom_label && <span style={{ position: 'absolute', top: 9, left: 9, background: p.label_color, color: '#fff', padding: '2px 8px', borderRadius: 100, fontSize: 9, fontWeight: 800 }}>{p.custom_label}</span>}
        {!hasVariants && <span style={{ position: 'absolute', top: 9, right: 9, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 100, fontSize: 9, fontWeight: 800 }}>⚠️ Sin precios</span>}
        <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
          <button onClick={() => setMenuOpen(m => !m)} style={{ background: 'rgba(0,0,0,.4)', border: 'none', borderRadius: 7, padding: '4px 7px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center' }}>
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div style={{ position: 'absolute', right: 0, bottom: '100%', zIndex: 50, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 11, boxShadow: '0 8px 28px rgba(0,0,0,.12)', minWidth: 160, padding: 5 }}
              onMouseLeave={() => setMenuOpen(false)}>
              {([
                ['✏️ Editar', onEdit],
                [p.active ? '🔴 Desactivar' : '🟢 Activar', onToggleActive],
                [p.featured ? '⭐ Quitar destacado' : '⭐ Destacar', onToggleFeatured],
                ['📋 Duplicar', onDuplicate],
                ['🗑️ Eliminar', onDelete],
              ] as [string, () => void][]).map(([label, fn]) => (
                <button key={label} onClick={() => { fn(); setMenuOpen(false) }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 11px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: label.includes('Eliminar') ? '#dc2626' : '#374151', borderRadius: 7 }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ padding: '12px 14px' }}>
        <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 2px', fontWeight: 700 }}>{p.category_icon} {p.category_name || 'Sin categoría'}</p>
        <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{p.name}</h4>
        {hasVariants ? (
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 17, fontWeight: 800, color: '#00113a' }}>
              {p.min_price === p.max_price ? `$${p.min_price.toFixed(2)}` : `$${p.min_price.toFixed(2)} – $${p.max_price.toFixed(2)}`}
            </span>
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>{p.variants.length} opciones</span>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, marginBottom: 6 }}>⚠️ Configura precios</p>
        )}
        {hasVariants && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
            {p.variants.slice(0, 3).map((v, i) => (
              <span key={i} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: '#f1f5f9', color: '#475569' }}>
                {v.quantity >= 1000 ? (v.quantity / 1000) + 'K' : v.quantity} uds · ${v.market_price.toFixed(0)}
                {Object.entries(v.attributes).slice(0, 1).map(([, val]) => ` · ${val}`)}
              </span>
            ))}
            {p.variants.length > 3 && <span style={{ fontSize: 10, color: '#94a3b8' }}>+{p.variants.length - 3} más</span>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {!p.active && <span style={{ fontSize: 9, fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '2px 7px', borderRadius: 5 }}>INACTIVO</span>}
          {!p.visible_on_website && <span style={{ fontSize: 9, fontWeight: 800, color: '#d97706', background: '#fef3c7', padding: '2px 7px', borderRadius: 5 }}>Oculto web</span>}
          {p.featured && <span style={{ fontSize: 9, fontWeight: 800, color: '#7c3aed', background: '#ede9fe', padding: '2px 7px', borderRadius: 5 }}>⭐ Destacado</span>}
        </div>
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid #f8fafc' }}>
        <button onClick={onEdit} style={{ flex: 1, padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f5f3ff')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Edit3 size={12} /> Editar
        </button>
        <div style={{ width: 1, background: '#f8fafc' }} />
        <button onClick={onDuplicate} style={{ flex: 1, padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Copy size={12} /> Duplicar
        </button>
      </div>
    </div>
  )
}

// ─── PRODUCT MODAL ─────────────────────────────────────────────────
// CRÍTICO: definido al nivel de módulo como componente de props
// Si estuviera dentro de CatalogoPage, React lo remontaría en cada render = focus loss
interface ProductModalProps {
  mode: 'create' | 'edit'
  editProduct: Partial<Product & { variants: Variant[] }>
  setEditProduct: React.Dispatch<React.SetStateAction<Partial<Product & { variants: Variant[] }>>>
  editVariants: Variant[]
  setEditVariants: React.Dispatch<React.SetStateAction<Variant[]>>
  categories: Category[]
  saving: boolean
  onClose: () => void
  onSave: () => void
  tagInput: string
  setTagInput: React.Dispatch<React.SetStateAction<string>>
  imageInput: string
  setImageInput: React.Dispatch<React.SetStateAction<string>>
}

function ProductModal({
  mode, editProduct, setEditProduct, editVariants, setEditVariants,
  categories, saving, onClose, onSave,
  tagInput, setTagInput, imageInput, setImageInput,
}: ProductModalProps) {

  const [activeTab, setActiveTab] = useState<'info' | 'variants' | 'media'>('info')

  function addVariant() {
    setEditVariants(prev => [...prev, { ...mkVariant(), sort_order: prev.length }])
  }
  function updateVariant(localId: string, v: Variant) {
    setEditVariants(prev => prev.map(item => item._localId === localId ? v : item))
  }
  function removeVariant(localId: string) {
    setEditVariants(prev => prev.filter(item => item._localId !== localId))
  }
  function setDefaultVariant(localId: string) {
    setEditVariants(prev => prev.map(v => ({ ...v, is_default: v._localId === localId })))
  }

  function ep(field: keyof typeof editProduct, val: any) {
    setEditProduct(p => ({ ...p, [field]: val }))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 800, maxHeight: '95vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 80px rgba(0,0,0,.35)' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#00113a,#002878)', padding: '18px 26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 800, margin: 0 }}>
              {mode === 'create' ? '+ Nuevo Producto' : '✏️ Editar Producto'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 11, margin: '3px 0 0' }}>
              Los precios se configuran por variante
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '6px 10px', fontSize: 16 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #f1f5f9', flexShrink: 0, background: '#fafafa' }}>
          {([['info', '📋 Información'], ['variants', '💰 Precios / Variantes'], ['media', '🖼️ Imágenes & Tags']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              style={{ padding: '11px 18px', border: 'none', borderBottom: `2px solid ${activeTab === id ? '#7c3aed' : 'transparent'}`, background: 'none', cursor: 'pointer', fontSize: 13, color: activeTab === id ? '#7c3aed' : '#94a3b8', fontWeight: activeTab === id ? 700 : 500, fontFamily: 'Manrope, sans-serif' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* TAB INFO */}
          {activeTab === 'info' && (
            <div style={{ padding: '22px 26px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <Lbl>Nombre del producto *</Lbl>
                  <input value={editProduct.name || ''} style={inp}
                    onChange={e => { ep('name', e.target.value); ep('slug', slugify(e.target.value)) }}
                    placeholder="Ej: Tarjetas de Presentación Premium" />
                </div>
                <div>
                  <Lbl>Slug (URL)</Lbl>
                  <input value={editProduct.slug || ''} style={inp} onChange={e => ep('slug', e.target.value)} />
                </div>
                <div>
                  <Lbl>SKU base</Lbl>
                  <input value={editProduct.sku || ''} style={inp} onChange={e => ep('sku', e.target.value)} placeholder="PROD-001" />
                </div>
                <div>
                  <Lbl>Categoría</Lbl>
                  <select value={editProduct.category_id || ''} style={inp} onChange={e => ep('category_id', e.target.value || null)}>
                    <option value="">— Sin categoría —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <Lbl>Subcategoría</Lbl>
                  <input value={editProduct.subcategory || ''} style={inp} onChange={e => ep('subcategory', e.target.value)} placeholder="Ej: Premium, Económico..." />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <Lbl>Descripción corta</Lbl>
                  <input value={editProduct.short_description || ''} style={inp} onChange={e => ep('short_description', e.target.value)} placeholder="Ej: 1000 uds · Papel 350g · Varios acabados" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <Lbl>Descripción completa</Lbl>
                  <textarea rows={4} value={editProduct.description || ''} style={{ ...inp, resize: 'vertical', minHeight: 80 }} onChange={e => ep('description', e.target.value)} placeholder="Describe el producto en detalle..." />
                </div>
                <div>
                  <Lbl>Etiqueta personalizada</Lbl>
                  <input value={editProduct.custom_label || ''} style={inp} onChange={e => ep('custom_label', e.target.value)} placeholder="Ej: ★ Más Vendido" />
                </div>
                <div>
                  <Lbl>Color etiqueta</Lbl>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="color" value={editProduct.label_color || '#2552ca'} onChange={e => ep('label_color', e.target.value)} style={{ width: 40, height: 38, border: 'none', cursor: 'pointer', borderRadius: 6, padding: 2 }} />
                    <input value={editProduct.label_color || '#2552ca'} style={{ ...inp, flex: 1 }} onChange={e => ep('label_color', e.target.value)} />
                  </div>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <Lbl>Mensaje WhatsApp personalizado</Lbl>
                  <textarea rows={2} value={editProduct.whatsapp_message || ''} style={{ ...inp, resize: 'vertical' }} onChange={e => ep('whatsapp_message', e.target.value)} placeholder="Hola Artia, me interesa {nombre} — {variant}." />
                </div>
                <div style={{ gridColumn: 'span 2', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {([['active', 'Activo', 'Visible en el sistema'], ['featured', 'Destacado', 'Sección destacados'], ['visible_on_website', 'Visible en web', 'Catálogo público']] as const).map(([field, label, sub]) => (
                    <label key={field} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '9px 13px', flex: '1 1 180px' }}>
                      <input type="checkbox" checked={!!editProduct[field]} onChange={e => ep(field, e.target.checked)} style={{ width: 15, height: 15, accentColor: '#7c3aed' }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{label}</div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>{sub}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB VARIANTS */}
          {activeTab === 'variants' && (
            <div style={{ padding: '22px 26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: '#0f172a' }}>Variantes de precio ({editVariants.length})</h3>
                  <p style={{ fontSize: 12, color: '#64748b', margin: '3px 0 0' }}>
                    Soporta atributos cualitativos (acabado, material, color, talla) y cuantitativos (cantidad). La ★ es la predeterminada.
                  </p>
                </div>
                <button onClick={addVariant} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', border: 'none', borderRadius: 9, background: '#7c3aed', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                  <Plus size={13} /> Agregar variante
                </button>
              </div>

              {editVariants.map((v, i) => (
                // ← key usa _localId estable, nunca index
                <VariantRow key={v._localId} variant={v} index={i}
                  onChange={updateVariant} onRemove={removeVariant}
                  onSetDefault={setDefaultVariant} isOnly={editVariants.length === 1} />
              ))}

              {/* Summary table */}
              {editVariants.length > 1 && (
                <div style={{ marginTop: 16, background: '#f8fafc', borderRadius: 12, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <div style={{ padding: '10px 16px', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px' }}>Resumen de precios</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#fafafa' }}>
                        {['Variante', 'Cantidad', 'Atributos', 'Costo total', 'Venta', 'Margen'].map(h => (
                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.3px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {editVariants.map((v, i) => {
                        const fc = (v.cost_price || 0) + (v.shipping_cost || 0)
                        const mg = (v.market_price || 0) - fc
                        const pct = v.market_price > 0 ? ((mg / v.market_price) * 100).toFixed(1) + '%' : '—'
                        return (
                          <tr key={v._localId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                              {v.variant_name || `Variante ${i + 1}`}
                              {v.is_default && <span style={{ marginLeft: 6, fontSize: 9, background: '#7c3aed', color: '#fff', padding: '1px 5px', borderRadius: 4, fontWeight: 800 }}>DEFAULT</span>}
                            </td>
                            <td style={{ padding: '8px 12px', fontSize: 12 }}>{v.quantity} uds</td>
                            <td style={{ padding: '8px 12px', fontSize: 11, color: '#7c3aed' }}>
                              {Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(' · ') || '—'}
                            </td>
                            <td style={{ padding: '8px 12px', fontSize: 12, color: '#dc2626' }}>${fc.toFixed(2)}</td>
                            <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 800, color: '#0f172a' }}>${(v.market_price || 0).toFixed(2)}</td>
                            <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, color: mg > 0 ? '#16a34a' : '#dc2626' }}>${mg.toFixed(2)} ({pct})</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB MEDIA */}
          {activeTab === 'media' && (
            <div style={{ padding: '22px 26px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <Lbl>URL imagen principal</Lbl>
                  <input value={editProduct.cover_image || ''} style={inp} onChange={e => ep('cover_image', e.target.value)} placeholder="https://..." />
                  {editProduct.cover_image && <img src={editProduct.cover_image} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, marginTop: 8, border: '1px solid #e2e8f0' }} />}
                </div>
                <div>
                  <Lbl>Galería de imágenes (URLs adicionales)</Lbl>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={imageInput} onChange={e => setImageInput(e.target.value)}
                      placeholder="https://... Enter para agregar" style={{ ...inp, flex: 1 }}
                      onKeyDown={e => { if (e.key === 'Enter' && imageInput.trim()) { ep('images', [...(editProduct.images || []), imageInput.trim()]); setImageInput('') } }} />
                    <button onClick={() => { if (imageInput.trim()) { ep('images', [...(editProduct.images || []), imageInput.trim()]); setImageInput('') } }}
                      style={{ padding: '0 14px', background: '#00113a', color: '#fff', border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>+ Agregar</button>
                  </div>
                  {(editProduct.images || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      {(editProduct.images || []).map((url, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                          <button onClick={() => ep('images', editProduct.images?.filter((_, j) => j !== i))}
                            style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Lbl>Tags (Enter para agregar)</Lbl>
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)} style={inp}
                    placeholder="Escribe un tag y presiona Enter..."
                    onKeyDown={e => { if (e.key === 'Enter' && tagInput.trim()) { ep('tags', [...(editProduct.tags || []), tagInput.trim()]); setTagInput('') } }} />
                  {(editProduct.tags || []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {(editProduct.tags || []).map((tag, i) => (
                        <span key={i} style={{ background: '#ede9fe', color: '#5b21b6', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                          {tag}
                          <button onClick={() => ep('tags', editProduct.tags?.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 26px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa', flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>{editVariants.length} variante{editVariants.length !== 1 ? 's' : ''} configurada{editVariants.length !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '9px 18px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#64748b' }}>Cancelar</button>
            <button onClick={onSave} disabled={saving} style={{ padding: '9px 22px', border: 'none', borderRadius: 10, background: saving ? '#94a3b8' : 'linear-gradient(135deg,#00113a,#2552ca)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              {saving ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : <><Save size={13} /> Guardar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── EDIT ORDER MODAL ──────────────────────────────────────────────
function EditOrderModal({ order, onClose, onSave }: {
  order: Order; onClose: () => void
  onSave: (data: Partial<Order>) => Promise<void>
}) {
  const [customerName,  setCN] = useState(order.customer_name || '')
  const [customerPhone, setCP] = useState(order.customer_phone || '')
  const [customerEmail, setCE] = useState(order.customer_email || '')
  const [notes,         setNO] = useState(order.notes || '')
  const [status,        setST] = useState(order.status)
  const [items,         setIT] = useState<any[]>((order.items || []).map(i => ({ ...i })))
  const [saving,        setSV] = useState(false)

  function updQty(idx: number, delta: number) {
    setIT(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const newQty = Math.max(1, item.qty + delta)
      return { ...item, qty: newQty, subtotal: newQty * item.unit_price }
    }))
  }
  function updPrice(idx: number, price: number) {
    setIT(prev => prev.map((item, i) => i !== idx ? item : { ...item, unit_price: price, subtotal: item.qty * price }))
  }
  function rmItem(idx: number) { setIT(prev => prev.filter((_, i) => i !== idx)) }

  const total = items.reduce((s, i) => s + i.subtotal, 0)

  async function handleSave() {
    setSV(true)
    await onSave({ customer_name: customerName || null, customer_phone: customerPhone || null, customer_email: customerEmail || null, notes: notes || null, status, items, subtotal: total, total })
    setSV(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2500, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 640, boxShadow: '0 20px 60px rgba(0,0,0,.3)', marginTop: 20 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Editar Pedido</h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>{order.order_number}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><XCircle size={22} /></button>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>Cliente</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><Lbl>Nombre</Lbl><input value={customerName} onChange={e => setCN(e.target.value)} style={inp} placeholder="Nombre" /></div>
              <div><Lbl>Teléfono</Lbl><input value={customerPhone} onChange={e => setCP(e.target.value)} style={inp} placeholder="+593..." /></div>
              <div style={{ gridColumn: '1/-1' }}><Lbl>Email</Lbl><input value={customerEmail} onChange={e => setCE(e.target.value)} style={inp} placeholder="email@..." /></div>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>Productos</p>
            {items.map((item, idx) => (
              <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 11, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
                  {item.variant_name && <div style={{ fontSize: 11, color: '#64748b' }}>{item.variant_name}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>$</span>
                  <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updPrice(idx, parseFloat(e.target.value) || 0)} style={{ ...inp, width: 80, textAlign: 'right' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => updQty(idx, -1)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={12} /></button>
                  <span style={{ fontSize: 14, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{item.qty}</span>
                  <button onClick={() => updQty(idx, 1)} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} /></button>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, minWidth: 70, textAlign: 'right' }}>${item.subtotal.toFixed(2)}</div>
                <button onClick={() => rmItem(idx)} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '5px 7px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
            <div>
              <Lbl>Estado</Lbl>
              <select value={status} onChange={e => setST(e.target.value)} style={inp}>
                {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <Lbl>Total recalculado</Lbl>
              <div style={{ ...inp, background: '#f1f5f9', fontFamily: 'Manrope, sans-serif', fontSize: 18, fontWeight: 800, color: '#00113a', display: 'flex', alignItems: 'center' }}>${total.toFixed(2)}</div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <Lbl>Notas</Lbl>
            <textarea value={notes} onChange={e => setNO(e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Notas adicionales..." />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 22px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving || !items.length} style={{ padding: '10px 22px', border: 'none', borderRadius: 9, background: '#2552ca', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', opacity: saving ? .7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={14} /> {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MANUAL MOVEMENT MODAL ─────────────────────────────────────────
function MovementModal({ products, onClose, onSave }: {
  products: Product[]
  onClose: () => void
  onSave: (data: { product_id: string; type: string; qty: number; notes: string }) => Promise<void>
}) {
  const [search,    setSearch]    = useState('')
  const [productId, setProductId] = useState('')
  const [type,      setType]      = useState('restock')
  const [qty,       setQty]       = useState(1)
  const [notes,     setNotes]     = useState('')
  const [saving,    setSaving]    = useState(false)

  const filtered = products.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase()))
  const selected = products.find(p => p.id === productId)

  async function handleSave() {
    if (!productId) return
    setSaving(true)
    await onSave({ product_id: productId, type, qty, notes })
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2500, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Movimiento Manual</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><XCircle size={22} /></button>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 14 }}>
            <Lbl>Producto *</Lbl>
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto..." style={{ ...inp, paddingLeft: 32 }} />
            </div>
            {/* Scrollable list — no native select que falla */}
            <div style={{ border: '1.5px solid #e2e8f0', borderRadius: 9, maxHeight: 180, overflowY: 'auto' }}>
              {filtered.length === 0
                ? <div style={{ padding: '14px 16px', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>Sin resultados</div>
                : filtered.map(p => (
                  <div key={p.id} onClick={() => setProductId(p.id)}
                    style={{ padding: '10px 14px', cursor: 'pointer', background: productId === p.id ? '#eff6ff' : '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: productId === p.id ? 700 : 500, color: '#0f172a' }}>{p.name}</div>
                      {p.sku && <div style={{ fontSize: 11, color: '#94a3b8' }}>SKU: {p.sku}</div>}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', textAlign: 'right', fontWeight: 700 }}>Stock: {p.stock_qty}</div>
                  </div>
                ))}
            </div>
            {selected && <div style={{ marginTop: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: '#1e40af', fontWeight: 600 }}>✓ {selected.name} (stock actual: {selected.stock_qty})</div>}
          </div>

          <div style={{ marginBottom: 14 }}>
            <Lbl>Tipo de movimiento</Lbl>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(MOVE_TYPES).map(([k, cfg]) => (
                <button key={k} onClick={() => setType(k)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: `1.5px solid ${type === k ? cfg.color : '#e2e8f0'}`, background: type === k ? `${cfg.color}18` : '#fff', color: type === k ? cfg.color : '#64748b', cursor: 'pointer' }}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <Lbl>Cantidad</Lbl>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 36, height: 36, border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={14} /></button>
              <input type="number" min="1" value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inp, width: 100, textAlign: 'center', fontWeight: 700, fontSize: 16 }} />
              <button onClick={() => setQty(q => q + 1)} style={{ width: 36, height: 36, border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={14} /></button>
            </div>
            {selected && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                {selected.stock_qty} → <strong style={{ color: ['sale', 'loss'].includes(type) ? '#dc2626' : '#16a34a' }}>
                  {['sale', 'loss'].includes(type) ? selected.stock_qty - qty : selected.stock_qty + qty}
                </strong>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <Lbl>Notas</Lbl>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Motivo del movimiento..." />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 22px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569' }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving || !productId} style={{ padding: '10px 22px', border: 'none', borderRadius: 9, background: '#2552ca', cursor: !productId ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', opacity: !productId ? .6 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={14} /> {saving ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════
const pagBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px',
  border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff',
  cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#475569',
}

export default function CatalogoPage() {
  const supabase = createClient()

  const [tab,        setTab]        = useState<'products' | 'orders' | 'inventory' | 'analytics'>('products')
  const [products,   setProducts]   = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [orders,     setOrders]     = useState<Order[]>([])
  const [inventory,  setInventory]  = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)

  const [search,       setSearch]       = useState('')
  const [filterCat,    setFilterCat]    = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page,         setPage]         = useState(1)
  const PER_PAGE = 12

  const [modal,        setModal]        = useState<'create' | 'edit' | 'delete' | null>(null)
  const [editProduct,  setEditProduct]  = useState<Partial<Product & { variants: Variant[] }>>(EMPTY_PRODUCT)
  const [editVariants, setEditVariants] = useState<Variant[]>([mkVariant()])
  const [deletingId,   setDeletingId]   = useState<string | null>(null)
  const [tagInput,     setTagInput]     = useState('')
  const [imageInput,   setImageInput]   = useState('')
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null)

  // Orders
  const [editOrder,    setEditOrder]    = useState<Order | null>(null)
  const [deleteOrder,  setDeleteOrder]  = useState<Order | null>(null)

  // Inventory
  const [showMoveModal, setShowMoveModal] = useState(false)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3500)
  }

  // ─── FETCH ───────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: prods }, { data: cats }, { data: ords }, { data: inv }, { data: vars }] = await Promise.all([
        supabase.from('catalog_products').select('*').order('created_at', { ascending: false }),
        supabase.from('catalog_categories').select('*').eq('active', true).order('sort_order'),
        supabase.from('catalog_orders').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('inventory_movements').select('*, catalog_products(name)').order('created_at', { ascending: false }).limit(300),
        supabase.from('product_variants').select('*').eq('active', true).order('sort_order'),
      ])

      const varMap: Record<string, Variant[]> = {}
      ;(vars || []).forEach((v: any) => {
        // Assign stable _localId for existing variants
        const withId = { ...v, _localId: v.id || genId() }
        if (!varMap[v.product_id]) varMap[v.product_id] = []
        varMap[v.product_id].push(withId)
      })

      const merged = (prods || []).map((p: any) => ({
        ...p,
        variants: varMap[p.id] || [],
        min_price: varMap[p.id]?.length ? Math.min(...varMap[p.id].map(v => v.market_price)) : p.price,
        max_price: varMap[p.id]?.length ? Math.max(...varMap[p.id].map(v => v.market_price)) : p.price,
      }))

      setProducts(merged)
      setCategories(cats || [])
      setOrders(ords || [])
      setInventory(inv || [])
    } catch (e) {
      showToast('Error cargando datos', false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ─── FILTERS ─────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    const ms = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku?.toLowerCase().includes(search.toLowerCase()))
    const mc = filterCat === 'all' || p.category_id === filterCat
    const mst = filterStatus === 'all'
      || (filterStatus === 'active' && p.active)
      || (filterStatus === 'inactive' && !p.active)
      || (filterStatus === 'featured' && p.featured)
      || (filterStatus === 'no_price' && !p.variants?.length)
    return ms && mc && mst
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  // ─── SAVE PRODUCT ─────────────────────────────────────────────────
  async function saveProduct() {
    if (!editProduct.name) { showToast('El nombre es obligatorio', false); return }
    if (!editVariants.length) { showToast('Agrega al menos una variante', false); return }
    if (editVariants.some(v => !v.market_price)) { showToast('Todos los precios de venta son obligatorios', false); return }

    setSaving(true)
    try {
      const defVar = editVariants.find(v => v.is_default) || editVariants[0]
      const basePrice = defVar?.market_price || 0

      const productPayload = {
        name: editProduct.name,
        slug: editProduct.slug || slugify(editProduct.name!),
        sku: editProduct.sku || null,
        category_id: editProduct.category_id || null,
        subcategory: editProduct.subcategory || null,
        description: editProduct.description || null,
        short_description: editProduct.short_description || null,
        price: basePrice,
        discount_price: null,
        stock_qty: 0,
        stock_status: 'unlimited',
        track_stock: false,
        cover_image: editProduct.cover_image || null,
        images: editProduct.images || [],
        tags: editProduct.tags || [],
        custom_label: editProduct.custom_label || null,
        label_color: editProduct.label_color || '#2552ca',
        whatsapp_message: editProduct.whatsapp_message || null,
        active: editProduct.active ?? true,
        featured: editProduct.featured ?? false,
        visible_on_website: editProduct.visible_on_website ?? true,
      }

      let productId: string

      if (modal === 'create') {
        const { data, error } = await supabase.from('catalog_products').insert(productPayload).select('id').single()
        if (error) throw error
        productId = data.id
      } else {
        productId = editProduct.id!
        const { error } = await supabase.from('catalog_products').update(productPayload).eq('id', productId)
        if (error) throw error
        await supabase.from('product_variants').delete().eq('product_id', productId)
      }

      const variantPayload = editVariants.map((v, i) => ({
        product_id:    productId,
        variant_name:  v.variant_name,
        sku:           v.sku || null,
        quantity:      v.quantity,
        attributes:    v.attributes || {},
        cost_price:    v.cost_price,
        shipping_cost: v.shipping_cost,
        market_price:  v.market_price,
        is_default:    v.is_default,
        stock_status:  v.stock_status || 'unlimited',
        active:        true,
        sort_order:    i,
      }))

      const { error: varErr } = await supabase.from('product_variants').insert(variantPayload)
      if (varErr) throw varErr

      showToast(modal === 'create' ? 'Producto creado ✓' : 'Producto actualizado ✓')
      setModal(null)
      setEditProduct(EMPTY_PRODUCT)
      setEditVariants([mkVariant()])
      fetchAll()
    } catch (e: any) {
      showToast(e.message || 'Error guardando', false)
    } finally {
      setSaving(false)
    }
  }

  // ─── DELETE PRODUCT ───────────────────────────────────────────────
  async function deleteProduct() {
    if (!deletingId) return
    setSaving(true)
    const { error } = await supabase.from('catalog_products').delete().eq('id', deletingId)
    if (!error) { showToast('Producto eliminado'); setModal(null); setDeletingId(null); fetchAll() }
    else showToast('Error eliminando', false)
    setSaving(false)
  }

  async function toggleField(id: string, field: 'active' | 'featured' | 'visible_on_website', val: boolean) {
    await supabase.from('catalog_products').update({ [field]: !val }).eq('id', id)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: !val } : p))
  }

  // ─── DUPLICATE PRODUCT (FIXED) ────────────────────────────────────
  async function duplicateProduct(p: Product) {
    try {
      // 1. Fetch from DB directly to get clean data (not the merged/computed version)
      const { data: orig, error: fetchErr } = await supabase
        .from('catalog_products').select('*').eq('id', p.id).single()
      if (fetchErr || !orig) throw new Error(fetchErr?.message || 'No se encontró el producto')

      // 2. Unique slug with collision check
      const baseSlug = orig.slug || slugify(orig.name)
      let newSlug = `${baseSlug}-copia`
      for (let attempt = 2; attempt <= 25; attempt++) {
        const { data: existing } = await supabase.from('catalog_products').select('id').eq('slug', newSlug).maybeSingle()
        if (!existing) break
        newSlug = `${baseSlug}-copia-${attempt}`
      }

      // 3. Strip auto-generated / computed fields
      const { id: _id, slug: _s, created_at: _ca, updated_at: _ua,
        total_orders: _to, total_revenue: _tr, folio_num: _fn, ...cloneData } = orig

      // 4. Insert clone
      const { data: newProd, error: insertErr } = await supabase
        .from('catalog_products')
        .insert({ ...cloneData, name: `${orig.name} (Copia)`, slug: newSlug, active: false, featured: false, total_orders: 0, total_revenue: 0 })
        .select('id').single()
      if (insertErr || !newProd) throw new Error(insertErr?.message || 'Error al insertar copia')

      // 5. Clone variants
      const { data: variants } = await supabase.from('product_variants').select('*').eq('product_id', p.id)
      if (variants?.length) {
        const cloned = variants.map(({ id: _vid, created_at: _vca, updated_at: _vua, ...v }: any) => ({ ...v, product_id: newProd.id }))
        const { error: varErr } = await supabase.from('product_variants').insert(cloned)
        if (varErr) console.warn('Variantes no clonadas:', varErr.message)
      }

      showToast('Duplicado correctamente ✓ (inactivo)')
      fetchAll()
    } catch (e: any) {
      showToast(e.message || 'Error duplicando', false)
    }
  }

  // ─── ORDERS ───────────────────────────────────────────────────────
  async function updateOrderStatus(id: string, status: string) {
    await supabase.from('catalog_orders').update({ status }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  async function handleSaveOrder(data: Partial<Order>) {
    if (!editOrder) return
    const { error } = await supabase.from('catalog_orders')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', editOrder.id)
    if (!error) {
      setOrders(prev => prev.map(o => o.id === editOrder.id ? { ...o, ...data } : o))
      setEditOrder(null)
      showToast('Pedido actualizado ✓')
    } else {
      showToast('Error al guardar pedido', false)
    }
  }

  async function handleDeleteOrder() {
    if (!deleteOrder) return
    const { error } = await supabase.from('catalog_orders').delete().eq('id', deleteOrder.id)
    if (!error) {
      setOrders(prev => prev.filter(o => o.id !== deleteOrder.id))
      setDeleteOrder(null)
      showToast('Pedido eliminado')
    } else {
      showToast('Error al eliminar pedido', false)
    }
  }

  // ─── INVENTORY ────────────────────────────────────────────────────
  async function handleCreateMovement(data: { product_id: string; type: string; qty: number; notes: string }) {
    const product = products.find(p => p.id === data.product_id)
    if (!product) return

    const isNeg = ['sale', 'loss'].includes(data.type)
    const qtyChange = isNeg ? -data.qty : data.qty
    const qtyBefore = product.stock_qty
    const qtyAfter = Math.max(0, qtyBefore + qtyChange)
    const newStatus = qtyAfter === 0 ? 'out_of_stock' : qtyAfter <= 5 ? 'low_stock' : 'in_stock'

    const { error } = await supabase.from('inventory_movements').insert({
      product_id: data.product_id, type: data.type, qty_change: qtyChange,
      qty_before: qtyBefore, qty_after: qtyAfter,
      notes: data.notes || null, created_by: 'admin',
    })

    if (error) { showToast('Error registrando movimiento', false); return }

    if (product.track_stock) {
      await supabase.from('catalog_products').update({ stock_qty: qtyAfter, stock_status: newStatus }).eq('id', data.product_id)
    }

    showToast('Movimiento registrado ✓')
    setShowMoveModal(false)
    fetchAll()
  }

  // ─── STATS ────────────────────────────────────────────────────────
  const stats = {
    total:      products.length,
    active:     products.filter(p => p.active).length,
    noVariants: products.filter(p => !p.variants?.length).length,
    featured:   products.filter(p => p.featured).length,
    revenue:    products.reduce((s, p) => s + p.total_revenue, 0),
    pending:    orders.filter(o => o.status === 'pending').length,
  }

  // ─── RENDER ───────────────────────────────────────────────────────
  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', padding: 24, fontFamily: 'Inter, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 4000, background: toast.ok ? '#00113a' : '#ef4444', color: '#fff', padding: '12px 18px', borderRadius: 12, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,.25)', display: 'flex', alignItems: 'center', gap: 8, animation: 'artiaFadeIn .3s ease' }}>
          {toast.ok ? <CheckCircle size={15} /> : <XCircle size={15} />} {toast.msg}
        </div>
      )}

      {/* ── MODALS ── */}

      {/* Product form — componente estable, sin focus loss */}
      {(modal === 'create' || modal === 'edit') && (
        <ProductModal
          mode={modal}
          editProduct={editProduct}
          setEditProduct={setEditProduct}
          editVariants={editVariants}
          setEditVariants={setEditVariants}
          categories={categories}
          saving={saving}
          onClose={() => { setModal(null); setEditProduct(EMPTY_PRODUCT); setEditVariants([mkVariant()]) }}
          onSave={saveProduct}
          tagInput={tagInput}
          setTagInput={setTagInput}
          imageInput={imageInput}
          setImageInput={setImageInput}
        />
      )}

      {/* Delete product */}
      <ConfirmModal
        open={modal === 'delete'}
        title="Eliminar producto"
        message="¿Estás seguro? Se eliminarán también todas las variantes. Esta acción no se puede deshacer."
        danger confirmLabel="Sí, eliminar"
        onConfirm={deleteProduct}
        onCancel={() => { setModal(null); setDeletingId(null) }}
      />

      {/* Edit order */}
      {editOrder && (
        <EditOrderModal
          order={editOrder}
          onClose={() => setEditOrder(null)}
          onSave={handleSaveOrder}
        />
      )}

      {/* Delete order */}
      <ConfirmModal
        open={!!deleteOrder}
        title="Eliminar pedido"
        message={`¿Eliminar el pedido ${deleteOrder?.order_number}? Esta acción no se puede deshacer.`}
        danger confirmLabel="Eliminar"
        onConfirm={handleDeleteOrder}
        onCancel={() => setDeleteOrder(null)}
      />

      {/* Manual movement */}
      {showMoveModal && (
        <MovementModal
          products={products}
          onClose={() => setShowMoveModal(false)}
          onSave={handleCreateMovement}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={24} color="#7c3aed" /> Catálogo & Inventario
          </h1>
          <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
            {stats.total} productos · {stats.pending} pedidos pendientes
            {stats.noVariants > 0 && <span style={{ color: '#f59e0b', marginLeft: 8 }}>⚠️ {stats.noVariants} sin precios</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchAll} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', border: '1px solid #e2e8f0', borderRadius: 9, background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748b' }}>
            <RefreshCw size={13} /> Actualizar
          </button>
          <button
            onClick={() => { setEditProduct({ ...EMPTY_PRODUCT }); setEditVariants([mkVariant()]); setModal('create') }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: 'none', borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#fff', boxShadow: '0 4px 14px rgba(124,58,237,.3)' }}>
            <Plus size={14} /> Nuevo Producto
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 22 }}>
        {[
          { label: 'Total',       value: stats.total,            icon: <Package size={17} />,       color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Activos',     value: stats.active,           icon: <CheckCircle size={17} />,   color: '#16a34a', bg: '#dcfce7' },
          { label: 'Sin precios', value: stats.noVariants,       icon: <AlertTriangle size={17} />, color: '#d97706', bg: '#fef3c7' },
          { label: 'Pedidos',     value: stats.pending,          icon: <ShoppingCart size={17} />,  color: '#2552ca', bg: '#dbeafe' },
          { label: 'Ingresos',    value: fmtMoney(stats.revenue),icon: <DollarSign size={17} />,   color: '#0f172a', bg: '#f1f5f9', isText: true },
        ].map((s, i) => (
          <div key={i} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 13, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: SHADOWS.sm }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: s.bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: (s as any).isText ? 13 : 21, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 18, borderBottom: '1px solid #e2e8f0' }}>
        {([
          ['products', 'Productos', <Package size={14} />],
          ['orders', `Pedidos${stats.pending > 0 ? ` (${stats.pending})` : ''}`, <ShoppingCart size={14} />],
          ['inventory', 'Movimientos', <Layers size={14} />],
          ['analytics', 'Analítica', <BarChart3 size={14} />],
        ] as [string, string, any][]).map(([id, label, icon]) => (
          <button key={id} onClick={() => setTab(id as any)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 15px', border: 'none', borderBottom: tab === id ? '2px solid #7c3aed' : '2px solid transparent', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === id ? 700 : 500, color: tab === id ? '#7c3aed' : '#64748b', marginBottom: -1 }}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* ── PRODUCTS TAB ── */}
      {tab === 'products' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Buscar..." style={{ ...inp, paddingLeft: 32 }} />
            </div>
            <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1) }}
              style={{ ...inp, width: 'auto', minWidth: 150 }}>
              <option value="all">Todas las categorías</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
              style={{ ...inp, width: 'auto', minWidth: 140 }}>
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="featured">Destacados</option>
              <option value="no_price">Sin precios</option>
            </select>
          </div>

          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>{filtered.length} productos {search || filterCat !== 'all' ? '(filtrados)' : ''}</p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
              <RefreshCw size={26} style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: 10 }}>Cargando...</p>
            </div>
          ) : paginated.length === 0 ? (
            <EmptyState icon="📦" title="Sin productos" subtitle='Crea tu primer producto con "+ Nuevo Producto"' />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(255px,1fr))', gap: 14 }}>
              {paginated.map(p => (
                <ProductCard key={p.id} product={p}
                  onEdit={() => {
                    const variantsWithLocalId = (p.variants?.length ? [...p.variants] : [mkVariant()]).map(v => ({
                      ...v,
                      _localId: (v as any)._localId || (v as any).id || genId(),
                    }))
                    setEditProduct(p)
                    setEditVariants(variantsWithLocalId)
                    setModal('edit')
                  }}
                  onDelete={() => { setDeletingId(p.id); setModal('delete') }}
                  onDuplicate={() => duplicateProduct(p)}
                  onToggleActive={() => toggleField(p.id, 'active', p.active)}
                  onToggleFeatured={() => toggleField(p.id, 'featured', p.featured)}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 22, flexWrap: 'wrap' }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ ...pagBtn, opacity: page === 1 ? .4 : 1 }}>← Anterior</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setPage(n)} style={{ ...pagBtn, background: page === n ? '#7c3aed' : '#fff', color: page === n ? '#fff' : '#475569', borderColor: page === n ? '#7c3aed' : '#e2e8f0' }}>{n}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ ...pagBtn, opacity: page === totalPages ? .4 : 1 }}>Siguiente →</button>
            </div>
          )}
        </>
      )}

      {/* ── ORDERS TAB ── */}
      {tab === 'orders' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Pedidos del catálogo ({orders.length})</h3>
          </div>
          {orders.length === 0 ? (
            <EmptyState icon="🛒" title="Sin pedidos" subtitle="Los pedidos del catálogo aparecerán aquí" />
          ) : (
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['# Pedido', 'Cliente', 'Productos', 'Total', 'Estado', 'Fecha', 'Acciones'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#7c3aed', whiteSpace: 'nowrap' }}>{o.order_number}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{o.customer_name || '—'}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{o.customer_phone || o.customer_email || ''}</div>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 12, color: '#475569' }}>{Array.isArray(o.items) ? `${o.items.length} ítem(s)` : '—'}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtMoney(o.total)}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)}
                            style={{ fontSize: 11, fontWeight: 700, padding: '4px 7px', borderRadius: 6, border: '1px solid #e2e8f0', cursor: 'pointer', background: ORDER_STATUS[o.status]?.bg || '#f8fafc', color: ORDER_STATUS[o.status]?.color || '#475569', outline: 'none' }}>
                            {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtDate(o.created_at)}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setEditOrder(o)} title="Editar pedido"
                              style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#2552ca' }}>
                              <Pencil size={13} />
                            </button>
                            {o.lead_id && (
                              <a href={`/admin/leads?lead=${o.lead_id}`} title="Ver lead CRM"
                                style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 7, padding: '5px 8px', display: 'flex', alignItems: 'center', color: '#2552ca', textDecoration: 'none' }}>
                                <Eye size={13} />
                              </a>
                            )}
                            <button onClick={() => setDeleteOrder(o)} title="Eliminar pedido"
                              style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#dc2626' }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── INVENTORY TAB ── */}
      {tab === 'inventory' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Movimientos de inventario ({inventory.length})</h3>
            <button onClick={() => setShowMoveModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', border: 'none', borderRadius: 9, background: '#2552ca', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              <Plus size={13} /> Movimiento manual
            </button>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
            {inventory.length === 0 ? (
              <EmptyState icon="📋" title="Sin movimientos" subtitle="Los movimientos de inventario aparecerán aquí" />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Producto', 'Tipo', 'Cambio', 'Antes', 'Después', 'Notas', 'Fecha'].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((m: any) => {
                      const cfg = MOVE_TYPES[m.type] || { label: m.type, color: '#64748b' }
                      return (
                        <tr key={m.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{m.catalog_products?.name || '—'}</td>
                          <td style={{ padding: '9px 14px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 800, background: `${cfg.color}18`, color: cfg.color }}>{cfg.label}</span>
                          </td>
                          <td style={{ padding: '9px 14px', fontWeight: 700, fontSize: 14, color: m.qty_change > 0 ? '#16a34a' : '#dc2626' }}>{m.qty_change > 0 ? '+' : ''}{m.qty_change}</td>
                          <td style={{ padding: '9px 14px', fontSize: 12, color: '#475569' }}>{m.qty_before}</td>
                          <td style={{ padding: '9px 14px', fontSize: 12, color: '#475569' }}>{m.qty_after}</td>
                          <td style={{ padding: '9px 14px', fontSize: 11, color: '#64748b' }}>{m.notes || '—'}</td>
                          <td style={{ padding: '9px 14px', fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtDate(m.created_at)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {tab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22, gridColumn: 'span 2' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>Productos más vendidos</h3>
            {products.filter(p => p.total_orders > 0).sort((a, b) => b.total_orders - a.total_orders).slice(0, 8).map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ width: 20, fontSize: 11, fontWeight: 800, color: '#94a3b8' }}>#{i + 1}</span>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f1f5f9', overflow: 'hidden', flexShrink: 0 }}>
                  {p.cover_image && <img src={p.cover_image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{p.total_orders} pedidos · {fmtMoney(p.total_revenue)}</div>
                </div>
                <div style={{ height: 5, width: 90, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#7c3aed', borderRadius: 3, width: `${Math.min(100, (p.total_orders / (products[0]?.total_orders || 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
            {products.every(p => p.total_orders === 0) && <p style={{ color: '#94a3b8', fontSize: 13 }}>Sin pedidos aún.</p>}
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22 }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="#7c3aed" /> Márgenes por producto
            </h3>
            {products.slice(0, 8).map(p => {
              const vars = p.variants || []
              if (!vars.length) return null
              const avgMargin = vars.reduce((s, v) => s + (v.profit_margin || 0), 0) / vars.length
              const avgPct = vars.reduce((s, v) => s + (v.market_price > 0 ? (v.profit_margin / v.market_price) * 100 : 0), 0) / vars.length
              return (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: '#f8fafc' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', flex: 1 }}>{p.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: avgMargin > 0 ? '#16a34a' : '#dc2626' }}>
                    ${avgMargin.toFixed(2)} ({avgPct.toFixed(1)}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes artiaFadeIn { from { opacity:0;transform:translateY(-8px); } to { opacity:1;transform:translateY(0); } }
      `}</style>
    </div>
  )
}