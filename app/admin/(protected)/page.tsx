import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

// ── Stats externos (opcionales) ────────────────────────────────────────────
async function fetchPostHogStats() {
  const key     = process.env.POSTHOG_PERSONAL_API_KEY
  const project = process.env.POSTHOG_PROJECT_ID
  if (!key || !project) return null
  try {
    const res = await fetch(
      `https://app.posthog.com/api/projects/${project}/insights/trend/?events=[{"id":"$pageview"}]&date_from=-7d`,
      { headers: { Authorization: `Bearer ${key}` }, next: { revalidate: 300 } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const total = (data.result?.[0]?.data ?? []).reduce((a: number, b: number) => a + b, 0)
    return { pageviews: total }
  } catch { return null }
}

async function fetchSentryStats() {
  const token = process.env.SENTRY_AUTH_TOKEN
  const org   = process.env.SENTRY_ORG
  const proj  = process.env.SENTRY_PROJECT
  if (!token || !org || !proj) return null
  try {
    const res = await fetch(
      `https://sentry.io/api/0/projects/${org}/${proj}/issues/?limit=5&query=is:unresolved`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 300 } }
    )
    if (!res.ok) return null
    const issues = await res.json()
    return { unresolvedCount: Array.isArray(issues) ? issues.length : 0, issues: issues.slice(0, 3) }
  } catch { return null }
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  const ahora        = new Date()
  const inicioDia    = new Date(ahora); inicioDia.setHours(0, 0, 0, 0)
  const inicioSemana = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000)
  const inicioMes    = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    { count: totalLeads },
    { count: leadsHoy },
    { count: leadsSemana },
    { count: leadsMes },
    { data: ultimosLeads },
    { data: templates },
    { count: totalEmails },
    phStats,
    sentryStats,
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', inicioDia.toISOString()),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', inicioSemana.toISOString()),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', inicioMes.toISOString()),
    supabase.from('leads').select('id, folio, nombre, email, servicio, estado, created_at').order('created_at', { ascending: false }).limit(8),
    supabase.from('email_templates').select('id, name, updated_at').order('updated_at', { ascending: false }).limit(3),
    supabase.from('email_sends').select('*', { count: 'exact', head: true }),
    fetchPostHogStats(),
    fetchSentryStats(),
  ])

  const fecha = ahora.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", backgroundColor: '#f8fafc', minHeight: '100vh', padding: '32px 24px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
              Dashboard
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0, textTransform: 'capitalize', fontWeight: 500 }}>{fecha}</p>
          </div>
          <a href="https://artiaagency.vercel.app" target="_blank" rel="noopener noreferrer"
            style={{ 
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', 
              borderRadius: 12, background: '#0f172a', color: '#ffffff', 
              textDecoration: 'none', fontSize: 13, fontWeight: 700,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}>
            🌐 Ver sitio
          </a>
        </div>

        {/* KPI Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          <KPICard label="Hoy"           value={leadsHoy    ?? 0} icon="📩" color="#2563eb" />
          <KPICard label="Esta semana"   value={leadsSemana ?? 0} icon="📈" color="#0f172a" accent />
          <KPICard label="Este mes"      value={leadsMes    ?? 0} icon="📅" color="#0891b2" />
          <KPICard label="Total leads"   value={totalLeads  ?? 0} icon="👥" color="#475569" />
          <KPICard label="Emails env."   value={totalEmails ?? 0} icon="✉️" color="#7c3aed" />
          <KPICard label="Plantillas"    value={templates?.length ?? 0} icon="📝" color="#be185d" />
        </div>

        {/* Row: Leads + Sidebar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start', marginBottom: 24 }}>

          {/* Últimos leads */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Últimos leads</span>
              <Link href="/admin/leads" style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', fontWeight: 600, background: '#eff6ff', padding: '6px 12px', borderRadius: 8 }}>Ver todos →</Link>
            </div>
            {ultimosLeads && ultimosLeads.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Folio', 'Nombre', 'Servicio', 'Estado', 'Fecha'].map(h => (
                        <th key={h} style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ultimosLeads.map((lead: any, i: number) => (
                      <tr key={lead.id} style={{ background: i % 2 === 0 ? '#ffffff' : '#fcfcfd', transition: 'background 0.2s' }}>
                        <td style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9' }}>
                          <Link href={`/admin/cliente/${lead.folio ?? lead.id}`} style={{ textDecoration: 'none' }}>
                            <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, border: '1px solid #bfdbfe' }}>{lead.folio ?? '—'}</span>
                          </Link>
                        </td>
                        <td style={{ padding: '14px 24px', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{lead.nombre}</td>
                        <td style={{ padding: '14px 24px', color: '#475569', borderBottom: '1px solid #f1f5f9', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.servicio}</td>
                        <td style={{ padding: '14px 24px', borderBottom: '1px solid #f1f5f9' }}>
                          <EstadoBadge estado={lead.estado} />
                        </td>
                        <td style={{ padding: '14px 24px', color: '#64748b', borderBottom: '1px solid #f1f5f9', fontSize: 12, whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {new Date(lead.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>Aún no hay leads registrados.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Acciones rápidas */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Acciones rápidas</span>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { href: '/admin/emails/nueva', label: '+ Nueva plantilla email', color: '#0f172a', bg: '#f8fafc', border: '#e2e8f0' },
                  { href: '/admin/imagenes',     label: '↑ Subir imágenes',        color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                  { href: '/admin/leads',        label: '👥 Ver todos los leads',  color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
                  { href: '/admin/proyectos',    label: '🗂️ Ver proyectos',         color: '#9333ea', bg: '#faf5ff', border: '#e9d5ff' },
                ].map(a => (
                  <Link key={a.href} href={a.href} style={{ display: 'block', padding: '10px 14px', borderRadius: 10, background: a.bg, border: `1px solid ${a.border}`, fontSize: 13, fontWeight: 600, color: a.color, textDecoration: 'none' }}>
                    {a.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Plantillas recientes */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Plantillas</span>
                <Link href="/admin/emails" style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>Ver todas →</Link>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {templates && templates.length > 0 ? templates.map((t: any) => (
                  <Link key={t.id} href={`/admin/emails/${t.id}`} style={{ display: 'block', padding: '12px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', textDecoration: 'none' }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{t.name}</span>
                    <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      Actualizado: {new Date(t.updated_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </Link>
                )) : <p style={{ margin: 0, fontSize: 13, color: '#64748b', textAlign: 'center', padding: '10px 0' }}>Sin plantillas aún.</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Row: PostHog + Sentry + Modo Cliente */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>

          {/* PostHog */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 24, background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '6px' }}>🦔</span>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '0.2px' }}>PostHog Analytics</p>
                <p style={{ margin: 0, fontSize: 11, color: '#fed7aa', fontWeight: 500 }}>Últimos 7 días</p>
              </div>
            </div>
            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {phStats ? (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 36, fontWeight: 800, color: '#0f172a', letterSpacing: '-1px' }}>{phStats.pageviews.toLocaleString()}</p>
                  <p style={{ margin: '0', fontSize: 13, color: '#64748b', fontWeight: 500 }}>Pageviews totales</p>
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 14, color: '#475569', fontWeight: 500 }}>Conecta tu cuenta para ver estadísticas en tiempo real.</p>
                  <p style={{ margin: '0', fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>Agrega <code>POSTHOG_PERSONAL_API_KEY</code> y <code>POSTHOG_PROJECT_ID</code> en Vercel.</p>
                </div>
              )}
              <a href="https://app.posthog.com" target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#ea580c', textDecoration: 'none' }}>
                Ver dashboard completo →
              </a>
            </div>
          </div>

          {/* Sentry */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 24px', background: 'linear-gradient(135deg, #4c1d95 0%, #3b0764 100%)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 24, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '6px' }}>🛡️</span>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '0.2px' }}>Sentry Monitoring</p>
                <p style={{ margin: 0, fontSize: 11, color: '#ddd6fe', fontWeight: 500 }}>Issues sin resolver</p>
              </div>
            </div>
            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {sentryStats ? (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 36, fontWeight: 800, letterSpacing: '-1px', color: sentryStats.unresolvedCount > 0 ? '#dc2626' : '#16a34a' }}>
                    {sentryStats.unresolvedCount}
                  </p>
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                    {sentryStats.unresolvedCount === 0 ? '✓ Sin errores activos' : 'Errores sin resolver'}
                  </p>
                  {sentryStats.issues.map((issue: any) => (
                    <p key={issue.id} style={{ margin: '0 0 6px', fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: '#f8fafc', padding: '6px 10px', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                      • {issue.title}
                    </p>
                  ))}
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 14, color: '#475569', fontWeight: 500 }}>Monitoreo de errores activo en producción.</p>
                  <p style={{ margin: '0', fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>Los errores aparecerán aquí automáticamente cuando ocurran.</p>
                </div>
              )}
              <a href="https://sentry.io" target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#7c3aed', textDecoration: 'none' }}>
                Ver en Sentry →
              </a>
            </div>
          </div>

          {/* Modo Cliente */}
          <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #00113a 100%)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 15px -3px rgba(0, 17, 58, 0.3)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '0.2px' }}>🧑‍💼 Modo Admin/Cliente</p>
              <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Timeline de pedidos por folio</p>
            </div>
            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: '#cbd5e1', lineHeight: 1.5 }}>
                Comparte el enlace con tu cliente para que vea el estado de su pedido en tiempo real.
              </p>
              <form method="GET" action="/admin/cliente" style={{ display: 'flex', gap: 10 }}>
                <input name="folio" placeholder="Ej: ASMKT-0381"
                  style={{ flex: 1, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#fff', background: 'rgba(255,255,255,0.05)', outline: 'none', transition: 'border 0.2s' }} />
                <button type="submit" style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, padding: '0 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}>
                  Ver →
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KPICard({ label, value, icon, color, accent }: { label: string; value: number; icon: string; color: string; accent?: boolean }) {
  return (
    <div style={{ 
      background: accent ? 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)' : '#fff', 
      border: `1px solid ${accent ? 'transparent' : '#e2e8f0'}`, 
      borderRadius: 16, 
      padding: '20px 24px', 
      position: 'relative', 
      overflow: 'hidden',
      boxShadow: accent ? '0 10px 15px -3px rgba(30, 58, 138, 0.2)' : '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
    }}>
      {accent && <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 18, background: accent ? 'rgba(255,255,255,0.1)' : '#f8fafc', padding: '6px', borderRadius: 8 }}>{icon}</span>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: accent ? '#93c5fd' : '#64748b', letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</p>
      </div>
      <p style={{ margin: 0, fontSize: 32, fontWeight: 800, color: accent ? '#fff' : '#0f172a', letterSpacing: '-1px' }}>{value}</p>
    </div>
  )
}

function EstadoBadge({ estado }: { estado: string | null }) {
  const map: Record<string, { bg: string; color: string; border: string; label: string }> = {
    nuevo:      { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'Nuevo' },
    contactado: { bg: '#fefce8', color: '#a16207', border: '#fef08a', label: 'Contactado' },
    en_proceso: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'En proceso' },
    cerrado:    { bg: '#dcfce7', color: '#166534', border: '#86efac', label: 'Cerrado ✓' },
    perdido:    { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: 'Perdido' },
  }
  const e = map[estado ?? 'nuevo'] ?? map.nuevo
  return <span style={{ background: e.bg, color: e.color, border: `1px solid ${e.border}`, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999 }}>{e.label}</span>
}