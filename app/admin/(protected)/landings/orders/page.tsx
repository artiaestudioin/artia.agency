// app/admin/landings/orders/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata = { title: 'Pedidos Landings — Artia Admin' }

export default async function LandingOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('landing_orders')
    .select('*, landing:landing_id(name, slug)')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: orders } = await query

  const filtered = (orders || []).filter((o: any) => {
    if (!q) return true
    const term = q.toLowerCase()
    return o.name?.toLowerCase().includes(term) || 
           o.folio?.toLowerCase().includes(term) || 
           o.phone?.includes(term)
  })

  const counts = {
    all: orders?.length || 0,
    pending: orders?.filter((o: any) => o.status === 'pending').length || 0,
    confirmed: orders?.filter((o: any) => o.status === 'confirmed').length || 0,
    in_production: orders?.filter((o: any) => o.status === 'in_production').length || 0,
    shipped: orders?.filter((o: any) => o.status === 'shipped').length || 0,
    delivered: orders?.filter((o: any) => o.status === 'delivered').length || 0,
  }

  const statusColors: Record<string, { bg: string; text: string }> = {
    pending: { bg: '#fef3c7', text: '#92400e' },
    confirmed: { bg: '#eff6ff', text: '#1e40af' },
    in_production: { bg: '#f5f3ff', text: '#6b21a8' },
    shipped: { bg: '#ecfeff', text: '#0e7490' },
    delivered: { bg: '#dcfce7', text: '#166534' },
    cancelled: { bg: '#fee2e2', text: '#991b1b' },
    refunded: { bg: '#f3f4f6', text: '#6b7280' },
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    in_production: 'En Producción',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>🛒 Pedidos Landings</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>{counts.all} pedidos en total</p>
        </div>
      </header>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'Todos', count: counts.all },
          { key: 'pending', label: 'Pendientes', count: counts.pending },
          { key: 'confirmed', label: 'Confirmados', count: counts.confirmed },
          { key: 'in_production', label: 'En Prod.', count: counts.in_production },
          { key: 'shipped', label: 'Enviados', count: counts.shipped },
          { key: 'delivered', label: 'Entregados', count: counts.delivered },
        ].map(opt => {
          const isActive = (status || 'all') === opt.key
          const href = opt.key === 'all'
            ? (q ? `/admin/landings/orders?q=${encodeURIComponent(q)}` : '/admin/landings/orders')
            : (q ? `/admin/landings/orders?status=${opt.key}&q=${encodeURIComponent(q)}` : `/admin/landings/orders?status=${opt.key}`)
          return (
            <Link key={opt.key} href={href}
              style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
                background: isActive ? '#0f172a' : '#f1f5f9',
                color: isActive ? '#fff' : '#64748b',
                border: `1.5px solid ${isActive ? '#0f172a' : '#e2e8f0'}`,
                transition: 'all 0.15s',
              }}>
              {opt.label}
              <span style={{
                fontSize: 10, fontWeight: 800,
                background: isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                color: isActive ? '#fff' : '#94a3b8',
                borderRadius: 20, padding: '1px 7px',
              }}>
                {opt.count}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Search */}
      <form method="GET" action="/admin/landings/orders" style={{ marginBottom: 20 }}>
        {status && <input type="hidden" name="status" value={status} />}
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" name="q" defaultValue={q ?? ''}
            placeholder="Buscar por nombre, folio o teléfono..."
            style={{
              flex: 1, padding: '10px 16px',
              border: '1.5px solid #e2e8f0',
              borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff',
            }} />
          <button type="submit"
            style={{
              background: '#0f172a', color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
            Buscar
          </button>
          {(q || status) && (
            <a href="/admin/landings/orders"
              style={{
                background: '#f1f5f9', color: '#64748b',
                borderRadius: 10, padding: '10px 14px', fontSize: 12,
                fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center',
              }}>
              Limpiar ×
            </a>
          )}
        </div>
      </form>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Folio', 'Cliente', 'Producto', 'Total', 'Estado', 'Pago', 'Fecha', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                    No se encontraron pedidos
                  </td>
                </tr>
              ) : (
                filtered.map((order: any) => {
                  const sc = statusColors[order.status] || statusColors.pending
                  return (
                    <tr key={order.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="order-row">
                      <td style={{ padding: '12px 16px' }}>
                        <code style={{ fontSize: 12, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>
                          {order.folio}
                        </code>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{order.name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{order.phone}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 12, color: '#475569' }}>{order.product_name || '—'}</div>
                        {order.landing && (
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>/lp/{order.landing.slug}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        ${order.total?.toFixed(2) || '0.00'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
                          background: sc.bg, color: sc.text, textTransform: 'uppercase',
                        }}>
                          {statusLabels[order.status] || order.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 800,
                          color: order.payment_status === 'paid' ? '#10b981' : order.payment_status === 'partial' ? '#f59e0b' : '#94a3b8',
                          textTransform: 'uppercase',
                        }}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {new Date(order.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Link href={`/seguimiento/${order.folio}`} target="_blank"
                            style={{
                              fontSize: 11, color: '#2563eb', background: '#eff6ff',
                              padding: '4px 10px', borderRadius: 6, textDecoration: 'none', fontWeight: 700,
                            }}>
                            👁️ Ver
                          </Link>
                          <Link href={`/admin/landings/orders/${order.id}`}
                            style={{
                              fontSize: 11, color: '#475569', background: '#f1f5f9',
                              padding: '4px 10px', borderRadius: 6, textDecoration: 'none', fontWeight: 700,
                            }}>
                            ✏️ Editar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .order-row:hover { background: #f8fafc; }
      `}</style>
    </div>
  )
}
