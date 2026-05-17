'use client'
// app/admin/catalogo/page.tsx — v2 con gestión completa de variantes

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Package, Plus, Search, Edit3, Trash2, Copy, RefreshCw, Save,
  ChevronDown, ChevronUp, Star, AlertTriangle, CheckCircle, XCircle,
  BarChart3, Layers, ShoppingCart, Box, MoreVertical, DollarSign,
  TrendingUp, ImageIcon, X, Archive, Eye, EyeOff
} from 'lucide-react'
import {
  COLORS, SHADOWS, BORDER_RADIUS,
  fmtMoney, fmtDate, EmptyState
} from '@/components/DesignSystem'

// ─── TYPES ────────────────────────────────────────────────────────
interface Category { id: string; name: string; slug: string; icon: string }

interface Variant {
  id?: string
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
  // joined
  variants: Variant[]
  min_price: number; max_price: number
}

interface Order {
  id: string; order_number: string
  customer_name: string | null; customer_phone: string | null; customer_email: string | null
  items: any[]; total: number; status: string; created_at: string; lead_id: string | null
}

// ─── CONSTANTS ────────────────────────────────────────────────────
const ORDER_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending:       { label: 'Pendiente',     bg: '#fef3c7', color: '#92400e' },
  confirmed:     { label: 'Confirmado',    bg: '#dbeafe', color: '#1e40af' },
  in_production: { label: 'En producción', bg: '#f3e8ff', color: '#6b21a8' },
  ready:         { label: 'Listo',         bg: '#dcfce7', color: '#166534' },
  delivered:     { label: 'Entregado',     bg: '#d1fae5', color: '#064e3b' },
  cancelled:     { label: 'Cancelado',     bg: '#fef2f2', color: '#991b1b' },
}

const STOCK_STATUS: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  in_stock:     { label: 'En stock',   bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  low_stock:    { label: 'Stock bajo', bg: '#fef3c7', color: '#92400e', dot: '#f59e0b' },
  out_of_stock: { label: 'Sin stock',  bg: '#fef2f2', color: '#991b1b', dot: '#ef4444' },
  unlimited:    { label: 'Ilimitado',  bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
}

const EMPTY_VARIANT = (): Variant => ({
  variant_name: '', sku: null, quantity: 100,
  attributes: {}, cost_price: 0, shipping_cost: 6,
  final_cost: 6, market_price: 0, profit_margin: -6,
  is_default: false, stock_status: 'unlimited', active: true, sort_order: 0,
})

const EMPTY_PRODUCT: Partial<Product & { variants: Variant[] }> = {
  name: '', slug: '', sku: '', category_id: null,
  description: '', short_description: '', price: 0,
  stock_qty: 0, stock_status: 'unlimited', track_stock: false,
  cover_image: '', images: [], tags: [],
  custom_label: '', label_color: '#2552ca', whatsapp_message: '',
  active: true, featured: false, visible_on_website: true,
  variants: [EMPTY_VARIANT()],
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ─── SHARED STYLES ────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 11px', border: '1.5px solid #e2e8f0',
  borderRadius: 9, fontSize: 13, outline: 'none', background: '#fafafa',
  fontFamily: 'Inter, sans-serif', boxSizing: 'border-box',
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────
function SBadge({ status }: { status: string }) {
  const c = STOCK_STATUS[status] || STOCK_STATUS.unlimited
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4,
      background:c.bg, color:c.color, fontSize:11, fontWeight:800,
      padding:'3px 8px', borderRadius:6, whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:c.dot }} />
      {c.label}
    </span>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label style={{ display:'block', fontSize:10, fontWeight:800,
    color:'#64748b', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5 }}>
    {children}
  </label>
}

