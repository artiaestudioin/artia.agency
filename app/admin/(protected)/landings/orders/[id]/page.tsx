// app/admin/landings/orders/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Editar Pedido — Artia Admin' }

// Server Action para actualizar (INTACTA, NO TOCAR)
async function updateOrder(formData: FormData) {
  'use server'
  
  const id = formData.get('id') as string
  const status = formData.get('status') as string
  const payment_status = formData.get('payment_status') as string
  const payment_method = formData.get('payment_method') as string
  const design_description = formData.get('design_description') as string
  const tracking_number = formData.get('tracking_number') as string
  const tracking_url = formData.get('tracking_url') as string
  const address = formData.get('address') as string
  const city = formData.get('city') as string
  const total = parseFloat(formData.get('total') as string) || 0
  const quantity = parseInt(formData.get('quantity') as string) || 1
  const price = parseFloat(formData.get('price') as string) || 0
  
  const supabase = await createClient()
  
  const updateData: any = {
    status,
    payment_status,
    payment_method,
    design_description,
    tracking_number,
    tracking_url,
    address,
    city,
    total,
    quantity,
    price,
    updated_at: new Date().toISOString()
  }

  Object.keys(updateData).forEach(key => {
    if (updateData[key] === '' || updateData[key] === null || updateData[key] === undefined) {
      delete updateData[key]
    }
  })

  const { error } = await supabase
    .from('landing_orders')
    .update(updateData)
    .eq('id', id)
  
  if (error) {
    console.error('Update error:', error)
    throw new Error(error.message)
  }
  
  redirect(`/admin/landings/orders/${id}?updated=1`)
}

// ─── Timeline steps para productos (horizontal) ───
const ORDER_STEPS = [
  { status: 'pending',       label: 'Pedido recibido',     sublabel: 'Hemos recibido tu orden',           icon: '◎', code: 'RECV' },
  { status: 'confirmed',     label: 'Confirmado',          sublabel: 'Pago verificado, preparando todo',  icon: '◈', code: 'CONF' },
  { status: 'in_production', label: 'En producción',       sublabel: 'Tu producto está siendo creado',   icon: '⬡', code: 'PROD' },
  { status: 'shipped',       label: 'Enviado',             sublabel: 'En camino a tu dirección',          icon: '✈', code: 'SHIP' },
  { status: 'delivered',     label: 'Entregado',           sublabel: '¡Producto recibido con éxito!',     icon: '★', code: 'DONE' },
]

const STATUS_IDX: Record<string, number> = {
  pending: 0, confirmed: 1, in_production: 2, shipped: 3, delivered: 4, cancelled: 4, refunded: 4,
}

const STATUS_LABELS: Record<string, { label: string; color: string; rgb: string }> = {
  pending:       { label: 'Pendiente',       color: '#92400e', rgb: '146,64,14' },
  confirmed:     { label: 'Confirmado',      color: '#1e40af', rgb: '30,64,175' },
  in_production: { label: 'En Producción',   color: '#6b21a8', rgb: '107,33,168' },
  shipped:       { label: 'Enviado',         color: '#0e7490', rgb: '14,116,144' },
  delivered:     { label: 'Entregado',       color: '#166534', rgb: '22,101,52' },
  cancelled:     { label: 'Cancelado',       color: '#991b1b', rgb: '153,27,27' },
  refunded:      { label: 'Reembolsado',     color: '#6b7280', rgb: '107,114,128' },
}

