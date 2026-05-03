// app/admin/landings/analytics/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const metadata = { title: 'Analytics Landings — Artia Admin' }

export default async function LandingAnalyticsPage() {
  const supabase = await createClient()

  // Get stats
  const { data: stats } = await supabase
    .from('landing_stats')
    .select('*')
    .order('revenue_total', { ascending: false })
    .limit(10)

  // Get daily events for chart
  const { data: dailyEvents } = await supabase
    .from('daily_events')
    .select('*')
    .order('date', { ascending: false })
    .limit(30)

  // Aggregate by date
  const chartData = (dailyEvents || []).reduce((acc: Record<string, any>, curr: any) => {
    if (!acc[curr.date]) acc[curr.date] = { date: curr.date, page_view: 0, click_cta: 0, purchase: 0 }
    acc[curr.date][curr.event_type] = (acc[curr.date][curr.event_type] || 0) + curr.count
    return acc
  }, {})

  const chartArray = Object.values(chartData).reverse()

  const totalViews = stats?.reduce((s: number, l: any) => s + (l.views_count || 0), 0) || 0
  const totalConversions = stats?.reduce((s: number, l: any) => s + (l.conversions_count || 0), 0) || 0
  const totalRevenue = stats?.reduce((s: number, l: any) => s + (l.revenue_total || 0), 0) || 0
  const avgConversionRate = totalViews > 0 ? ((totalConversions / totalViews) * 100).toFixed(2) : '0.00'

  return (
    <div style={{ maxWidth: 1200 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>📈 Analytics Landings</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Performance de todas tus landing pages</p>
      </header>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Views', value: totalViews.toLocaleString(), color: '#3b82f6', icon: '👁️' },
          { label: 'Conversiones', value: totalConversions.toLocaleString(), color: '#10b981', icon: '🎯' },
          { label: 'Revenue Total', value: `$${totalRevenue.toFixed(2)}`, color: '#f59e0b', icon: '💰' },
          { label: 'Conv. Rate', value: `${avgConversionRate}%`, color: '#8b5cf6', icon: '📊' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#fff', borderRadius: 12, padding: '18px', border: '0.5px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: kpi.color }} />
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>{kpi.label}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Top Landings Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>Top Landing Pages</h3>
          <Link href="/admin/landings" style={{ fontSize: 12, color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
            Ver todas →
          </Link>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Landing', 'Views', 'CTR', 'Conv. Rate', 'Revenue', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stats || []).map((landing: any, i: number) => (
                <tr key={landing.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{landing.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>/lp/{landing.slug}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700 }}>{landing.views_count?.toLocaleString() || 0}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>{landing.ctr || 0}%</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{landing.conversion_rate || 0}%</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 900 }}>${landing.revenue_total?.toFixed(2) || '0.00'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
                      background: landing.status === 'active' ? '#dcfce7' : '#f1f5f9',
                      color: landing.status === 'active' ? '#166534' : '#64748b',
                      textTransform: 'uppercase',
                    }}>
                      {landing.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simple Chart Visualization */}
      {chartArray.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e2e8f0', padding: '20px', marginTop: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>📊 Eventos por Día (últimos 30 días)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 200, paddingBottom: 30, position: 'relative' }}>
            {chartArray.slice(-14).map((day: any, i: number) => {
              const maxVal = Math.max(...chartArray.slice(-14).map((d: any) => (d.page_view || 0) + (d.click_cta || 0)))
              const total = (day.page_view || 0) + (day.click_cta || 0)
              const height = maxVal > 0 ? (total / maxVal) * 100 : 0

              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, width: '100%', height: 170 }}>
                    <div style={{ flex: 1, background: '#3b82f6', borderRadius: '4px 4px 0 0', height: `${(day.page_view / maxVal) * 100}%`, minHeight: 4, transition: 'height 0.3s' }} title={`Views: ${day.page_view}`} />
                    <div style={{ flex: 1, background: '#10b981', borderRadius: '4px 4px 0 0', height: `${(day.click_cta / maxVal) * 100}%`, minHeight: 4, transition: 'height 0.3s' }} title={`Clicks: ${day.click_cta}`} />
                  </div>
                  <span style={{ fontSize: 9, color: '#94a3b8', transform: 'rotate(-45deg)', whiteSpace: 'nowrap', position: 'absolute', bottom: 4 }}>
                    {new Date(day.date).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
              <span style={{ width: 12, height: 12, background: '#3b82f6', borderRadius: 2 }} /> Page Views
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
              <span style={{ width: 12, height: 12, background: '#10b981', borderRadius: 2 }} /> CTA Clicks
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