// ─── VARIANT ROW (inside product form) ───────────────────────────
function VariantRow({
  variant, index, onChange, onRemove, onSetDefault, isOnly
}: {
  variant: Variant; index: number
  onChange: (i: number, v: Variant) => void
  onRemove: (i: number) => void
  onSetDefault: (i: number) => void
  isOnly: boolean
}) {
  const [open, setOpen] = useState(index === 0)

  function upd(field: keyof Variant, val: any) {
    const updated = { ...variant, [field]: val }
    // Auto-recalculate
    if (field === 'cost_price' || field === 'shipping_cost') {
      updated.final_cost    = (Number(updated.cost_price) || 0) + (Number(updated.shipping_cost) || 0)
      updated.profit_margin = (Number(updated.market_price) || 0) - updated.final_cost
    }
    if (field === 'market_price') {
      updated.profit_margin = (Number(val) || 0) - (Number(updated.final_cost) || 0)
    }
    onChange(index, updated)
  }

  function updAttr(key: string, val: string) {
    onChange(index, { ...variant, attributes: { ...variant.attributes, [key]: val } })
  }

  function removeAttr(key: string) {
    const attrs = { ...variant.attributes }
    delete attrs[key]
    onChange(index, { ...variant, attributes: attrs })
  }

  const margin       = variant.profit_margin || 0
  const marginColor  = margin > 0 ? '#16a34a' : margin < 0 ? '#dc2626' : '#64748b'
  const marginPct    = variant.market_price > 0
    ? ((margin / variant.market_price) * 100).toFixed(1) + '%'
    : '—'

  return (
    <div style={{
      border: `2px solid ${variant.is_default ? '#2552ca' : '#e2e8f0'}`,
      borderRadius: 12, overflow: 'hidden',
      background: variant.is_default ? '#f0f4ff' : '#fafafa',
      marginBottom: 8,
    }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px',
        cursor:'pointer', userSelect:'none' }}
        onClick={() => setOpen(o => !o)}>
        {/* Drag handle placeholder */}
        <span style={{ color:'#cbd5e1', fontSize:16, cursor:'grab' }}>⠿</span>

        <div style={{ flex:1 }}>
          <span style={{ fontFamily:'Manrope, sans-serif', fontSize:13, fontWeight:700, color:'#0f172a' }}>
            {variant.variant_name || `Variante ${index + 1}`}
          </span>
          {!open && (
            <span style={{ marginLeft:10, fontSize:12, color:'#64748b' }}>
              {variant.quantity} uds · <strong>${variant.market_price.toFixed(2)}</strong>
              {margin > 0 && <span style={{ color:marginColor, marginLeft:6, fontWeight:700 }}>
                +${margin.toFixed(2)} ({marginPct})
              </span>}
            </span>
          )}
        </div>

        {variant.is_default && (
          <span style={{ fontSize:10, fontWeight:800, background:'#2552ca', color:'#fff',
            padding:'2px 8px', borderRadius:6, letterSpacing:'.1em' }}>DEFAULT</span>
        )}

        <button onClick={e => { e.stopPropagation(); onSetDefault(index) }}
          title="Marcar como predeterminada"
          style={{ background:'none', border:'none', cursor:'pointer', padding:4,
            color: variant.is_default ? '#f59e0b' : '#d1d5db', fontSize:16 }}>
          ★
        </button>

        {!isOnly && (
          <button onClick={e => { e.stopPropagation(); onRemove(index) }}
            style={{ background:'#fef2f2', border:'none', borderRadius:6, padding:'4px 7px',
              cursor:'pointer', color:'#dc2626', display:'flex', alignItems:'center' }}>
            <X size={13} />
          </button>
        )}

        {open ? <ChevronUp size={15} color="#94a3b8" /> : <ChevronDown size={15} color="#94a3b8" />}
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding:'0 14px 14px', borderTop:'1px solid #e2e8f0' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, paddingTop:12 }}>

            {/* Variant name */}
            <div style={{ gridColumn:'span 2' }}>
              <Label>Nombre de la variante</Label>
              <input value={variant.variant_name} onChange={e => upd('variant_name', e.target.value)}
                placeholder="Ej: 1000 unidades - Acabado UV" style={inp} />
            </div>

            {/* Quantity */}
            <div>
              <Label>Cantidad (unidades)</Label>
              <input type="number" min="1" value={variant.quantity}
                onChange={e => upd('quantity', parseInt(e.target.value) || 0)} style={inp} />
            </div>

            {/* SKU */}
            <div>
              <Label>SKU variante</Label>
              <input value={variant.sku || ''} onChange={e => upd('sku', e.target.value || null)}
                placeholder="Opcional" style={inp} />
            </div>

            {/* Cost price */}
            <div>
              <Label>Costo de producción ($)</Label>
              <input type="number" min="0" step="0.01" value={variant.cost_price}
                onChange={e => upd('cost_price', parseFloat(e.target.value) || 0)} style={inp} />
            </div>

            {/* Shipping */}
            <div>
              <Label>Costo de envío ($)</Label>
              <input type="number" min="0" step="0.01" value={variant.shipping_cost}
                onChange={e => upd('shipping_cost', parseFloat(e.target.value) || 0)} style={inp} />
            </div>

            {/* Final cost (readonly) */}
            <div>
              <Label>Costo total (producción + envío)</Label>
              <div style={{ ...inp, background:'#f1f5f9', color:'#475569', display:'flex', alignItems:'center' }}>
                ${((variant.cost_price || 0) + (variant.shipping_cost || 0)).toFixed(2)}
              </div>
            </div>

            {/* Market price */}
            <div>
              <Label>Precio de venta al público ($) *</Label>
              <input type="number" min="0" step="0.01" value={variant.market_price}
                onChange={e => upd('market_price', parseFloat(e.target.value) || 0)}
                style={{ ...inp, borderColor: variant.market_price > 0 ? '#e2e8f0' : '#fca5a5' }} />
            </div>

            {/* Margin display */}
            <div style={{ gridColumn:'span 2' }}>
              <div style={{
                padding:'10px 14px', borderRadius:10,
                background: margin > 0 ? '#f0fdf4' : margin < 0 ? '#fef2f2' : '#f8fafc',
                border: `1px solid ${margin > 0 ? '#bbf7d0' : margin < 0 ? '#fecaca' : '#e2e8f0'}`,
                display:'flex', justifyContent:'space-between', alignItems:'center',
              }}>
                <span style={{ fontSize:12, color:'#64748b' }}>Margen de ganancia</span>
                <span style={{ fontFamily:'Manrope, sans-serif', fontSize:16, fontWeight:800, color:marginColor }}>
                  ${margin.toFixed(2)} ({marginPct})
                </span>
              </div>
            </div>

            {/* Stock status */}
            <div>
              <Label>Estado stock</Label>
              <select value={variant.stock_status}
                onChange={e => upd('stock_status', e.target.value)} style={inp}>
                <option value="unlimited">Ilimitado</option>
                <option value="in_stock">En stock</option>
                <option value="low_stock">Stock bajo</option>
                <option value="out_of_stock">Sin stock</option>
              </select>
            </div>

            {/* Sort order */}
            <div>
              <Label>Orden (menor = primero)</Label>
              <input type="number" value={variant.sort_order}
                onChange={e => upd('sort_order', parseInt(e.target.value) || 0)} style={inp} />
            </div>

          </div>

          {/* Attributes (acabado, material, tamaño, etc) */}
          <div style={{ marginTop:12 }}>
            <Label>Atributos (acabado, material, color, etc.)</Label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
              {Object.entries(variant.attributes).map(([k, v]) => (
                <div key={k} style={{ display:'flex', alignItems:'center', gap:4,
                  background:'#ede9fe', borderRadius:7, padding:'4px 10px', fontSize:12 }}>
                  <span style={{ color:'#7c3aed', fontWeight:600 }}>{k}:</span>
                  <input value={v} onChange={e => updAttr(k, e.target.value)}
                    style={{ border:'none', background:'transparent', outline:'none', fontSize:12,
                      color:'#4c1d95', fontWeight:600, width: `${Math.max(40, v.length * 8)}px` }} />
                  <button onClick={() => removeAttr(k)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#7c3aed', lineHeight:1, padding:0, fontSize:14 }}>×</button>
                </div>
              ))}
            </div>
            <AttrAdder onAdd={(k, v) => updAttr(k, v)} />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ATTR ADDER ──────────────────────────────────────────────────
function AttrAdder({ onAdd }: { onAdd: (key: string, val: string) => void }) {
  const [key, setKey] = useState('')
  const [val, setVal] = useState('')
  const presets = ['acabado', 'material', 'color', 'tamaño', 'lados', 'extras']

  return (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
      <select value={key} onChange={e => setKey(e.target.value)}
        style={{ ...inp, width:'auto', marginBottom:0, fontSize:12 }}>
        <option value="">+ Atributo</option>
        {presets.map(p => <option key={p} value={p}>{p}</option>)}
        <option value="__custom__">Personalizado...</option>
      </select>
      {key === '__custom__' && (
        <input value={key === '__custom__' ? '' : key}
          onChange={e => setKey(e.target.value)}
          placeholder="nombre atributo" style={{ ...inp, width:120, marginBottom:0, fontSize:12 }} />
      )}
      <input value={val} onChange={e => setVal(e.target.value)}
        placeholder="valor" style={{ ...inp, width:120, marginBottom:0, fontSize:12 }} />
      <button onClick={() => {
        const k = key === '__custom__' ? '' : key
        if (k && val) { onAdd(k, val); setKey(''); setVal('') }
      }} style={{
        padding:'8px 14px', border:'none', borderRadius:8,
        background:'#7c3aed', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700,
      }}>+ Agregar</button>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────
export default function CatalogoPage() {
  const supabase = createClient()

  const [tab,        setTab]        = useState<'products'|'orders'|'inventory'|'analytics'>('products')
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

  const [modal,          setModal]          = useState<'create'|'edit'|'delete'|'restock'|null>(null)
  const [editProduct,    setEditProduct]    = useState<Partial<Product & { variants: Variant[] }>>(EMPTY_PRODUCT)
  const [editVariants,   setEditVariants]   = useState<Variant[]>([EMPTY_VARIANT()])
  const [deletingId,     setDeletingId]     = useState<string|null>(null)
  const [tagInput,       setTagInput]       = useState('')
  const [imageInput,     setImageInput]     = useState('')
  const [toast,          setToast]          = useState<{msg:string;ok:boolean}|null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3500)
  }

  // ─── FETCH ─────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: prods }, { data: cats }, { data: ords }, { data: inv }, { data: vars }] = await Promise.all([
        supabase.from('catalog_products_view').select('*').order('created_at', { ascending: false }),
        supabase.from('catalog_categories').select('*').eq('active', true).order('sort_order'),
        supabase.from('catalog_orders').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('inventory_movements').select('*, catalog_products(name)').order('created_at', { ascending: false }).limit(200),
        supabase.from('product_variants').select('*').eq('active', true).order('sort_order'),
      ])

      // Merge variants into products
      const varMap: Record<string, Variant[]> = {}
      ;(vars || []).forEach(v => {
        if (!varMap[v.product_id]) varMap[v.product_id] = []
        varMap[v.product_id].push(v)
      })

      const merged = (prods || []).map(p => ({
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

  // ─── FILTERED ──────────────────────────────────────────────────
  const filtered = products.filter(p => {
    const ms = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku?.toLowerCase().includes(search.toLowerCase()))
    const mc = filterCat === 'all' || p.category_id === filterCat
    const mst = filterStatus === 'all'
      || (filterStatus === 'active'   && p.active)
      || (filterStatus === 'inactive' && !p.active)
      || (filterStatus === 'featured' && p.featured)
      || (filterStatus === 'no_price' && !p.variants?.length)
    return ms && mc && mst
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated  = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)

  // ─── SAVE PRODUCT ──────────────────────────────────────────────
  async function saveProduct() {
    if (!editProduct.name) { showToast('El nombre es obligatorio', false); return }
    if (!editVariants.length) { showToast('Agrega al menos una variante', false); return }
    if (editVariants.some(v => !v.market_price)) { showToast('Todos los precios de venta son obligatorios', false); return }

    setSaving(true)
    try {
      // Derive base price from default variant
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
        // Delete existing variants before reinserting
        await supabase.from('product_variants').delete().eq('product_id', productId)
      }

      // Insert variants
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
      setEditVariants([EMPTY_VARIANT()])
      fetchAll()
    } catch (e: any) {
      showToast(e.message || 'Error guardando', false)
    } finally {
      setSaving(false)
    }
  }

  async function deleteProduct() {
    if (!deletingId) return
    setSaving(true)
    const { error } = await supabase.from('catalog_products').delete().eq('id', deletingId)
    if (!error) { showToast('Producto eliminado'); setModal(null); setDeletingId(null); fetchAll() }
    else showToast('Error eliminando', false)
    setSaving(false)
  }

  async function toggleField(id: string, field: 'active'|'featured'|'visible_on_website', val: boolean) {
    await supabase.from('catalog_products').update({ [field]: !val }).eq('id', id)
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: !val } : p))
  }

  async function duplicateProduct(p: Product) {
    const { id, created_at, updated_at, total_orders, total_revenue, variants, min_price, max_price, ...rest } = p as any
    const { data: newProd, error } = await supabase.from('catalog_products')
      .insert({ ...rest, name: rest.name + ' (copia)', slug: rest.slug + '-copia-' + Date.now().toString(36), active: false })
      .select('id').single()
    if (!error && newProd && variants?.length) {
      await supabase.from('product_variants').insert(
        variants.map((v: Variant) => ({ ...v, id: undefined, product_id: newProd.id }))
      )
    }
    if (!error) { showToast('Duplicado ✓'); fetchAll() }
    else showToast('Error duplicando', false)
  }

  async function updateOrderStatus(id: string, status: string) {
    await supabase.from('catalog_orders').update({ status }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  // ─── VARIANT HANDLERS ──────────────────────────────────────────
  function addVariant() {
    setEditVariants(prev => [...prev, { ...EMPTY_VARIANT(), sort_order: prev.length }])
  }

  function updateVariant(i: number, v: Variant) {
    setEditVariants(prev => prev.map((item, idx) => idx === i ? v : item))
  }

  function removeVariant(i: number) {
    setEditVariants(prev => prev.filter((_, idx) => idx !== i))
  }

  function setDefaultVariant(i: number) {
    setEditVariants(prev => prev.map((v, idx) => ({ ...v, is_default: idx === i })))
  }

  // ─── STATS ─────────────────────────────────────────────────────
  const stats = {
    total:     products.length,
    active:    products.filter(p => p.active).length,
    noVariants:products.filter(p => !p.variants?.length).length,
    featured:  products.filter(p => p.featured).length,
    revenue:   products.reduce((s, p) => s + p.total_revenue, 0),
    pending:   orders.filter(o => o.status === 'pending').length,
  }

  // ─── PRODUCT FORM MODAL ────────────────────────────────────────
  const ProductModal = () => (
    <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,.65)',
      backdropFilter:'blur(5px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
      <div style={{ background:'#fff', borderRadius:22, width:'100%', maxWidth:780,
        maxHeight:'94vh', overflow:'hidden', display:'flex', flexDirection:'column',
        boxShadow:'0 40px 80px rgba(0,0,0,.35)' }}>

        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#00113a,#002878)', padding:'18px 26px',
          display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <h2 style={{ color:'#fff', fontSize:17, fontWeight:800, margin:0 }}>
              {modal === 'create' ? '+ Nuevo Producto' : '✏️ Editar Producto'}
            </h2>
            <p style={{ color:'rgba(255,255,255,.45)', fontSize:11, margin:'3px 0 0' }}>
              Los precios se configuran por variante (cantidad + acabado)
            </p>
          </div>
          <button onClick={() => setModal(null)} style={{ background:'rgba(255,255,255,.1)',
            border:'none', borderRadius:8, color:'#fff', cursor:'pointer', padding:'6px 10px', fontSize:16 }}>✕</button>
        </div>

        {/* Tabs inside modal */}
        <div style={{ display:'flex', gap:0, borderBottom:'1px solid #f1f5f9', flexShrink:0, background:'#fafafa' }}>
          {[['info','📋 Información'],['variants','💰 Precios / Variantes'],['media','🖼️ Imágenes & Tags']].map(([id,label]) => (
            <button key={id} id={`mtab-${id}`}
              onClick={() => {
                document.querySelectorAll('[id^="mtab-"]').forEach(el => {
                  (el as HTMLElement).style.borderBottom = '2px solid transparent'
                  ;(el as HTMLElement).style.color = '#94a3b8'
                  ;(el as HTMLElement).style.fontWeight = '500'
                })
                const el = document.getElementById(`mtab-${id}`)!
                el.style.borderBottom = '2px solid #7c3aed'
                el.style.color = '#7c3aed'
                el.style.fontWeight = '700'
                document.querySelectorAll('[id^="mpanel-"]').forEach(p => (p as HTMLElement).style.display = 'none')
                document.getElementById(`mpanel-${id}`)!.style.display = 'block'
              }}
              style={{ padding:'11px 18px', border:'none', borderBottom:`2px solid ${id==='info'?'#7c3aed':'transparent'}`,
                background:'none', cursor:'pointer', fontSize:13,
                color: id==='info'?'#7c3aed':'#94a3b8',
                fontWeight: id==='info'?700:500,
                fontFamily:'Manrope, sans-serif' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY:'auto', flex:1 }}>

          {/* TAB: INFO */}
          <div id="mpanel-info" style={{ padding:'22px 26px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div style={{ gridColumn:'span 2' }}>
                <Label>Nombre del producto *</Label>
                <input value={editProduct.name||''} style={inp}
                  onChange={e => setEditProduct(p => ({ ...p, name: e.target.value, slug: slugify(e.target.value) }))}
                  placeholder="Ej: Tarjetas de Presentación Premium" />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <input value={editProduct.slug||''} style={inp}
                  onChange={e => setEditProduct(p => ({ ...p, slug: e.target.value }))} />
              </div>
              <div>
                <Label>SKU base</Label>
                <input value={editProduct.sku||''} style={inp}
                  onChange={e => setEditProduct(p => ({ ...p, sku: e.target.value }))}
                  placeholder="PROD-001" />
              </div>
              <div>
                <Label>Categoría</Label>
                <select value={editProduct.category_id||''} style={inp}
                  onChange={e => setEditProduct(p => ({ ...p, category_id: e.target.value || null }))}>
                  <option value="">— Sin categoría —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Subcategoría</Label>
                <input value={editProduct.subcategory||''} style={inp}
                  onChange={e => setEditProduct(p => ({ ...p, subcategory: e.target.value }))}
                  placeholder="Ej: Premium, Económico..." />
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <Label>Descripción corta (aparece en la card del catálogo)</Label>
                <input value={editProduct.short_description||''} style={inp}
                  onChange={e => setEditProduct(p => ({ ...p, short_description: e.target.value }))}
                  placeholder="Ej: 1000 uds · Papel 350g · Varios acabados" />
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <Label>Descripción completa</Label>
                <textarea rows={4} value={editProduct.description||''} style={{ ...inp, resize:'vertical', minHeight:80 }}
                  onChange={e => setEditProduct(p => ({ ...p, description: e.target.value }))}
                  placeholder="Describe el producto en detalle..." />
              </div>
              <div>
                <Label>Etiqueta personalizada</Label>
                <input value={editProduct.custom_label||''} style={inp}
                  onChange={e => setEditProduct(p => ({ ...p, custom_label: e.target.value }))}
                  placeholder="Ej: ★ Más Vendido, Nuevo..." />
              </div>
              <div>
                <Label>Color etiqueta</Label>
                <div style={{ display:'flex', gap:8 }}>
                  <input type="color" value={editProduct.label_color||'#2552ca'}
                    onChange={e => setEditProduct(p => ({ ...p, label_color: e.target.value }))}
                    style={{ width:40, height:38, border:'none', cursor:'pointer', borderRadius:6, padding:2 }} />
                  <input value={editProduct.label_color||'#2552ca'} style={{ ...inp, flex:1 }}
                    onChange={e => setEditProduct(p => ({ ...p, label_color: e.target.value }))} />
                </div>
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <Label>Mensaje WhatsApp personalizado</Label>
                <textarea rows={2} value={editProduct.whatsapp_message||''} style={{ ...inp, resize:'vertical' }}
                  onChange={e => setEditProduct(p => ({ ...p, whatsapp_message: e.target.value }))}
                  placeholder="Hola Artia, me interesa {nombre} — {variant}. ¿Tienen disponibilidad?" />
              </div>
              {/* Toggles */}
              <div style={{ gridColumn:'span 2', display:'flex', flexWrap:'wrap', gap:10 }}>
                {([['active','Activo','Visible en el sistema'],['featured','Destacado','Sección de destacados'],['visible_on_website','Visible en web','Catálogo público']] as const)
                  .map(([field, label, sub]) => (
                  <label key={field} style={{ display:'flex', alignItems:'center', gap:9, cursor:'pointer',
                    background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'9px 13px', flex:'1 1 180px' }}>
                    <input type="checkbox" checked={!!editProduct[field]}
                      onChange={e => setEditProduct(p => ({ ...p, [field]: e.target.checked }))}
                      style={{ width:15, height:15, accentColor:'#7c3aed' }} />
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#0f172a' }}>{label}</div>
                      <div style={{ fontSize:10, color:'#64748b' }}>{sub}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* TAB: VARIANTS */}
          <div id="mpanel-variants" style={{ display:'none', padding:'22px 26px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div>
                <h3 style={{ fontSize:14, fontWeight:800, margin:0, color:'#0f172a' }}>
                  Variantes de precio ({editVariants.length})
                </h3>
                <p style={{ fontSize:12, color:'#64748b', margin:'3px 0 0' }}>
                  Cada variante = una combinación de cantidad + acabado + precio. La marcada con ★ es la predeterminada en el catálogo.
                </p>
              </div>
              <button onClick={addVariant} style={{ display:'flex', alignItems:'center', gap:5,
                padding:'8px 14px', border:'none', borderRadius:9,
                background:'#7c3aed', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700 }}>
                <Plus size={13} /> Agregar variante
              </button>
            </div>

            {editVariants.map((v, i) => (
              <VariantRow key={i} variant={v} index={i}
                onChange={updateVariant} onRemove={removeVariant}
                onSetDefault={setDefaultVariant} isOnly={editVariants.length === 1} />
            ))}

            {/* Summary table */}
            {editVariants.length > 1 && (
              <div style={{ marginTop:16, background:'#f8fafc', borderRadius:12, overflow:'hidden',
                border:'1px solid #e2e8f0' }}>
                <div style={{ padding:'10px 16px', background:'#f1f5f9', borderBottom:'1px solid #e2e8f0' }}>
                  <span style={{ fontSize:11, fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:'.5px' }}>
                    Resumen de precios
                  </span>
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#fafafa' }}>
                      {['Variante','Cantidad','Costo total','Venta al público','Margen'].map(h => (
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10,
                          fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.3px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {editVariants.map((v, i) => {
                      const fc  = (v.cost_price||0) + (v.shipping_cost||0)
                      const mg  = (v.market_price||0) - fc
                      const pct = v.market_price > 0 ? ((mg/v.market_price)*100).toFixed(1)+'%' : '—'
                      return (
                        <tr key={i} style={{ borderBottom:'1px solid #f1f5f9' }}>
                          <td style={{ padding:'8px 12px', fontSize:12, fontWeight:600, color:'#0f172a' }}>
                            {v.variant_name || `Variante ${i+1}`}
                            {v.is_default && <span style={{ marginLeft:6, fontSize:9, background:'#2552ca', color:'#fff', padding:'1px 5px', borderRadius:4, fontWeight:800 }}>DEFAULT</span>}
                          </td>
                          <td style={{ padding:'8px 12px', fontSize:12 }}>{v.quantity} uds</td>
                          <td style={{ padding:'8px 12px', fontSize:12, color:'#dc2626' }}>${fc.toFixed(2)}</td>
                          <td style={{ padding:'8px 12px', fontSize:13, fontWeight:800, color:'#0f172a' }}>${(v.market_price||0).toFixed(2)}</td>
                          <td style={{ padding:'8px 12px', fontSize:12, fontWeight:700,
                            color: mg > 0 ? '#16a34a' : '#dc2626' }}>${mg.toFixed(2)} ({pct})</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* TAB: MEDIA */}
          <div id="mpanel-media" style={{ display:'none', padding:'22px 26px' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <Label>URL imagen principal</Label>
                <input value={editProduct.cover_image||''} style={inp}
                  onChange={e => setEditProduct(p => ({ ...p, cover_image: e.target.value }))}
                  placeholder="https://..." />
                {editProduct.cover_image && (
                  <img src={editProduct.cover_image} alt="" style={{ width:80, height:80, objectFit:'cover',
                    borderRadius:10, marginTop:8, border:'1px solid #e2e8f0' }} />
                )}
              </div>
              <div>
                <Label>Galería de imágenes (URLs adicionales)</Label>
                <div style={{ display:'flex', gap:8 }}>
                  <input value={imageInput} onChange={e => setImageInput(e.target.value)}
                    placeholder="https://... + Enter para agregar" style={{ ...inp, flex:1, marginBottom:0 }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && imageInput.trim()) {
                        setEditProduct(p => ({ ...p, images: [...(p.images||[]), imageInput.trim()] }))
                        setImageInput('')
                      }
                    }} />
                  <button onClick={() => {
                    if (imageInput.trim()) {
                      setEditProduct(p => ({ ...p, images: [...(p.images||[]), imageInput.trim()] }))
                      setImageInput('')
                    }
                  }} style={{ padding:'0 14px', background:'#00113a', color:'#fff',
                    border:'none', borderRadius:9, cursor:'pointer', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>
                    + Agregar
                  </button>
                </div>
                {(editProduct.images||[]).length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:10 }}>
                    {(editProduct.images||[]).map((url, i) => (
                      <div key={i} style={{ position:'relative' }}>
                        <img src={url} alt="" style={{ width:64, height:64, objectFit:'cover',
                          borderRadius:8, border:'1px solid #e2e8f0' }} />
                        <button onClick={() => setEditProduct(p => ({ ...p, images: p.images?.filter((_,j)=>j!==i) }))}
                          style={{ position:'absolute', top:-5, right:-5, background:'#ef4444', color:'#fff',
                            border:'none', borderRadius:'50%', width:16, height:16, cursor:'pointer',
                            fontSize:10, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label>Tags (Enter para agregar)</Label>
                <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                  style={inp} placeholder="Escribe un tag y presiona Enter..."
                  onKeyDown={e => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      setEditProduct(p => ({ ...p, tags: [...(p.tags||[]), tagInput.trim()] }))
                      setTagInput('')
                    }
                  }} />
                {(editProduct.tags||[]).length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
                    {(editProduct.tags||[]).map((tag, i) => (
                      <span key={i} style={{ background:'#ede9fe', color:'#5b21b6', borderRadius:20,
                        padding:'3px 10px', fontSize:12, fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
                        {tag}
                        <button onClick={() => setEditProduct(p => ({ ...p, tags: p.tags?.filter((_,j)=>j!==i) }))}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'#7c3aed', fontSize:14, lineHeight:1, padding:0 }}>×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 26px', borderTop:'1px solid #f1f5f9',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          background:'#fafafa', flexShrink:0 }}>
          <span style={{ fontSize:12, color:'#94a3b8' }}>
            {editVariants.length} variante{editVariants.length!==1?'s':''} configurada{editVariants.length!==1?'s':''}
          </span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setModal(null)} style={{ padding:'9px 18px', border:'1px solid #e2e8f0',
              borderRadius:10, background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#64748b' }}>
              Cancelar
            </button>
            <button onClick={saveProduct} disabled={saving} style={{ padding:'9px 22px', border:'none',
              borderRadius:10, background: saving ? '#94a3b8' : 'linear-gradient(135deg,#00113a,#2552ca)',
              color:'#fff', cursor: saving?'not-allowed':'pointer', fontSize:13, fontWeight:700,
              display:'flex', alignItems:'center', gap:6 }}>
              {saving ? <><RefreshCw size={13} style={{ animation:'spin 1s linear infinite' }} /> Guardando...</> : <><Save size={13} /> Guardar</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ─── RENDER ────────────────────────────────────────────────────
  return (
    <div style={{ background:'#f1f5f9', minHeight:'100vh', padding:24, fontFamily:'Inter, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', top:24, right:24, zIndex:2000,
          background: toast.ok ? '#00113a' : '#ef4444', color:'#fff',
          padding:'12px 18px', borderRadius:12, fontSize:13, fontWeight:600,
          boxShadow:'0 8px 32px rgba(0,0,0,.25)', display:'flex', alignItems:'center', gap:8,
          animation:'artiaFadeIn .3s ease' }}>
          {toast.ok ? <CheckCircle size={15}/> : <XCircle size={15}/>} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom:22, display:'flex', justifyContent:'space-between',
        alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0f172a', margin:0,
            display:'flex', alignItems:'center', gap:10 }}>
            <Package size={24} color="#7c3aed" /> Catálogo & Inventario
          </h1>
          <p style={{ color:'#64748b', fontSize:13, margin:'4px 0 0' }}>
            {stats.total} productos · {stats.pending} pedidos pendientes
            {stats.noVariants > 0 && <span style={{ color:'#f59e0b', marginLeft:8 }}>
              ⚠️ {stats.noVariants} sin precios configurados
            </span>}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={fetchAll} style={{ display:'flex', alignItems:'center', gap:5,
            padding:'8px 13px', border:'1px solid #e2e8f0', borderRadius:9,
            background:'#fff', cursor:'pointer', fontSize:12, fontWeight:600, color:'#64748b' }}>
            <RefreshCw size={13}/> Actualizar
          </button>
          <button onClick={() => { setEditProduct(EMPTY_PRODUCT); setEditVariants([EMPTY_VARIANT()]); setModal('create') }}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px',
              border:'none', borderRadius:9, background:'linear-gradient(135deg,#7c3aed,#5b21b6)',
              cursor:'pointer', fontSize:13, fontWeight:700, color:'#fff',
              boxShadow:'0 4px 14px rgba(124,58,237,.3)' }}>
            <Plus size={14}/> Nuevo Producto
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10, marginBottom:22 }}>
        {[
          { label:'Total',    value:stats.total,              icon:<Package size={17}/>,    color:'#7c3aed', bg:'#ede9fe' },
          { label:'Activos',  value:stats.active,             icon:<CheckCircle size={17}/>, color:'#16a34a', bg:'#dcfce7' },
          { label:'Sin precios',value:stats.noVariants,       icon:<AlertTriangle size={17}/>,color:'#d97706',bg:'#fef3c7' },
          { label:'Pedidos',  value:stats.pending,            icon:<ShoppingCart size={17}/>,color:'#2552ca', bg:'#dbeafe' },
          { label:'Ingresos', value:fmtMoney(stats.revenue),  icon:<DollarSign size={17}/>, color:'#0f172a', bg:'#f1f5f9', isText:true },
        ].map((s,i) => (
          <div key={i} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:13,
            padding:'14px 16px', display:'flex', alignItems:'center', gap:10, boxShadow:SHADOWS.sm }}>
            <div style={{ width:36, height:36, borderRadius:9, background:s.bg, flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center', color:s.color }}>{s.icon}</div>
            <div>
              <div style={{ fontSize:s.isText?13:21, fontWeight:800, color:'#0f172a', lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:10, color:'#64748b', marginTop:2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:0, marginBottom:18, borderBottom:'1px solid #e2e8f0' }}>
        {[['products','Productos',<Package size={14}/>],
          ['orders',`Pedidos${stats.pending>0?` (${stats.pending})`:''}`,<ShoppingCart size={14}/>],
          ['inventory','Movimientos',<Layers size={14}/>],
          ['analytics','Analítica',<BarChart3 size={14}/>],
        ].map(([id,label,icon]:any) => (
          <button key={id} onClick={() => setTab(id as any)} style={{
            display:'flex', alignItems:'center', gap:6, padding:'10px 15px',
            border:'none', borderBottom: tab===id ? '2px solid #7c3aed' : '2px solid transparent',
            background:'none', cursor:'pointer', fontSize:13, fontWeight: tab===id ? 700 : 500,
            color: tab===id ? '#7c3aed' : '#64748b', transition:'all .15s', marginBottom:-1,
          }}>{icon}{label}</button>
        ))}
      </div>

      {/* ── PRODUCTS TAB ── */}
      {tab === 'products' && (
        <>
          {/* Filters */}
          <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
            <div style={{ position:'relative', flex:1, minWidth:180 }}>
              <Search size={13} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }}/>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Buscar..." style={{ ...inp, paddingLeft:32, marginBottom:0 }} />
            </div>
            <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1) }}
              style={{ ...inp, marginBottom:0, width:'auto', minWidth:150 }}>
              <option value="all">Todas las categorías</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
              style={{ ...inp, marginBottom:0, width:'auto', minWidth:140 }}>
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="featured">Destacados</option>
              <option value="no_price">Sin precios</option>
            </select>
          </div>

          <p style={{ fontSize:12, color:'#64748b', marginBottom:12 }}>
            {filtered.length} productos {search || filterCat !== 'all' ? '(filtrados)' : ''}
          </p>

          {loading ? (
            <div style={{ textAlign:'center', padding:60, color:'#94a3b8' }}>
              <RefreshCw size={26} style={{ animation:'spin 1s linear infinite' }}/>
              <p style={{ marginTop:10 }}>Cargando...</p>
            </div>
          ) : paginated.length === 0 ? (
            <EmptyState icon="📦" title="Sin productos" subtitle='Crea tu primer producto con "+ Nuevo Producto"'/>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(255px,1fr))', gap:14 }}>
              {paginated.map(p => (
                <ProductCard key={p.id} product={p}
                  onEdit={() => {
                    setEditProduct(p)
                    setEditVariants(p.variants?.length ? [...p.variants] : [EMPTY_VARIANT()])
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:22, flexWrap:'wrap' }}>
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                style={{ ...pagBtn, opacity: page===1?.4:1 }}>← Anterior</button>
              {Array.from({length:totalPages},(_,i)=>i+1).map(n => (
                <button key={n} onClick={() => setPage(n)}
                  style={{ ...pagBtn, background: page===n?'#7c3aed':'#fff', color: page===n?'#fff':'#475569', borderColor: page===n?'#7c3aed':'#e2e8f0' }}>{n}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                style={{ ...pagBtn, opacity: page===totalPages?.4:1 }}>Siguiente →</button>
            </div>
          )}
        </>
      )}

      {/* ── ORDERS TAB ── */}
      {tab === 'orders' && (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'16px 22px', borderBottom:'1px solid #f1f5f9' }}>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700 }}>Pedidos del catálogo ({orders.length})</h3>
          </div>
          {orders.length === 0
            ? <EmptyState icon="🛒" title="Sin pedidos" subtitle="Los pedidos del catálogo aparecerán aquí"/>
            : <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#f8fafc' }}>
                      {['# Pedido','Cliente','Productos','Total','Estado','Fecha','CRM'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10,
                          fontWeight:800, color:'#64748b', textTransform:'uppercase',
                          borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} style={{ borderBottom:'1px solid #f8fafc' }}>
                        <td style={{ padding:'11px 14px', fontSize:13, fontWeight:700, color:'#7c3aed' }}>{o.order_number}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <div style={{ fontSize:13, fontWeight:600 }}>{o.customer_name||'—'}</div>
                          <div style={{ fontSize:11, color:'#64748b' }}>{o.customer_phone||o.customer_email||''}</div>
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:12, color:'#475569' }}>
                          {Array.isArray(o.items) ? `${o.items.length} ítem(s)` : '—'}
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:13, fontWeight:700 }}>{fmtMoney(o.total)}</td>
                        <td style={{ padding:'11px 14px' }}>
                          <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)}
                            style={{ fontSize:11, fontWeight:700, padding:'4px 7px', borderRadius:6,
                              border:'1px solid #e2e8f0', cursor:'pointer',
                              background: ORDER_STATUS[o.status]?.bg||'#f8fafc',
                              color: ORDER_STATUS[o.status]?.color||'#475569' }}>
                            {Object.entries(ORDER_STATUS).map(([k,v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding:'11px 14px', fontSize:11, color:'#94a3b8' }}>{fmtDate(o.created_at)}</td>
                        <td style={{ padding:'11px 14px' }}>
                          {o.lead_id && <a href={`/admin/leads?lead=${o.lead_id}`}
                            style={{ fontSize:11, color:'#7c3aed', fontWeight:600, textDecoration:'none' }}>Ver lead →</a>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          }
        </div>
      )}

      {/* ── INVENTORY TAB ── */}
      {tab === 'inventory' && (
        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'16px 22px', borderBottom:'1px solid #f1f5f9' }}>
            <h3 style={{ margin:0, fontSize:14, fontWeight:700 }}>Movimientos de inventario ({inventory.length})</h3>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f8fafc' }}>
                  {['Producto','Tipo','Cambio','Antes','Después','Notas','Fecha'].map(h => (
                    <th key={h} style={{ padding:'9px 14px', textAlign:'left', fontSize:10,
                      fontWeight:800, color:'#64748b', textTransform:'uppercase', borderBottom:'1px solid #f1f5f9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventory.map((m:any) => (
                  <tr key={m.id} style={{ borderBottom:'1px solid #f8fafc' }}>
                    <td style={{ padding:'9px 14px', fontSize:13, fontWeight:600 }}>{m.catalog_products?.name||'—'}</td>
                    <td style={{ padding:'9px 14px' }}>
                      <span style={{ padding:'2px 8px', borderRadius:5, fontSize:10, fontWeight:800,
                        background: m.type==='restock'?'#dcfce7':m.type==='sale'?'#dbeafe':'#fef3c7',
                        color: m.type==='restock'?'#166534':m.type==='sale'?'#1e40af':'#92400e' }}>{m.type}</span>
                    </td>
                    <td style={{ padding:'9px 14px', fontWeight:700, fontSize:14,
                      color: m.qty_change>0?'#16a34a':'#dc2626' }}>{m.qty_change>0?'+':''}{m.qty_change}</td>
                    <td style={{ padding:'9px 14px', fontSize:12, color:'#475569' }}>{m.qty_before}</td>
                    <td style={{ padding:'9px 14px', fontSize:12, color:'#475569' }}>{m.qty_after}</td>
                    <td style={{ padding:'9px 14px', fontSize:11, color:'#64748b' }}>{m.notes||'—'}</td>
                    <td style={{ padding:'9px 14px', fontSize:11, color:'#94a3b8' }}>{fmtDate(m.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {tab === 'analytics' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:14 }}>
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:22, gridColumn:'span 2' }}>
            <h3 style={{ margin:'0 0 16px', fontSize:14, fontWeight:700 }}>Productos más vendidos</h3>
            {products.filter(p => p.total_orders > 0).sort((a,b) => b.total_orders - a.total_orders).slice(0,8).map((p,i) => (
              <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <span style={{ width:20, fontSize:11, fontWeight:800, color:'#94a3b8' }}>#{i+1}</span>
                <div style={{ width:34, height:34, borderRadius:8, background:'#f1f5f9', overflow:'hidden', flexShrink:0 }}>
                  {p.cover_image && <img src={p.cover_image} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{p.name}</div>
                  <div style={{ fontSize:11, color:'#64748b' }}>{p.total_orders} pedidos · {fmtMoney(p.total_revenue)}</div>
                </div>
                <div style={{ height:5, width:90, background:'#f1f5f9', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', background:'#7c3aed', borderRadius:3,
                    width:`${Math.min(100,(p.total_orders/(products[0]?.total_orders||1))*100)}%` }}/>
                </div>
              </div>
            ))}
            {products.every(p => p.total_orders === 0) && <p style={{ color:'#94a3b8', fontSize:13 }}>Sin pedidos aún.</p>}
          </div>

          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:22 }}>
            <h3 style={{ margin:'0 0 14px', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
              <TrendingUp size={16} color="#7c3aed"/> Márgenes por producto
            </h3>
            {products.slice(0,8).map(p => {
              const vars = p.variants || []
              if (!vars.length) return null
              const avgMargin = vars.reduce((s,v) => s + (v.profit_margin||0), 0) / vars.length
              const avgPct    = vars.reduce((s,v) => s + (v.market_price > 0 ? (v.profit_margin/v.market_price)*100 : 0), 0) / vars.length
              return (
                <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, padding:'8px 12px', borderRadius:8, background:'#f8fafc' }}>
                  <span style={{ fontSize:12, fontWeight:600, color:'#0f172a', flex:1 }}>{p.name}</span>
                  <span style={{ fontSize:12, fontWeight:800, color: avgMargin > 0 ? '#16a34a' : '#dc2626' }}>
                    ${avgMargin.toFixed(2)} ({avgPct.toFixed(1)}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      {(modal === 'create' || modal === 'edit') && <ProductModal/>}

      {modal === 'delete' && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,.5)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#fff', borderRadius:18, padding:28, maxWidth:380, width:'100%',
            boxShadow:'0 20px 60px rgba(0,0,0,.3)' }}>
            <h3 style={{ margin:'0 0 10px', fontSize:17, fontWeight:800 }}>Eliminar producto</h3>
            <p style={{ color:'#475569', fontSize:14, lineHeight:1.6, marginBottom:22 }}>
              ¿Estás seguro? Se eliminarán también todas las variantes de precio. Esta acción no se puede deshacer.
            </p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => { setModal(null); setDeletingId(null) }} style={{ flex:1, padding:'10px 0',
                border:'1px solid #e2e8f0', borderRadius:10, background:'#fff', cursor:'pointer',
                fontSize:13, fontWeight:600, color:'#64748b' }}>Cancelar</button>
              <button onClick={deleteProduct} disabled={saving} style={{ flex:1, padding:'10px 0',
                border:'none', borderRadius:10, background: saving?'#94a3b8':'#dc2626',
                color:'#fff', cursor: saving?'not-allowed':'pointer', fontSize:13, fontWeight:700 }}>
                {saving ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
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

// ─── PRODUCT CARD ─────────────────────────────────────────────────
function ProductCard({ product: p, onEdit, onDelete, onDuplicate, onToggleActive, onToggleFeatured }: {
  product: Product
  onEdit:() => void; onDelete:() => void; onDuplicate:() => void
  onToggleActive:() => void; onToggleFeatured:() => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const hasVariants = p.variants?.length > 0
  const noPrice     = !hasVariants

  return (
    <div style={{ background:'#fff', border:`1px solid ${noPrice?'#fde68a':'#e2e8f0'}`,
      borderRadius:15, overflow:'hidden', boxShadow:SHADOWS.sm,
      opacity: p.active ? 1 : 0.6, position:'relative' }}>

      {/* Image */}
      <div style={{ height:170, background:'#f8fafc', position:'relative', overflow:'hidden' }}>
        {p.cover_image
          ? <img src={p.cover_image} alt={p.name}
              style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform .4s ease' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
          : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#d1d5db' }}>
              <ImageIcon size={38}/>
            </div>
        }
        {p.custom_label && (
          <span style={{ position:'absolute', top:9, left:9, background:p.label_color,
            color:'#fff', padding:'2px 8px', borderRadius:100, fontSize:9, fontWeight:800 }}>{p.custom_label}</span>
        )}
        {noPrice && (
          <span style={{ position:'absolute', top:9, right:9, background:'#fef3c7',
            color:'#92400e', padding:'2px 8px', borderRadius:100, fontSize:9, fontWeight:800 }}>
            ⚠️ Sin precios
          </span>
        )}

        {/* Kebab */}
        <div style={{ position:'absolute', bottom:8, right:8 }}>
          <button onClick={() => setMenuOpen(m => !m)}
            style={{ background:'rgba(0,0,0,.4)', border:'none', borderRadius:7,
              padding:'4px 7px', cursor:'pointer', color:'#fff', display:'flex', alignItems:'center' }}>
            <MoreVertical size={14}/>
          </button>
          {menuOpen && (
            <div style={{ position:'absolute', right:0, bottom:'100%', zIndex:50, background:'#fff',
              border:'1px solid #e2e8f0', borderRadius:11, boxShadow:'0 8px 28px rgba(0,0,0,.12)',
              minWidth:155, padding:5 }}
              onMouseLeave={() => setMenuOpen(false)}>
              {[
                ['✏️ Editar', onEdit],
                [p.active ? '🔴 Desactivar' : '🟢 Activar', onToggleActive],
                [p.featured ? '⭐ Quitar destacado' : '⭐ Destacar', onToggleFeatured],
                ['📋 Duplicar', onDuplicate],
                ['🗑️ Eliminar', onDelete],
              ].map(([label, fn]) => (
                <button key={label as string} onClick={() => { (fn as any)(); setMenuOpen(false) }}
                  style={{ display:'block', width:'100%', textAlign:'left', padding:'7px 11px',
                    border:'none', background:'none', cursor:'pointer', fontSize:12, fontWeight:500,
                    color: String(label).includes('Eliminar') ? '#dc2626' : '#374151',
                    borderRadius:7, transition:'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  {label as string}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:'12px 14px' }}>
        <p style={{ fontSize:10, color:'#94a3b8', margin:'0 0 2px', fontWeight:700 }}>
          {p.category_icon} {p.category_name||'Sin categoría'}
        </p>
        <h4 style={{ margin:'0 0 6px', fontSize:13, fontWeight:700, color:'#0f172a', lineHeight:1.3 }}>
          {p.name}
        </h4>
        {/* Price range */}
        {hasVariants ? (
          <div style={{ marginBottom:6 }}>
            <span style={{ fontFamily:'Manrope, sans-serif', fontSize:17, fontWeight:800, color:'#00113a' }}>
              {p.min_price === p.max_price ? `$${p.min_price.toFixed(2)}` : `$${p.min_price.toFixed(2)} – $${p.max_price.toFixed(2)}`}
            </span>
            <span style={{ fontSize:11, color:'#94a3b8', marginLeft:6 }}>{p.variants.length} opciones</span>
          </div>
        ) : (
          <p style={{ fontSize:12, color:'#f59e0b', fontWeight:700, marginBottom:6 }}>⚠️ Configura precios</p>
        )}

        {/* Variant quick summary */}
        {hasVariants && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
            {p.variants.slice(0,3).map((v,i) => (
              <span key={i} style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100,
                background:'#f1f5f9', color:'#475569', fontFamily:'Manrope, sans-serif' }}>
                {v.quantity >= 1000 ? (v.quantity/1000)+'K' : v.quantity} uds · ${v.market_price.toFixed(0)}
              </span>
            ))}
            {p.variants.length > 3 && <span style={{ fontSize:10, color:'#94a3b8' }}>+{p.variants.length-3} más</span>}
          </div>
        )}

        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {!p.active && <span style={{ fontSize:9, fontWeight:800, color:'#dc2626', background:'#fee2e2', padding:'2px 7px', borderRadius:5 }}>INACTIVO</span>}
          {!p.visible_on_website && <span style={{ fontSize:9, fontWeight:800, color:'#d97706', background:'#fef3c7', padding:'2px 7px', borderRadius:5 }}>Oculto web</span>}
          {p.featured && <span style={{ fontSize:9, fontWeight:800, color:'#92400e', background:'#fef3c7', padding:'2px 7px', borderRadius:5 }}>⭐ Destacado</span>}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display:'flex', borderTop:'1px solid #f8fafc' }}>
        <button onClick={onEdit} style={{ flex:1, padding:'8px 0', border:'none', background:'none',
          cursor:'pointer', fontSize:11, fontWeight:600, color:'#7c3aed',
          display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}
          onMouseEnter={e => (e.currentTarget.style.background='#f5f3ff')}
          onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
          <Edit3 size={12}/> Editar
        </button>
        <div style={{ width:1, background:'#f8fafc' }}/>
        <button onClick={onDuplicate} style={{ flex:1, padding:'8px 0', border:'none', background:'none',
          cursor:'pointer', fontSize:11, fontWeight:600, color:'#64748b',
          display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}
          onMouseEnter={e => (e.currentTarget.style.background='#f8fafc')}
          onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
          <Copy size={12}/> Duplicar
        </button>
      </div>
    </div>
  )
}

const pagBtn: React.CSSProperties = {
  display:'flex', alignItems:'center', gap:4, padding:'7px 12px',
  border:'1px solid #e2e8f0', borderRadius:8, background:'#fff',
  cursor:'pointer', fontSize:12, fontWeight:600, color:'#475569',
  transition:'all .15s',
}