function getAccent(status: string | null) {
  const s = status ?? 'pending'
  const mapped = STATUS_LABELS[s] || STATUS_LABELS.pending
  return {
    color: mapped.color,
    rgb: mapped.rgb,
    soft: `rgba(${mapped.rgb},.1)`,
    border: `rgba(${mapped.rgb},.2)`,
  }
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

export default async function EditOrderPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>
  searchParams: Promise<{ updated?: string }>
}) {
  const { id } = await params
  const { updated } = await searchParams
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('landing_orders')
    .select('*, landing:landing_id(name, slug)')
    .eq('id', id)
    .single()

  if (!order) return notFound()

  const accent = getAccent(order.status)
  const currentStepIdx = STATUS_IDX[order.status] ?? 0
  const currentStep = ORDER_STEPS[currentStepIdx] || ORDER_STEPS[0]
  const isFinished = ['delivered', 'cancelled', 'refunded'].includes(order.status)
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded'

  const statusOptions = [
    { value: 'pending', label: 'Pendiente', color: '#92400e', bg: '#fef3c7' },
    { value: 'confirmed', label: 'Confirmado', color: '#1e40af', bg: '#eff6ff' },
    { value: 'in_production', label: 'En Producción', color: '#6b21a8', bg: '#f5f3ff' },
    { value: 'shipped', label: 'Enviado', color: '#0e7490', bg: '#ecfeff' },
    { value: 'delivered', label: 'Entregado', color: '#166534', bg: '#dcfce7' },
    { value: 'cancelled', label: 'Cancelado', color: '#991b1b', bg: '#fee2e2' },
    { value: 'refunded', label: 'Reembolsado', color: '#6b7280', bg: '#f3f4f6' },
  ]

  const paymentStatusOptions = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'partial', label: 'Parcial' },
    { value: 'paid', label: 'Pagado' },
    { value: 'failed', label: 'Fallido' },
    { value: 'refunded', label: 'Reembolsado' },
  ]

  const paymentMethodOptions = [
    { value: 'transfer', label: 'Transferencia' },
    { value: 'cash', label: 'Efectivo' },
    { value: 'card', label: 'Tarjeta' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'mercadopago', label: 'MercadoPago' },
  ]

  const currentStatus = statusOptions.find(s => s.value === order.status) || statusOptions[0]

  return (
    <div className="order-track-page">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --arc: ${accent.rgb};
          --accent: ${accent.color};
          --accent-soft: ${accent.soft};
          --accent-border: ${accent.border};
        }
      ` }} />

      {/* Background blobs */}
      <div className="ot-blobs">
        <div className="ot-blob" />
        <div className="ot-blob" />
        <div className="ot-blob" />
      </div>

      <div className="ot-container">
        {/* Header / Breadcrumb */}
        <div className="ot-header">
          <Link href="/admin/landings/orders" className="ot-back">
            ← Volver a pedidos
          </Link>
          <div className="ot-brand">
            <span className="ot-brand-text">ARTIA<span className="ot-brand-dot" />STUDIO</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="ot-card">
          {/* Corner brackets */}
          <div className="ot-c ot-c-tl" />
          <div className="ot-c ot-c-tr" />
          <div className="ot-c ot-c-bl" />
          <div className="ot-c ot-c-br" />

          {/* Card Header */}
          <div className="ot-card-hdr">
            <div className="ot-hdr-glow" />
            <div className="ot-hdr-top">
              <div>
                <div className="ot-folio-label">
                  <span className="ot-fl-line" />
                  Pedido
                </div>
                <div className="ot-folio-id" data-text={order.folio}>
                  {order.folio?.split('').map((ch: string, i: number) => (
                    <span key={i} className="ot-ch" style={{ animationDelay: `${0.55 + i * 0.05}s` }}>{ch}</span>
                  )) || '—'}
                </div>
                {order.product_name && (
                  <div className="ot-svc">
                    <span className="ot-svc-dot" />
                    {order.product_name}
                  </div>
                )}
              </div>
              <div className="ot-client-blk">
                <div className="ot-client-lbl">Cliente</div>
                <div className="ot-client-name">{order.name}</div>
                <div className="ot-client-phone">{order.phone}</div>
              </div>
            </div>

            {/* Status bar */}
            <div className="ot-sbar">
              <div className={`ot-sbar-icon ${isCancelled ? 'cancelled' : ''}`}>
                {isCancelled ? '✕' : currentStep?.icon}
              </div>
              <div className="ot-sbar-text">
                <div className="ot-sbar-title">
                  {isCancelled ? STATUS_LABELS[order.status]?.label : currentStep?.label}
                </div>
                <div className="ot-sbar-sub">
                  {isCancelled ? 'Este pedido ha sido cancelado' : currentStep?.sublabel}
                </div>
              </div>
              <div className="ot-sbar-code">{currentStep?.code}</div>
            </div>
          </div>

          {/* Metrics */}
          <div className="ot-metrics">
            <div className="ot-met">
              <div className="ot-met-k">Progreso</div>
              <div className="ot-met-v hi">{isCancelled ? '—' : `${currentStepIdx + 1} / ${ORDER_STEPS.length}`}</div>
            </div>
            <div className="ot-met">
              <div className="ot-met-k">Estado</div>
              <div className="ot-met-v">{currentStatus.label}</div>
            </div>
            <div className="ot-met">
              <div className="ot-met-k">Total</div>
              <div className="ot-met-v hi">{fmtMoney(order.total || 0)}</div>
            </div>
            <div className="ot-met">
              <div className="ot-met-k">Cantidad</div>
              <div className="ot-met-v">{order.quantity || 1}</div>
            </div>
            <div className="ot-met">
              <div className="ot-met-k">Fecha</div>
              <div className="ot-met-v sm">
                {new Date(order.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
              </div>
            </div>
          </div>

          {/* ─── HORIZONTAL TIMELINE ─── */}
          <div className="ot-timeline-section">
            <div className="ot-tl-head">
              <div className="ot-tl-head-txt">Seguimiento del pedido</div>
              <div className="ot-tl-head-line" />
            </div>
            
            <div className="ot-timeline-h">
              {/* Track line */}
              <div className="ot-track-h">
                <div 
                  className="ot-track-fill-h" 
                  style={{ 
                    width: isCancelled ? '100%' : `${Math.min((currentStepIdx / (ORDER_STEPS.length - 1)) * 100, 100)}%` 
                  }} 
                />
              </div>

              {/* Steps */}
              <div className="ot-steps-h">
                {ORDER_STEPS.map((step, i) => {
                  const done = i < currentStepIdx && !isCancelled
                  const active = i === currentStepIdx && !isCancelled
                  const pend = i > currentStepIdx && !isCancelled
                  const cancelledAt = isCancelled && i === 0

                  return (
                    <div key={step.status} className={`ot-step-h ${done ? 'done' : active ? 'active' : ''} ${cancelledAt ? 'cancelled-step' : ''}`}>
                      <div className={`ot-node-h ${done ? 'done' : active ? 'active' : pend ? 'pending' : cancelledAt ? 'cancelled' : ''}`}>
                        {done ? '✓' : cancelledAt ? '✕' : step.icon}
                      </div>
                      <div className="ot-step-info">
                        <div className={`ot-step-name ${pend && !cancelledAt ? 'dim' : ''}`}>
                          {step.label}
                          {active && <span className="ot-badge">EN CURSO</span>}
                        </div>
                        <div className={`ot-step-sub ${!pend || cancelledAt ? 'lit' : ''}`}>
                          {cancelledAt ? 'Pedido cancelado' : step.sublabel}
                        </div>
                        <div className="ot-step-code">{step.code}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ─── FORMULARIO DE EDICIÓN (manteniendo toda la lógica) ─── */}
          <div className="ot-form-section">
            <div className="ot-section-head">
              <div className="ot-section-line" />
              <span className="ot-section-title">Editar pedido</span>
              <div className="ot-section-line" style={{ flex: 1 }} />
            </div>

            {updated && (
              <div className="ot-updated-banner">
                ✅ Pedido actualizado correctamente
              </div>
            )}

            <form action={updateOrder} className="ot-form">
              <input type="hidden" name="id" value={order.id} />

              {/* Grid 2 cols */}
              <div className="ot-form-grid">
                {/* Cliente */}
                <div className="ot-form-card">
                  <h3 className="ot-form-card-title">👤 Cliente</h3>
                  <div className="ot-form-fields">
                    <div className="ot-field">
                      <label className="ot-field-label">Nombre</label>
                      <div className="ot-field-static">{order.name}</div>
                    </div>
                    <div className="ot-field">
                      <label className="ot-field-label">Email</label>
                      <div className="ot-field-static">{order.email || '—'}</div>
                    </div>
                    <div className="ot-field">
                      <label className="ot-field-label">Teléfono</label>
                      <div className="ot-field-static">{order.phone}</div>
                    </div>
                    <div className="ot-field">
                      <label className="ot-field-label">Dirección</label>
                      <input type="text" name="address" defaultValue={order.address || ''} placeholder="Dirección de entrega" className="ot-input" />
                    </div>
                    <div className="ot-field">
                      <label className="ot-field-label">Ciudad</label>
                      <input type="text" name="city" defaultValue={order.city || ''} placeholder="Ciudad" className="ot-input" />
                    </div>
                  </div>
                </div>

                {/* Producto */}
                <div className="ot-form-card">
                  <h3 className="ot-form-card-title">🎯 Producto</h3>
                  <div className="ot-form-fields">
                    <div className="ot-field">
                      <label className="ot-field-label">Landing</label>
                      <div className="ot-field-static">{order.landing?.name || '—'}</div>
                    </div>
                    <div className="ot-field">
                      <label className="ot-field-label">Producto</label>
                      <div className="ot-field-static">{order.product_name || '—'}</div>
                    </div>
                    <div className="ot-field-row">
                      <div className="ot-field">
                        <label className="ot-field-label">Cantidad</label>
                        <input type="number" name="quantity" min="1" defaultValue={order.quantity || 1} className="ot-input" />
                      </div>
                      <div className="ot-field">
                        <label className="ot-field-label">Precio</label>
                        <input type="number" name="price" step="0.01" defaultValue={order.price || 0} className="ot-input" />
                      </div>
                      <div className="ot-field">
                        <label className="ot-field-label">Total</label>
                        <input type="number" name="total" step="0.01" defaultValue={order.total || 0} className="ot-input" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estado y Pago */}
              <div className="ot-form-card">
                <h3 className="ot-form-card-title">⚙️ Estado del Pedido</h3>
                <div className="ot-form-row-3">
                  <div className="ot-field">
                    <label className="ot-field-label">Estado</label>
                    <select name="status" defaultValue={order.status} className="ot-select">
                      {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ot-field">
                    <label className="ot-field-label">Estado de Pago</label>
                    <select name="payment_status" defaultValue={order.payment_status || 'pending'} className="ot-select">
                      {paymentStatusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ot-field">
                    <label className="ot-field-label">Método de Pago</label>
                    <select name="payment_method" defaultValue={order.payment_method || ''} className="ot-select">
                      <option value="">— Seleccionar —</option>
                      {paymentMethodOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Tracking */}
              <div className="ot-form-card">
                <h3 className="ot-form-card-title">📦 Tracking y Envío</h3>
                <div className="ot-form-row-2">
                  <div className="ot-field">
                    <label className="ot-field-label">Número de Tracking</label>
                    <input type="text" name="tracking_number" defaultValue={order.tracking_number || ''} placeholder="Ej: TRK123456" className="ot-input" />
                  </div>
                  <div className="ot-field">
                    <label className="ot-field-label">URL de Tracking</label>
                    <input type="url" name="tracking_url" defaultValue={order.tracking_url || ''} placeholder="https://..." className="ot-input" />
                  </div>
                </div>
              </div>

              {/* Diseño */}
              <div className="ot-form-card">
                <h3 className="ot-form-card-title">🎨 Descripción del Diseño</h3>
                <textarea name="design_description" rows={4} defaultValue={order.design_description || ''} placeholder="Detalles del diseño, preferencias del cliente, etc." className="ot-textarea" />
              </div>

              {/* UTM / Meta (solo lectura) */}
              {(order.utm_source || order.utm_medium || order.utm_campaign) && (
                <div className="ot-form-card ot-readonly">
                  <h3 className="ot-form-card-title">📊 Tracking Marketing</h3>
                  <div className="ot-form-row-3">
                    <div className="ot-field">
                      <label className="ot-field-label">UTM Source</label>
                      <div className="ot-field-static">{order.utm_source || '—'}</div>
                    </div>
                    <div className="ot-field">
                      <label className="ot-field-label">UTM Medium</label>
                      <div className="ot-field-static">{order.utm_medium || '—'}</div>
                    </div>
                    <div className="ot-field">
                      <label className="ot-field-label">UTM Campaign</label>
                      <div className="ot-field-static">{order.utm_campaign || '—'}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="ot-form-actions">
                <Link href="/admin/landings/orders" className="ot-btn-secondary">Cancelar</Link>
                <button type="submit" className="ot-btn-primary">💾 Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="ot-footer">
          <p>ARTIA STUDIO · ECUADOR · {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  )
}

// ─── CSS COMPLETO ───
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .order-track-page {
    background: #f9fafb;
    min-height: 100vh;
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
    position: relative;
    overflow-x: hidden;
  }

  /* ─── Background blobs ─── */
  .ot-blobs { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
  .ot-blob {
    position: absolute; border-radius: 50%;
    filter: blur(80px); opacity: 0;
    animation: otBlobMove 16s ease-in-out infinite;
  }
  .ot-blob:nth-child(1) {
    width: 600px; height: 400px; top: -5%; left: -10%;
    background: radial-gradient(ellipse, rgba(var(--arc), .1) 0%, transparent 70%);
  }
  .ot-blob:nth-child(2) {
    width: 500px; height: 500px; bottom: 0; right: -10%;
    background: radial-gradient(ellipse, rgba(var(--arc), .07) 0%, transparent 70%);
    animation-delay: -8s;
  }
  .ot-blob:nth-child(3) {
    width: 400px; height: 300px; top: 40%; left: 30%;
    background: radial-gradient(ellipse, rgba(236,72,153,.04) 0%, transparent 70%);
    animation-delay: -4s; animation-duration: 20s;
  }
  @keyframes otBlobMove {
    0%   { opacity: 0; transform: translate(0,0) scale(1); }
    15%  { opacity: 1; }
    50%  { transform: translate(30px,-20px) scale(1.06); }
    85%  { opacity: 0.6; }
    100% { opacity: 0; transform: translate(0,0) scale(1); }
  }

  /* ─── Container ─── */
  .ot-container {
    position: relative; z-index: 10;
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 20px 80px;
  }

  /* ─── Header ─── */
  .ot-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
  }
  .ot-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
    text-decoration: none;
    padding: 8px 16px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    transition: all .2s;
  }
  .ot-back:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
    color: #0f172a;
  }
  .ot-brand {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ot-brand-text {
    font-family: 'Syne', sans-serif;
    font-size: 13px; font-weight: 800;
    letter-spacing: 6px; text-transform: uppercase;
    color: #9ca3af;
  }
  .ot-brand-dot {
    display: inline-block; width: 5px; height: 5px; border-radius: 50%;
    background: var(--accent); margin: 0 6px; vertical-align: middle;
    animation: otBlink 2s ease-in-out infinite;
  }
  @keyframes otBlink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.5)} }

  /* ─── Card ─── */
  .ot-card {
    background: #ffffff;
    border: 1px solid rgba(0,0,0,.07);
    border-radius: 22px; overflow: visible;
    box-shadow:
      0 0 0 1px rgba(var(--arc),.07),
      0 4px 6px rgba(0,0,0,.03),
      0 20px 60px rgba(var(--arc),.06),
      0 60px 100px rgba(0,0,0,.05);
    position: relative;
    animation: otCardUp 1.1s cubic-bezier(.22,1,.36,1) .3s forwards;
    opacity: 0; transform: translateY(40px) scale(.97);
  }
  @keyframes otCardUp { to { opacity: 1; transform: translateY(0) scale(1); } }

  /* Corner brackets */
  .ot-c { position: absolute; width: 12px; height: 12px; opacity: .4; z-index: 5; }
  .ot-c-tl { top: 12px; left: 12px; border-top: 1.5px solid var(--accent); border-left: 1.5px solid var(--accent); border-radius: 3px 0 0 0; }
  .ot-c-tr { top: 12px; right: 12px; border-top: 1.5px solid var(--accent); border-right: 1.5px solid var(--accent); border-radius: 0 3px 0 0; }
  .ot-c-bl { bottom: 12px; left: 12px; border-bottom: 1.5px solid var(--accent); border-left: 1.5px solid var(--accent); border-radius: 0 0 0 3px; }
  .ot-c-br { bottom: 12px; right: 12px; border-bottom: 1.5px solid var(--accent); border-right: 1.5px solid var(--accent); border-radius: 0 0 3px 0; }

  /* ─── Card Header ─── */
  .ot-card-hdr {
    padding: 34px 34px 28px;
    position: relative; overflow: hidden;
    border-bottom: 1px solid rgba(0,0,0,.05);
    border-radius: 22px 22px 0 0;
  }
  .ot-hdr-glow {
    position: absolute; top: -80px; right: -80px;
    width: 280px; height: 280px; border-radius: 50%;
    background: radial-gradient(ellipse, rgba(var(--arc),.09) 0%, transparent 65%);
    pointer-events: none;
    animation: otGlowPulse 5s ease-in-out infinite;
  }
  @keyframes otGlowPulse { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.2);opacity:1} }
  .ot-hdr-top { display: flex; justify-content: space-between; align-items: flex-start; }

  .ot-folio-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px; letter-spacing: 4px; text-transform: uppercase;
    color: var(--accent); margin-bottom: 10px;
    display: flex; align-items: center; gap: 8px;
    opacity: 0; animation: otFadeIn .6s ease .8s forwards;
  }
  .ot-fl-line { width: 16px; height: 1px; background: var(--accent); opacity: .5; }

  .ot-folio-id {
    font-family: 'Syne', sans-serif;
    font-size: 28px; font-weight: 800;
    color: #111827; letter-spacing: 1px; line-height: 1;
    position: relative;
  }
  .ot-ch {
    display: inline-block; opacity: 0; transform: translateY(10px);
    animation: otCharIn .4s cubic-bezier(.22,1,.36,1) forwards;
  }
  @keyframes otCharIn { to { opacity: 1; transform: translateY(0); } }
  @keyframes otFadeIn { to { opacity: 1; } }

  .ot-svc {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--accent-soft); border: 1px solid var(--accent-border);
    border-radius: 100px; padding: 5px 13px; margin-top: 12px;
    font-size: 11px; font-weight: 500; color: var(--accent); letter-spacing: .3px;
    opacity: 0; animation: otFadeIn .6s ease 1.5s forwards;
  }
  .ot-svc-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); animation: otBlink 2s ease-in-out infinite; }

  .ot-client-blk { text-align: right; opacity: 0; animation: otFadeIn .6s ease 1s forwards; }
  .ot-client-lbl {
    font-family: 'Space Mono', monospace;
    font-size: 7px; letter-spacing: 3px; text-transform: uppercase;
    color: #9ca3af; margin-bottom: 4px;
  }
  .ot-client-name {
    font-family: 'Syne', sans-serif;
    font-size: 17px; font-weight: 700; color: #111827; letter-spacing: .3px;
  }
  .ot-client-phone {
    font-family: 'Space Mono', monospace;
    font-size: 11px; color: #6b7280; margin-top: 4px;
  }

  /* Status bar */
  .ot-sbar {
    display: flex; align-items: center; gap: 12px;
    background: var(--accent-soft); border: 1px solid var(--accent-border);
    border-radius: 12px; padding: 12px 15px; margin-top: 20px;
    opacity: 0; animation: otFadeIn .6s ease 1.6s forwards;
  }
  .ot-sbar-icon {
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(var(--arc),.12); border: 1.5px solid rgba(var(--arc),.25);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; color: var(--accent);
    position: relative; flex-shrink: 0;
    animation: otIconPulse 3s ease-in-out infinite 2s;
  }
  .ot-sbar-icon.cancelled {
    background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.3); color: #ef4444;
    animation: none;
  }
  @keyframes otIconPulse {
    0%,100% { box-shadow: 0 0 0 4px rgba(var(--arc),.05), 0 0 12px rgba(var(--arc),.1); }
    50%      { box-shadow: 0 0 0 10px rgba(var(--arc),.03), 0 0 22px rgba(var(--arc),.18); }
  }
  .ot-sbar-text { flex: 1; }
  .ot-sbar-title { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: #111827; }
  .ot-sbar-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .ot-sbar-code {
    font-family: 'Space Mono', monospace; font-size: 9px; letter-spacing: 2px;
    color: var(--accent); padding: 3px 9px;
    background: rgba(var(--arc),.08); border-radius: 6px; border: 1px solid var(--accent-border);
  }

  /* ─── Metrics ─── */
  .ot-metrics { display: grid; grid-template-columns: repeat(5, 1fr); border-bottom: 1px solid rgba(0,0,0,.05); }
  .ot-met { padding: 16px 18px; border-right: 1px solid rgba(0,0,0,.04); opacity: 0; animation: otFadeIn .6s ease 1.8s forwards; }
  .ot-met:last-child { border-right: none; }
  .ot-met-k { font-family: 'Space Mono', monospace; font-size: 7px; letter-spacing: 3px; text-transform: uppercase; color: #9ca3af; margin-bottom: 6px; }
  .ot-met-v { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 800; color: #111827; }
  .ot-met-v.hi { color: var(--accent); }
  .ot-met-v.sm { font-size: 11px; font-weight: 600; }

  /* ─── Horizontal Timeline ─── */
  .ot-timeline-section { padding: 30px 34px; border-bottom: 1px solid rgba(0,0,0,.05); }
  .ot-tl-head { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; opacity: 0; animation: otFadeIn .6s ease 1.9s forwards; }
  .ot-tl-head-txt { font-family: 'Space Mono', monospace; font-size: 8px; letter-spacing: 4px; text-transform: uppercase; color: #9ca3af; }
  .ot-tl-head-line { flex: 1; height: 1px; background: linear-gradient(to right, rgba(var(--arc),.25), transparent); }

  .ot-timeline-h { position: relative; }
  .ot-track-h {
    position: absolute;
    top: 20px;
    left: 40px;
    right: 40px;
    height: 2px;
    background: rgba(0,0,0,.07);
    border-radius: 2px;
    overflow: hidden;
  }
  .ot-track-fill-h {
    position: absolute;
    top: 0; left: 0; bottom: 0;
    border-radius: 2px;
    background: linear-gradient(to right, var(--accent), rgba(var(--arc),.35));
    box-shadow: 0 0 8px rgba(var(--arc),.2);
    transition: width 2.2s cubic-bezier(.22,1,.36,1);
  }

  .ot-steps-h {
    display: flex;
    justify-content: space-between;
    position: relative;
    z-index: 1;
  }
  .ot-step-h {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    flex: 1;
    max-width: 140px;
    opacity: 0;
    transform: translateY(16px);
    animation: otStepIn .75s cubic-bezier(.22,1,.36,1) forwards;
  }
  .ot-step-h:nth-child(1) { animation-delay: 2.0s; }
  .ot-step-h:nth-child(2) { animation-delay: 2.15s; }
  .ot-step-h:nth-child(3) { animation-delay: 2.3s; }
  .ot-step-h:nth-child(4) { animation-delay: 2.45s; }
  .ot-step-h:nth-child(5) { animation-delay: 2.6s; }
  @keyframes otStepIn { to { opacity: 1; transform: translateY(0); } }

  .ot-node-h {
    width: 40px; height: 40px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; margin-bottom: 12px;
    position: relative; z-index: 2;
    transition: all .3s ease;
  }
  .ot-node-h.pending { background: #f3f4f6; border: 1.5px solid #e5e7eb; color: #d1d5db; }
  .ot-node-h.done {
    background: rgba(var(--arc),.1); border: 1.5px solid rgba(var(--arc),.3); color: var(--accent);
  }
  .ot-node-h.done::after {
    content: ''; position: absolute; inset: -6px; border-radius: 50%;
    border: 1px solid rgba(var(--arc),.12); animation: otRingOut 3.5s ease-in-out infinite;
  }
  .ot-node-h.active {
    background: rgba(var(--arc),.1); border: 2px solid var(--accent); color: var(--accent);
    animation: otIconPulse 2.5s ease-in-out infinite;
    box-shadow: 0 0 0 5px rgba(var(--arc),.07), 0 0 16px rgba(var(--arc),.12);
  }
  .ot-node-h.active::before {
    content: ''; position: absolute; inset: -9px; border-radius: 50%;
    border: 1.5px solid transparent; border-top-color: var(--accent);
    animation: otSpin 2.5s linear infinite;
  }
  .ot-node-h.cancelled {
    background: rgba(239,68,68,.1); border: 2px solid rgba(239,68,68,.4); color: #ef4444;
  }
  @keyframes otRingOut { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(1.8);opacity:0} }
  @keyframes otSpin { to { transform: rotate(360deg); } }

  .ot-step-info { text-align: center; }
  .ot-step-name {
    font-size: 12px; font-weight: 600; color: #111827;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    margin-bottom: 4px;
  }
  .ot-step-name.dim { color: #d1d5db; font-weight: 400; }
  .ot-step-sub { font-size: 10px; color: #9ca3af; line-height: 1.4; max-width: 120px; }
  .ot-step-sub.lit { color: #6b7280; }
  .ot-step-code {
    font-family: 'Space Mono', monospace; font-size: 8px; letter-spacing: 1.5px;
    color: rgba(var(--arc),.4); margin-top: 4px;
  }

  .ot-badge {
    font-family: 'Space Mono', monospace; font-size: 7px; letter-spacing: 1px;
    background: var(--accent); color: #fff; padding: 2px 8px;
    border-radius: 100px; font-weight: 700;
    animation: otBadgePop 2s ease-in-out infinite;
  }
  @keyframes otBadgePop { 0%,100%{opacity:1} 50%{opacity:.7} }

  /* ─── Form Section ─── */
  .ot-form-section { padding: 30px 34px; }
  .ot-section-head {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 24px; opacity: 0; animation: otFadeIn .6s ease 2.2s forwards;
  }
  .ot-section-line { width: 4px; height: 20px; border-radius: 2px; background: linear-gradient(to bottom, var(--accent), rgba(var(--arc),.3)); flex-shrink: 0; }
  .ot-section-title {
    font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: #0f172a;
  }

  .ot-updated-banner {
    background: #dcfce7; color: #166534;
    padding: 12px 16px; border-radius: 10px;
    margin-bottom: 20px; font-size: 13px; font-weight: 700;
    border: 1px solid #bbf7d0;
    opacity: 0; animation: otFadeIn .5s ease forwards;
  }

  /* ─── Form ─── */
  .ot-form { display: flex; flex-direction: column; gap: 16px; }
  .ot-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 768px) { .ot-form-grid { grid-template-columns: 1fr; } }

  .ot-form-card {
    background: #fff; border-radius: 14px;
    border: 0.5px solid #e2e8f0;
    padding: 20px;
    opacity: 0; animation: otFadeIn .6s ease forwards;
  }
  .ot-form-card:nth-child(1) { animation-delay: 2.3s; }
  .ot-form-card:nth-child(2) { animation-delay: 2.4s; }
  .ot-form-card:nth-child(3) { animation-delay: 2.5s; }
  .ot-form-card:nth-child(4) { animation-delay: 2.6s; }
  .ot-form-card:nth-child(5) { animation-delay: 2.7s; }
  .ot-form-card:nth-child(6) { animation-delay: 2.8s; }

  .ot-form-card-title {
    font-size: 12px; font-weight: 800; color: #0f172a;
    text-transform: uppercase; letter-spacing: 1px;
    margin: 0 0 16px;
    display: flex; align-items: center; gap: 8px;
  }

  .ot-form-fields { display: flex; flex-direction: column; gap: 12px; }
  .ot-field { display: flex; flex-direction: column; gap: 4px; }
  .ot-field-label {
    font-size: 10px; font-weight: 700; color: #94a3b8;
    text-transform: uppercase; letter-spacing: 1px;
  }
  .ot-field-static {
    font-size: 13px; font-weight: 600; color: #0f172a;
    padding: 8px 0;
  }
  .ot-field-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }

  .ot-input, .ot-select, .ot-textarea {
    width: 100%; padding: 10px 12px; border-radius: 8;
    border: 1.5px solid #e2e8f0; font-size: 13px; background: #fff;
    font-family: 'Inter', sans-serif;
    transition: border-color .2s, box-shadow .2s;
    outline: none;
  }
  .ot-input:focus, .ot-select:focus, .ot-textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(var(--arc),.08);
  }
  .ot-textarea { resize: vertical; }

  .ot-form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .ot-form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  @media (max-width: 640px) {
    .ot-form-row-2, .ot-form-row-3 { grid-template-columns: 1fr; }
    .ot-field-row { grid-template-columns: 1fr; }
  }

  .ot-readonly { background: #f8fafc; }

  /* Actions */
  .ot-form-actions {
    display: flex; gap: 12; justify-content: flex-end;
    margin-top: 8px; padding-top: 16px;
    border-top: 1px solid #f1f5f9;
  }
  .ot-btn-primary, .ot-btn-secondary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 10px 24px; border-radius: 8;
    font-size: 13px; font-weight: 700;
    text-decoration: none; cursor: pointer;
    transition: all .2s; border: none;
  }
  .ot-btn-primary {
    background: #0f172a; color: #fff;
  }
  .ot-btn-primary:hover {
    background: #1e293b; transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(15,23,42,.2);
  }
  .ot-btn-secondary {
    background: #f8fafc; color: #64748b;
    border: 1.5px solid #e2e8f0;
  }
  .ot-btn-secondary:hover {
    background: #f1f5f9; border-color: #cbd5e1;
  }

  /* Footer */
  .ot-footer { margin-top: 36px; text-align: center; }
  .ot-footer p {
    font-family: 'Space Mono', monospace; font-size: 8px;
    letter-spacing: 4px; text-transform: uppercase; color: #9ca3af;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .ot-container { padding: 20px 14px 60px; }
    .ot-card-hdr, .ot-timeline-section, .ot-form-section { padding: 22px 20px; }
    .ot-metrics { grid-template-columns: repeat(3, 1fr); }
    .ot-met:nth-child(4), .ot-met:nth-child(5) { border-top: 1px solid rgba(0,0,0,.04); }
    .ot-folio-id { font-size: 22px; }
    .ot-steps-h { overflow-x: auto; gap: 16px; padding-bottom: 8px; }
    .ot-step-h { min-width: 100px; }
    .ot-track-h { left: 20px; right: 20px; }
  }
`