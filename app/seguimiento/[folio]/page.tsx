// app/seguimiento/pedido/[folio]/page.tsx
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

function getSupabasePublic() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ folio: string }>
}): Promise<Metadata> {
  const { folio } = await params
  return {
    title: `Seguimiento ${folio.toUpperCase()} — Artia Studio`,
    description: 'Consulta el estado de tu pedido',
  }
}

export default async function SeguimientoPedidoPage({
  params,
}: {
  params: Promise<{ folio: string }>
}) {
  const { folio } = await params
  const supabase = getSupabasePublic()

  const { data: order } = await supabase
    .from('landing_orders')
    .select('*, landing:landing_id(name, slug)')
    .eq('folio', folio.toUpperCase())
    .maybeSingle()

  if (!order) return notFound()

  const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: 'Pendiente', color: '#92400e', bg: '#fef3c7' },
    confirmed: { label: 'Confirmado', color: '#1e40af', bg: '#eff6ff' },
    in_production: { label: 'En Producción', color: '#6b21a8', bg: '#f5f3ff' },
    shipped: { label: 'Enviado', color: '#0e7490', bg: '#ecfeff' },
    delivered: { label: 'Entregado', color: '#166534', bg: '#dcfce7' },
    cancelled: { label: 'Cancelado', color: '#991b1b', bg: '#fee2e2' },
    refunded: { label: 'Reembolsado', color: '#6b7280', bg: '#f3f4f6' },
  }

  const steps = ['pending', 'confirmed', 'in_production', 'shipped', 'delivered']
  const currentStep = steps.indexOf(order.status)
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded'
  const progress = isCancelled ? 0 : Math.max(5, ((currentStep + 1) / steps.length) * 100)

  const current = statusLabels[order.status] || statusLabels.pending

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        
        {/* Logo/Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 0 8px' }}>
            🎨 Artia Studio
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>
            Seguimiento de pedido
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          
          {/* Folio */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 8 }}>
              Número de Pedido
            </div>
            <code style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', letterSpacing: '2px' }}>
              {order.folio}
            </code>
          </div>

          {/* Status Badge */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{
              display: 'inline-block', padding: '8px 20px', borderRadius: 20,
              background: current.bg, color: current.color,
              fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px',
            }}>
              {current.label}
            </span>
          </div>

          {/* Info */}
          <div style={{ marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>Cliente</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{order.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>Producto</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{order.product_name || '—'}</span>
            </div>
            {order.landing && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>Landing</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{order.landing.name}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>Total</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>${order.total?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          {/* Progress */}
          {!isCancelled && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                {steps.map((s, i) => (
                  <div key={s} style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: i <= currentStep ? '#667eea' : '#e2e8f0',
                      margin: '0 auto 6px', border: `2px solid ${i <= currentStep ? '#667eea' : '#e2e8f0'}`,
                      transition: 'all 0.3s',
                    }} />
                    <div style={{ fontSize: 9, fontWeight: 700, color: i <= currentStep ? '#0f172a' : '#94a3b8', textTransform: 'uppercase' }}>
                      {statusLabels[s]?.label}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3 }}>
                <div style={{
                  height: '100%', width: `${progress}%`,
                  background: 'linear-gradient(90deg, #667eea, #764ba2)',
                  borderRadius: 3, transition: 'width 0.8s ease',
                }} />
              </div>
            </div>
          )}

          {/* Timeline */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Historial
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', marginTop: 6, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Pedido recibido</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {new Date(order.created_at).toLocaleString('es-EC')}
                  </div>
                </div>
              </div>
              {order.status !== 'pending' && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#667eea', marginTop: 6, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                      Estado actualizado a {current.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      Última actualización
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
              ¿Tienes dudas? Escríbenos por{' '}
              <a href="https://wa.me/593969937265" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
                WhatsApp
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}