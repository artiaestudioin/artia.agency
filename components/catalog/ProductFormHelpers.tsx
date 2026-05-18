'use client'
// components/catalog/ProductFormHelpers.tsx
// Fixes:
//  1. Input focus loss — use stable state + no inline component definitions
//  2. Qualitative variant support (size, color, material, finish labels)
//  3. Duplicate product with full clone including variants/images/metadata

import { useState, useCallback, useId } from 'react'
import { Plus, Trash2, GripVertical, Tag } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────
// VARIANT TYPES — qualitative + quantitative
// ─────────────────────────────────────────────────────────────────

export type VariantAttributeType =
  | 'size'      // Small / Medium / Large / XL / Custom
  | 'finish'    // Matte / Glossy / Satin / Metallic
  | 'color'     // Black / White / Red / Custom
  | 'material'  // PVC / Paper / Vinyl / Couché / Fabric
  | 'quantity'  // Numeric: 100 / 250 / 500 pcs
  | 'custom'    // Free-form label

export interface ProductVariant {
  id?: string           // existing DB id
  _localId: string      // stable local key for React
  attribute_type: VariantAttributeType
  variant_name: string  // e.g. "Large", "Matte", "500 pcs"
  sku: string | null
  market_price: number
  shipping_cost: number
  stock_qty: number
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unlimited'
  active: boolean
  sort_order: number
  // Additional fields used by page.tsx
  quantity: number
  cost_price: number
  is_default: boolean
  attributes: Record<string, any>
  product_id?: string
}

