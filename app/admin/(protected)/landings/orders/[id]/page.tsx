// app/admin/landings/orders/[id]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Editar Pedido — Artia Admin' }

// Server Action para actualizar
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
  
  // Construir update dinámicamente
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

  // Limpiar nulls/undefined
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
    <div style={{ maxWidth: 900 }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/admin/landings/orders" 
          style={{ fontSize: 13, color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Volver a pedidos
        </Link>
      </div>

      {/* Header */}
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>Pedido {order.folio}</h1>
          <span style={{
            fontSize: 11, fontWeight: 800, padding: '3px 12px', borderRadius: 20,
            background: currentStatus.bg, color: currentStatus.color, textTransform: 'uppercase',
          }}>
            {currentStatus.label}
          </span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
          Creado: {new Date(order.created_at).toLocaleString('es-EC')}
          {order.email_sent && ' · 📧 Email enviado'}
          {order.whatsapp_sent && ' · 📱 WhatsApp enviado'}
        </p>
      </header>

      {updated && (
        <div style={{
          background: '#dcfce7', color: '#166534', padding: '12px 16px',
          borderRadius: 8, marginBottom: 20, fontSize: 13, fontWeight: 700,
        }}>
          ✅ Pedido actualizado correctamente
        </div>
      )}

      {/* Formulario */}
      <form action={updateOrder} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <input type="hidden" name="id" value={order.id} />

        {/* Grid de 2 columnas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          
          {/* Cliente */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '0.5px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              👤 Cliente
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Nombre</label>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>{order.name}</div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Email</label>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{order.email || '—'}</div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Teléfono</label>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{order.phone}</div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Dirección</label>
                <input type="text" name="address" defaultValue={order.address || ''}
                  placeholder="Dirección de entrega"
                  style={{
                    width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 6,
                    border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff',
                  }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Ciudad</label>
                <input type="text" name="city" defaultValue={order.city || ''}
                  placeholder="Ciudad"
                  style={{
                    width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 6,
                    border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff',
                  }} />
              </div>
            </div>
          </div>

          {/* Landing / Producto */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '0.5px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              🎯 Landing
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Landing</label>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                  {order.landing?.name || '—'}
                </div>
                {order.landing?.slug && (
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>/lp/{order.landing.slug}</div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Producto</label>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{order.product_name || '—'}</div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Variante ID</label>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontFamily: 'monospace' }}>
                  {order.variant_id || '—'}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Cantidad</label>
                  <input type="number" name="quantity" min="1" defaultValue={order.quantity || 1}
                    style={{
                      width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 6,
                      border: '1.5px solid #e2e8f0', fontSize: 13,
                    }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Precio</label>
                  <input type="number" name="price" step="0.01" defaultValue={order.price || 0}
                    style={{
                      width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 6,
                      border: '1.5px solid #e2e8f0', fontSize: 13,
                    }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Total</label>
                  <input type="number" name="total" step="0.01" defaultValue={order.total || 0}
                    style={{
                      width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 6,
                      border: '1.5px solid #e2e8f0', fontSize: 13,
                    }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Estado y Pago */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '0.5px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            ⚙️ Estado del Pedido
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {/* Estado */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                Estado
              </label>
              <select name="status" defaultValue={order.status}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff',
                }}>
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Pago */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                Estado de Pago
              </label>
              <select name="payment_status" defaultValue={order.payment_status || 'pending'}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff',
                }}>
                {paymentStatusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Método de pago */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                Método de Pago
              </label>
              <select name="payment_method" defaultValue={order.payment_method || ''}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff',
                }}>
                <option value="">— Seleccionar —</option>
                {paymentMethodOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tracking */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '0.5px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            📦 Tracking y Envío
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                Número de Tracking
              </label>
              <input type="text" name="tracking_number" defaultValue={order.tracking_number || ''}
                placeholder="Ej: TRK123456"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff',
                }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>
                URL de Tracking
              </label>
              <input type="url" name="tracking_url" defaultValue={order.tracking_url || ''}
                placeholder="https://..."
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff',
                }} />
            </div>
          </div>
        </div>

        {/* Diseño */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '0.5px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            🎨 Descripción del Diseño
          </h3>
          <textarea name="design_description" rows={4} defaultValue={order.design_description || ''}
            placeholder="Detalles del diseño, preferencias del cliente, etc."
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff',
              resize: 'vertical', fontFamily: 'inherit',
            }} />
          
          {/* Design files (solo lectura por ahora) */}
          {order.design_files && Array.isArray(order.design_files) && order.design_files.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Archivos de diseño ({order.design_files.length})
              </label>
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {order.design_files.map((file: any, i: number) => (
                  <div key={i} style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>
                    {typeof file === 'string' ? file : JSON.stringify(file)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* UTM / Meta (solo lectura) */}
        {(order.utm_source || order.utm_medium || order.utm_campaign || order.meta_event_id) && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '0.5px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              📊 Tracking Marketing
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>UTM Source</label>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{order.utm_source || '—'}</div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>UTM Medium</label>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{order.utm_medium || '—'}</div>
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>UTM Campaign</label>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{order.utm_campaign || '—'}</div>
              </div>
            </div>
            {order.meta_event_id && (
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Meta Event ID</label>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontFamily: 'monospace' }}>{order.meta_event_id}</div>
              </div>
            )}
          </div>
        )}

        {/* Timeline (solo lectura) */}
        {order.timeline && Array.isArray(order.timeline) && order.timeline.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '0.5px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              📅 Timeline
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {order.timeline.map((event: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#667eea' }} />
                  <div style={{ fontSize: 12, color: '#475569' }}>
                    {typeof event === 'string' ? event : JSON.stringify(event)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <Link href="/admin/landings/orders"
            style={{
              padding: '10px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0',
              background: '#f8fafc', color: '#64748b', textDecoration: 'none',
              fontSize: 13, fontWeight: 700,
            }}>
            Cancelar
          </Link>
          <button type="submit"
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: '#0f172a', color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer',
            }}>
            💾 Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  )
}