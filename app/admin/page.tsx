import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Traer últimos leads de Supabase
  const { data: leads } = await supabase
    .from('leads')
    .select('id, folio, nombre, email, servicio, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  const { count: totalLeads } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })

  // Leads de los últimos 7 días
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: leadsThisWeek } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo)

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#00113a', margin: '0 0 8px' }}>
        Dashboard
      </h1>
      <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 32px' }}>
        Resumen de actividad de Artia Studio
      </p>

      {/* Métricas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
        marginBottom: 40,
      }}>
        <MetricCard label="Total leads" value={totalLeads ?? 0} />
        <MetricCard label="Leads esta semana" value={leadsThisWeek ?? 0} accent />
        <MetricCard label="Páginas activas" value={6} />
        <MetricCard label="APIs activas" value={2} />
      </div>

      {/* Tabla de últimos leads */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        border: '0.5px solid #e2e8f0',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '0.5px solid #e2e8f0' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
            Últimos leads
          </h2>
        </div>

        {leads && leads.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Folio', 'Nombre', 'Email', 'Servicio', 'Fecha'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#94a3b8',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    borderBottom: '0.5px solid #e2e8f0',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => (
                <tr key={lead.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                  <td style={{ padding: '12px 16px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <span style={{
                      background: '#dbeafe',
                      color: '#1d4ed8',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 999,
                    }}>{lead.folio ?? '—'}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a', borderBottom: '0.5px solid #f1f5f9' }}>
                    {lead.nombre}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#2552ca', borderBottom: '0.5px solid #f1f5f9' }}>
                    <a href={`mailto:${lead.email}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {lead.email}
                    </a>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#475569', borderBottom: '0.5px solid #f1f5f9' }}>
                    {lead.servicio}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', borderBottom: '0.5px solid #f1f5f9' }}>
                    {new Date(lead.created_at).toLocaleDateString('es-EC', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ padding: '32px 24px', color: '#94a3b8', textAlign: 'center', margin: 0 }}>
            Aún no hay leads registrados.
          </p>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? '#00113a' : '#f8fafc',
      border: `0.5px solid ${accent ? 'transparent' : '#e2e8f0'}`,
      borderRadius: 10,
      padding: '20px 24px',
    }}>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: accent ? '#b3c5ff' : '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: accent ? '#fff' : '#0f172a' }}>
        {value}
      </p>
    </div>
  )
}
