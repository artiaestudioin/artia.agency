import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

// ── Helpers analytics ────────────────────────────────────────
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
    const data  = await res.json()
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

// ── Helpers visuales ─────────────────────────────────────────
const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  nuevo:      { label: 'Nuevo',      color: '#3b82f6', bg: '#eff6ff' },
  contactado: { label: 'Contactado', color: '#f59e0b', bg: '#fefce8' },
  en_proceso: { label: 'En proceso', color: '#8b5cf6', bg: '#f5f3ff' },
  cerrado:    { label: 'Cerrado ✓',  color: '#10b981', bg: '#f0fdf4' },
  perdido:    { label: 'Perdido',    color: '#ef4444', bg: '#fef2f2' },
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function avatarBg(name: string) {
  const palette = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % palette.length
  return palette[h]
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60)   return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)    return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `hace ${days}d`
}

// ── Página principal ─────────────────────────────────────────
export default async function AdminDashboard() {
  const supabase = await createClient()
  const ahora    = new Date()
  const inicioMes    = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
  const inicioMesAnt = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString()
  const finMesAnt    = new Date(ahora.getFullYear(), ahora.getMonth(), 0).toISOString()

  const [
    { data: leads },
    { data: payments },
    { data: paymentsMesAnt },
    { data: ultimosLeads },
    { data: projects },
    phStats,
    sentryStats,
  ] = await Promise.all([
    supabase.from('leads').select('id, nombre, servicio, estado, payment_status, estimated_value, final_value, created_at, folio').order('created_at', { ascending: false }),
    supabase.from('payments').select('amount, status, fecha, lead_id').gte('fecha', inicioMes),
    supabase.from('payments').select('amount, status').gte('fecha', inicioMesAnt).lt('fecha', finMesAnt).eq('status', 'pagado'),
    supabase.from('leads').select('id, nombre, servicio, estado, created_at, folio').order('created_at', { ascending: false }).limit(8),
    supabase.from('projects').select('id, name, access_code, status, created_at').order('created_at', { ascending: false }).limit(5),
    fetchPostHogStats(),
    fetchSentryStats(),
  ])

  // ── Métricas calculadas ──────────────────────────────────
  const allLeads       = leads ?? []
  const allPayments    = payments ?? []

  const ingresosMes    = allPayments.filter(p => p.status === 'pagado').reduce((s, p) => s + (p.amount ?? 0), 0)
  const pendientesMes  = allPayments.filter(p => p.status === 'pendiente').reduce((s, p) => s + (p.amount ?? 0), 0)
  const ingresosAnt    = (paymentsMesAnt ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0)
  const crecimientoMes = ingresosAnt > 0 ? ((ingresosMes - ingresosAnt) / ingresosAnt * 100) : null

  const leadsActivos   = allLeads.filter(l => !['cerrado','perdido'].includes(l.estado ?? '')).length
  const leadsCerrados  = allLeads.filter(l => l.estado === 'cerrado').length
  const leadsTotal     = allLeads.length
  const conversion     = leadsTotal > 0 ? Math.round(leadsCerrados / leadsTotal * 100) : 0

  const pendientesPago = allLeads.filter(l => l.payment_status !== 'pagado' && l.estado === 'cerrado').length

  // Distribución por estado
  const porEstado = Object.entries(
    allLeads.reduce((acc, l) => {
      const e = l.estado ?? 'nuevo'
      acc[e] = (acc[e] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  )

  const s = {
    display: 'flex', flexDirection: 'column' as const, gap: 4,
    fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' as const,
    color: '#94a3b8',
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto' }}>

      {/* ── Encabezado ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#00113a', margin: 0, letterSpacing: '-0.5px' }}>
              Panel de control
            </h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              {ahora.toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/admin/leads" style={{ background: '#00113a', color: '#fff', padding: '9px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', letterSpacing: '0.5px' }}>
              + Nuevo Lead
            </Link>
            <Link href="/admin/proyectos" style={{ background: '#f1f5f9', color: '#00113a', padding: '9px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              Ver proyectos
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPIs principales ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        
        {/* Ingresos del mes */}
        <div style={{ background: '#00113a', borderRadius: 14, padding: '22px 24px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: '#2552ca', borderRadius: '50%', opacity: 0.3 }} />
          <div style={s}>Ingresos del mes</div>
          <div style={{ fontSize: 30, fontWeight: 900, marginTop: 8, letterSpacing: '-1px' }}>{fmtMoney(ingresosMes)}</div>
          {crecimientoMes !== null && (
            <div style={{ marginTop: 6, fontSize: 12, color: crecimientoMes >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>
              {crecimientoMes >= 0 ? '↑' : '↓'} {Math.abs(crecimientoMes).toFixed(1)}% vs mes anterior
            </div>
          )}
          {pendientesMes > 0 && (
            <div style={{ marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
              + {fmtMoney(pendientesMes)} pendientes
            </div>
          )}
        </div>

        {/* Leads activos */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: '22px 24px' }}>
          <div style={s}>Leads activos</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: '#3b82f6', marginTop: 8, letterSpacing: '-1px' }}>{leadsActivos}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
            {leadsTotal} leads totales · {leadsCerrados} cerrados
          </div>
          <div style={{ marginTop: 10, height: 4, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${conversion}%`, background: '#3b82f6', borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Conversión */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: '22px 24px' }}>
          <div style={s}>Tasa de conversión</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: '#10b981', letterSpacing: '-1px' }}>{conversion}%</span>
            <span style={{ fontSize: 13, color: '#64748b' }}>leads cerrados</span>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
            {leadsCerrados} de {leadsTotal} leads
          </div>
          {/* Mini gráfico visual */}
          <div style={{ display: 'flex', gap: 3, marginTop: 10 }}>
            {porEstado.map(([estado, count]) => {
              const cfg = ESTADO_CONFIG[estado] ?? { color: '#94a3b8', bg: '#f1f5f9' }
              return (
                <div key={estado} title={`${cfg.label}: ${count}`}
                  style={{ flex: count, height: 6, background: cfg.color, borderRadius: 3, opacity: 0.7 }} />
              )
            })}
          </div>
        </div>

        {/* Pendientes de pago */}
        <div style={{ background: pendientesPago > 0 ? '#fef9ec' : '#fff', border: `0.5px solid ${pendientesPago > 0 ? '#fcd34d' : '#e2e8f0'}`, borderRadius: 14, padding: '22px 24px' }}>
          <div style={s}>Cobros pendientes</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: pendientesPago > 0 ? '#d97706' : '#10b981', marginTop: 8, letterSpacing: '-1px' }}>
            {pendientesPago}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
            clientes cerrados sin pago completo
          </div>
          {pendientesPago > 0 && (
            <Link href="/admin/finanzas" style={{ marginTop: 10, display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#d97706', textDecoration: 'none', letterSpacing: '0.5px' }}>
              Ver detalle →
            </Link>
          )}
        </div>
      </div>

      {/* ── Grid central: actividad + proyectos + analytics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Actividad reciente */}
        <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#00113a' }}>Actividad reciente</span>
            <Link href="/admin/leads" style={{ fontSize: 12, color: '#2552ca', textDecoration: 'none', fontWeight: 600 }}>Ver todos →</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(ultimosLeads ?? []).map(lead => {
              const cfg = ESTADO_CONFIG[lead.estado ?? 'nuevo'] ?? ESTADO_CONFIG['nuevo']
              return (
                <Link href={`/admin/cliente/${lead.folio ?? lead.id}`} key={lead.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', padding: '8px 10px', borderRadius: 8, transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: avatarBg(lead.nombre), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                    {initials(lead.nombre)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.nombre}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.servicio ?? '—'}</div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ display: 'inline-block', background: cfg.bg, color: cfg.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.3px' }}>
                      {cfg.label}
                    </div>
                    <div style={{ fontSize: 10, color: '#cbd5e1', marginTop: 2 }}>{relativeTime(lead.created_at)}</div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Panel derecho: proyectos + analytics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Proyectos activos */}
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontWeight: 800, fontSize: 14, color: '#00113a' }}>Proyectos</span>
              <Link href="/admin/proyectos" style={{ fontSize: 12, color: '#2552ca', textDecoration: 'none', fontWeight: 600 }}>Gestionar →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(projects ?? []).length === 0 && (
                <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
                  No hay proyectos activos
                </div>
              )}
              {(projects ?? []).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid #f1f5f9' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.status === 'activo' ? '#10b981' : '#94a3b8', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{p.name}</div>
                  <code style={{ fontSize: 10, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 6, fontFamily: 'monospace' }}>
                    {p.access_code}
                  </code>
                </div>
              ))}
            </div>
          </div>

          {/* Analytics / Sentry */}
          <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#00113a', marginBottom: 14 }}>Sistema & Analytics</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* PostHog */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, background: '#fef9c3', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📊</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>PostHog</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>Últimos 7 días</div>
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#00113a' }}>
                  {phStats ? `${phStats.pageviews.toLocaleString()} visitas` : '—'}
                </div>
              </div>
              {/* Sentry */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, background: sentryStats && sentryStats.unresolvedCount > 0 ? '#fef2f2' : '#f0fdf4', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                    {sentryStats && sentryStats.unresolvedCount > 0 ? '🔴' : '✅'}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Sentry Errors</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>Sin resolver</div>
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: sentryStats && sentryStats.unresolvedCount > 0 ? '#ef4444' : '#10b981' }}>
                  {sentryStats ? sentryStats.unresolvedCount : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Pipeline visual por estado ── */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#00113a' }}>Pipeline por estado</span>
          <Link href="/admin/pipeline" style={{ fontSize: 12, color: '#2552ca', textDecoration: 'none', fontWeight: 600 }}>Kanban →</Link>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {Object.entries(ESTADO_CONFIG).map(([estado, cfg]) => {
            const count = allLeads.filter(l => l.estado === estado).length
            const pct   = leadsTotal > 0 ? (count / leadsTotal * 100) : 0
            return (
              <div key={estado} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: cfg.color }}>{count}</div>
                <div style={{ height: 4, background: '#f1f5f9', borderRadius: 4, margin: '6px 0', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: cfg.color, borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.5px' }}>{cfg.label.toUpperCase()}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Acciones rápidas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {[
          { label: 'Pipeline Kanban', href: '/admin/pipeline', icon: '🗂️', color: '#6366f1' },
          { label: 'Finanzas',        href: '/admin/finanzas',  icon: '💰', color: '#10b981' },
          { label: 'Proyectos',       href: '/admin/proyectos', icon: '📁', color: '#2552ca' },
          { label: 'Emails',          href: '/admin/emails',    icon: '✉️', color: '#f59e0b' },
          { label: 'Imágenes',        href: '/admin/imagenes',  icon: '🖼️', color: '#ec4899' },
          { label: 'IA Consultas',    href: '/admin/ia',        icon: '🤖', color: '#8b5cf6' },
        ].map(item => (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12,
            padding: '18px 12px', textDecoration: 'none', transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 24 }}>{item.icon}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.5px', textAlign: 'center' }}>
              {item.label.toUpperCase()}
            </span>
          </Link>
        ))}
      </div>

    </div>
  )
}
