// app/admin/(protected)/landings/[id]/stats/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Analytics Landing — Artia Admin' }

export default async function LandingStatsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Get landing + stats
  const { data: landing } = await supabase
    .from('landing_stats')
    .select('*')
    .eq('id', id)
    .single()

  if (!landing) notFound()

  // Get events for this landing
  const { data: events } = await supabase
    .from('landing_events')
    .select('*')
    .eq('landing_id', id)
    .order('created_at', { ascending: false })
    .limit(100)

  // Get orders for this landing
  const { data: orders } = await supabase
    .from('landing_orders')
    .select('*')
    .eq('landing_id', id)
    .order('created_at', { ascending: false })

  // Calculate event breakdown
  const eventCounts = (events || []).reduce((acc: Record<string, number>, e: any) => {
    acc[e.event_type] = (acc[e.event_type] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Link 
            href="/admin/landings"
            style={{ color: '#64748b', textDecoration: 'none', fontSize: 14 }}
          >
            ← Landings
          </Link>
          <span style={{ color: '#cbd5e1' }}>/</span>
          <span style={{ color: '#0f172a', fontWeight: 600, fontSize: 14 }}>Stats</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0 }}>
          📊 {landing.name}
        </h1>
        <p style={{ color: '#64748b', fontSize: 13, margin: '4px 0 0' }}>
          /lp/{landing.slug} · {landing.status}
        </p>
      </header>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard label="Views" value={landing.views_count || 0} color="#3b82f6" />
        <StatCard label="Clicks" value={landing.clicks_count || 0} color="#8b5cf6" />
        <StatCard label="Conversiones" value={landing.conversions_count || 0} color="#10b981" />
        <StatCard label="Revenue" value={`$${(landing.revenue_total || 0).toFixed(2)}`} color="#f59e0b" />
        <StatCard label="Conv. Rate" value={`${landing.conversion_rate || 0}%`} color="#ef4444" />
        <StatCard label="CTR" value={`${landing.ctr || 0}%`} color="#6366f1" />
      </div>

      {/* Event Breakdown */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>Eventos Recientes</h3>
        {Object.keys(eventCounts).length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>Sin eventos registrados</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {Object.entries(eventCounts).map(([type, count]) => (
              <div key={type} style={{ background: '#f8fafc', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{count}</div>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>{type}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Orders Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>
          Pedidos ({orders?.length || 0})
        </h3>
        {(orders || []).length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>Sin pedidos aún</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Folio</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Cliente</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Teléfono</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Total</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Estado</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: 11 }}>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {orders?.map((order: any) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{order.folio}</td>
                    <td style={{ padding: '10px 12px', color: '#334155' }}>{order.name}</td>
                    <td style={{ padding: '10px 12px', color: '#334155' }}>{order.phone}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#10b981' }}>${order.total}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        background: order.status === 'pending' ? '#fef3c7' : order.status === 'paid' ? '#dcfce7' : '#f1f5f9',
                        color: order.status === 'pending' ? '#92400e' : order.status === 'paid' ? '#166534' : '#64748b',
                        padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase'
                      }}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: 12 }}>
                      {new Date(order.created_at).toLocaleDateString('es-EC')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: 28, fontWeight: 900, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{label}</div>
    </div>
  )
}