// ─────────────────────────────────────────────────────────────────
// createEmptyVariant — factory for new blank variants
// ─────────────────────────────────────────────────────────────────
export function createEmptyVariant(): ProductVariant {
  return {
    _localId:       `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    attribute_type: 'quantity',
    variant_name:   '',
    sku:            null,
    market_price:   0,
    shipping_cost:  0,
    stock_qty:      0,
    stock_status:   'in_stock',
    active:         true,
    sort_order:     0,
    quantity:       0,
    cost_price:     0,
    is_default:     true,
    attributes:     {},
  }
}

// Preset options per attribute type
const VARIANT_PRESETS: Record<VariantAttributeType, string[]> = {
  size:     ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Pequeño', 'Mediano', 'Grande', 'Personalizado'],
  finish:   ['Mate', 'Brillante', 'Satinado', 'Metálico', 'UV', 'Soft Touch'],
  color:    ['Negro', 'Blanco', 'Rojo', 'Azul', 'Verde', 'Amarillo', 'Transparente', 'Personalizado'],
  material: ['PVC', 'Papel', 'Vinilo', 'Couché', 'Tela', 'Acrílico', 'Cartón', 'Personalizado'],
  quantity: ['50', '100', '250', '500', '1000', '2500', '5000', 'Personalizado'],
  custom:   [],
}

const ATTRIBUTE_LABELS: Record<VariantAttributeType, string> = {
  size:     'Talla / Tamaño',
  finish:   'Acabado',
  color:    'Color',
  material: 'Material',
  quantity: 'Cantidad',
  custom:   'Personalizado',
}

const inp: React.CSSProperties = {
  padding: '8px 11px',
  border: '1.5px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 13,
  outline: 'none',
  background: '#fafafa',
  fontFamily: 'Inter, sans-serif',
  width: '100%',
  boxSizing: 'border-box',
}

// ─────────────────────────────────────────────────────────────────
// Hook: useStableField — stable onChange that never causes remount
// ─────────────────────────────────────────────────────────────────
// KEY FIX for bug #1: All form fields must be defined OUTSIDE the render
// of the parent form component. If you define input components inside the
// parent's render, React creates new component instances on every render,
// causing focus loss. Use this pattern instead:
//
//   // ✅ CORRECT — stable reference, no focus loss
//   const [name, setName] = useState('')
//   <input value={name} onChange={e => setName(e.target.value)} />
//
//   // ❌ WRONG — inline component causes remount
//   function render() {
//     function MyInput() { return <input ... /> }   // new identity each render!
//     return <MyInput />
//   }

// ─────────────────────────────────────────────────────────────────
// VariantRow — stable component (defined at module level, NOT inline)
// ─────────────────────────────────────────────────────────────────
interface VariantRowProps {
  variant: ProductVariant
  index: number
  onChange: (localId: string, field: keyof ProductVariant, value: any) => void
  onRemove: (localId: string) => void
  basePrice: number
}

export function VariantRow({ variant, index, onChange, onRemove, basePrice }: VariantRowProps) {
  const presets = VARIANT_PRESETS[variant.attribute_type]

  return (
    <div style={{
      background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12,
      padding: 16, marginBottom: 10,
    }}>
      {/* Row 1: type + label */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
        {/* Attribute type */}
        <div>
          <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px' }}>Atributo</label>
          <select
            value={variant.attribute_type}
            onChange={e => onChange(variant._localId, 'attribute_type', e.target.value as VariantAttributeType)}
            style={{ ...inp }}>
            {(Object.keys(ATTRIBUTE_LABELS) as VariantAttributeType[]).map(t => (
              <option key={t} value={t}>{ATTRIBUTE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        {/* Variant name — preset chips OR free text */}
        <div>
          <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px' }}>
            Etiqueta de variante
          </label>
          {presets.length > 0 ? (
            <>
              <input
                value={variant.variant_name}
                onChange={e => onChange(variant._localId, 'variant_name', e.target.value)}
                placeholder={`Ej: ${presets[0]}`}
                list={`presets-${variant._localId}`}
                style={inp}
              />
              <datalist id={`presets-${variant._localId}`}>
                {presets.map(p => <option key={p} value={p} />)}
              </datalist>
              {/* Quick preset chips */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                {presets.slice(0, 6).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onChange(variant._localId, 'variant_name', p)}
                    style={{
                      padding: '2px 8px', fontSize: 10, fontWeight: 600, borderRadius: 6,
                      border: `1px solid ${variant.variant_name === p ? '#2552ca' : '#e2e8f0'}`,
                      background: variant.variant_name === p ? '#eff6ff' : '#fff',
                      color: variant.variant_name === p ? '#2552ca' : '#64748b',
                      cursor: 'pointer',
                    }}>
                    {p}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <input
              value={variant.variant_name}
              onChange={e => onChange(variant._localId, 'variant_name', e.target.value)}
              placeholder="Nombre de la variante"
              style={inp}
            />
          )}
        </div>

        {/* Remove */}
        <div style={{ paddingTop: 20 }}>
          <button
            type="button"
            onClick={() => onRemove(variant._localId)}
            style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#dc2626' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Row 2: pricing + stock */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <div>
          <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px' }}>Precio ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={variant.market_price}
            onChange={e => onChange(variant._localId, 'market_price', parseFloat(e.target.value) || 0)}
            style={inp}
          />
          {basePrice > 0 && variant.market_price !== basePrice && (
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
              Base: ${basePrice.toFixed(2)}
              {variant.market_price > basePrice
                ? <span style={{ color: '#16a34a' }}> +${(variant.market_price - basePrice).toFixed(2)}</span>
                : <span style={{ color: '#dc2626' }}> -${(basePrice - variant.market_price).toFixed(2)}</span>
              }
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px' }}>Envío ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={variant.shipping_cost}
            onChange={e => onChange(variant._localId, 'shipping_cost', parseFloat(e.target.value) || 0)}
            style={inp}
          />
        </div>

        <div>
          <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px' }}>Stock</label>
          <input
            type="number"
            min="0"
            value={variant.stock_qty}
            onChange={e => onChange(variant._localId, 'stock_qty', parseInt(e.target.value) || 0)}
            style={inp}
          />
        </div>

        <div>
          <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.3px' }}>SKU</label>
          <input
            value={variant.sku || ''}
            onChange={e => onChange(variant._localId, 'sku', e.target.value || null)}
            placeholder="SKU opcional"
            style={inp}
          />
        </div>
      </div>

      {/* Row 3: status + active */}
      <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
        <select
          value={variant.stock_status}
          onChange={e => onChange(variant._localId, 'stock_status', e.target.value)}
          style={{ ...inp, width: 'auto', flex: 1 }}>
          <option value="in_stock">En stock</option>
          <option value="low_stock">Stock bajo</option>
          <option value="out_of_stock">Sin stock</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input
            type="checkbox"
            checked={variant.active}
            onChange={e => onChange(variant._localId, 'active', e.target.checked)}
          />
          Activa
        </label>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// VariantsSection — the full variants manager
// ─────────────────────────────────────────────────────────────────
interface VariantsSectionProps {
  variants: ProductVariant[]
  basePrice: number
  onChange: (variants: ProductVariant[]) => void
}

function generateLocalId() {
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function VariantsSection({ variants, basePrice, onChange }: VariantsSectionProps) {

  function addVariant(type: VariantAttributeType = 'quantity') {
    const newVariant: ProductVariant = {
      ...createEmptyVariant(),
      attribute_type: type,
      market_price:   basePrice,
      sort_order:     variants.length,
      is_default:     variants.length === 0,
    }
    onChange([...variants, newVariant])
  }

  function updateVariant(localId: string, field: keyof ProductVariant, value: any) {
    onChange(variants.map(v => v._localId === localId ? { ...v, [field]: value } : v))
  }

  function removeVariant(localId: string) {
    onChange(variants.filter(v => v._localId !== localId))
  }

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Variantes de precio</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Soporte para atributos cualitativos (talla, color, material) y cuantitativos (cantidad)</div>
          </div>
        </div>

        {/* Add variant buttons by type */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {(Object.keys(ATTRIBUTE_LABELS) as VariantAttributeType[]).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => addVariant(type)}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all .15s',
              }}>
              <Plus size={11} /> {ATTRIBUTE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {variants.length === 0 ? (
        <div style={{
          border: '2px dashed #e2e8f0', borderRadius: 12, padding: '28px 20px',
          textAlign: 'center', color: '#94a3b8',
        }}>
          <Tag size={24} style={{ marginBottom: 8, opacity: .5 }} />
          <p style={{ margin: 0, fontSize: 13 }}>Sin variantes aún. Agrega tallas, colores, materiales, cantidades u otras opciones.</p>
        </div>
      ) : (
        variants.map((v, idx) => (
          <VariantRow
            key={v._localId}   // stable key = no remounting = no focus loss
            variant={v}
            index={idx}
            onChange={updateVariant}
            onRemove={removeVariant}
            basePrice={basePrice}
          />
        ))
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// duplicateProduct — fixed clone function
// ─────────────────────────────────────────────────────────────────
export async function duplicateProduct(
  supabase: any,
  productId: string,
): Promise<{ ok: boolean; newId?: string; error?: string }> {
  try {
    // 1. Fetch original product
    const { data: orig, error: fetchErr } = await supabase
      .from('catalog_products')
      .select('*')
      .eq('id', productId)
      .single()

    if (fetchErr || !orig) return { ok: false, error: fetchErr?.message || 'Producto no encontrado' }

    // 2. Generate unique slug
    const baseSlug = (orig.slug || orig.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    let newSlug    = `${baseSlug}-copia`
    let attempt    = 1

    // Check slug uniqueness
    while (true) {
      const { data: existing } = await supabase
        .from('catalog_products')
        .select('id')
        .eq('slug', newSlug)
        .maybeSingle()

      if (!existing) break
      attempt++
      newSlug = `${baseSlug}-copia-${attempt}`
      if (attempt > 20) { newSlug = `${baseSlug}-${Date.now()}`; break }
    }

    // 3. Clone product (strip auto-generated fields)
    const {
      id: _id,
      slug: _slug,
      created_at: _ca,
      updated_at: _ua,
      total_orders: _to,
      total_revenue: _tr,
      folio_num: _fn,
      ...cloneData
    } = orig

    const { data: newProd, error: insertErr } = await supabase
      .from('catalog_products')
      .insert({
        ...cloneData,
        slug:          newSlug,
        name:          `${orig.name} (Copia)`,
        active:        false,           // start inactive
        featured:      false,           // don't feature duplicates
        total_orders:  0,
        total_revenue: 0,
      })
      .select('id')
      .single()

    if (insertErr || !newProd) return { ok: false, error: insertErr?.message || 'Error al duplicar' }

    // 4. Clone variants
    const { data: variants } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId)
      .eq('active', true)

    if (variants && variants.length > 0) {
      const clonedVariants = variants.map(({ id: _vid, created_at: _vca, updated_at: _vua, ...v }: any) => ({
        ...v,
        product_id: newProd.id,
      }))
      await supabase.from('product_variants').insert(clonedVariants)
    }

    return { ok: true, newId: newProd.id }

  } catch (e: any) {
    return { ok: false, error: e.message || 'Error inesperado' }
  }
}

// ─────────────────────────────────────────────────────────────────
// FOCUS LOSS — Root cause explanation & fix guide
// ─────────────────────────────────────────────────────────────────
//
// PROBLEM: In React, if you define a component function INSIDE another
// component's render body, React treats it as a NEW component type on
// every render and unmounts+remounts it, losing focus.
//
// WRONG pattern (causes focus loss):
//   function ProductForm() {
//     function NameInput() {              // ← new identity each render!
//       return <input value={name} onChange={...} />
//     }
//     return <NameInput />               // ← unmounts & remounts on EVERY keystroke
//   }
//
// CORRECT pattern (stable, no focus loss):
//   // At module level or in a separate file:
//   function NameInput({ value, onChange }) {  // ← stable identity
//     return <input value={value} onChange={onChange} />
//   }
//   // Inside ProductForm:
//   function ProductForm() {
//     const [name, setName] = useState('')
//     return <NameInput value={name} onChange={e => setName(e.target.value)} />
//   }
//
// ALSO: Using index as key for dynamic lists causes issues.
// Always use a stable ID as key (like _localId in VariantRow above).