import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PostHogWidget, SentryWidget } from './AnalyticsWidgets'





const ESTADO_COLORS: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  nuevo:      { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Nuevo'      },
  contactado: { bg: '#fefce8', text: '#92400e', dot: '#f59e0b', label: 'Contactado' },
  en_proceso: { bg: '#f0fdf4', text: '#166534', dot: '#22c55e', label: 'En proceso' },
  cerrado:    { bg: '#dcfce7', text: '#14532d', dot: '#16a34a', label: 'Cerrado ✓'  },
  perdido:    { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444', label: 'Perdido'     },
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
}
function avatarColor(name: string) {
  const c = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6']
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % c.length
  return c[h]
}

export default async function AdminDashboard() {
  const supabase       = await createClient()
  const ahora          = new Date()
  const inicioDia      = new Date(ahora); inicioDia.setHours(0,0,0,0)
  const inicioSemana   = new Date(Date.now() - 7  * 86400000)
  const inicioMes      = new Date(Date.now() - 30 * 86400000)
  const inicioMesAnt   = new Date(Date.now() - 60 * 86400000)

  const [
    { count: totalLeads },
    { count: leadsHoy },
    { count: leadsSemana },
    { count: leadsMes },
    { count: leadsMesAnterior },
    { data: ultimosLeads },
    { data: templates },
    { count: totalEmails },
    { data: estadoData },
    { data: payments },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', inicioDia.toISOString()),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', inicioSemana.toISOString()),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', inicioMes.toISOString()),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', inicioMesAnt.toISOString()).lt('created_at', inicioMes.toISOString()),
    supabase.from('leads').select('id, folio, nombre, email, servicio, estado, created_at').order('created_at', { ascending: false }).limit(12),
    supabase.from('email_templates').select('id, name, updated_at').order('updated_at', { ascending: false }).limit(3),
    supabase.from('email_sends').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('estado'),
    // Pagos del mes actual para widget financiero
    supabase.from('payments').select('amount, status').gte('fecha', new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()),
  ])

  // Pipeline
  const pipeline = Object.keys(ESTADO_COLORS).map(k => ({
    estado: k, ...ESTADO_COLORS[k],
    count: (estadoData ?? []).filter((r: any) => r.estado === k).length,
  }))
  const totalPipeline = pipeline.reduce((a, b) => a + b.count, 0) || 1

  const mesChange = leadsMesAnterior && leadsMesAnterior > 0
    ? Math.round(((leadsMes ?? 0) - leadsMesAnterior) / leadsMesAnterior * 100) : null

  // Widget financiero
  const ingresosMes   = (payments ?? []).filter(p => p.status === 'pagado').reduce((s, p) => s + (p.amount ?? 0), 0)
  const pendientesMes = (payments ?? []).filter(p => p.status === 'pendiente').reduce((s, p) => s + (p.amount ?? 0), 0)
  const fmtMoney = (n: number) => new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  const fecha = ahora.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
  const hora  = ahora.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: '#f1f5f9', minHeight: '100vh' }}>
      <style>{STYLES}</style>
      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '28px 24px 60px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <div className="pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#64748b' }}>Sistema activo</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 2px', letterSpacing: '-0.5px' }}>Dashboard</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', textTransform: 'capitalize' }}>{fecha} · {hora}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/admin/leads" className="dash-btn secondary">👥 Leads</Link>
            <Link href="/admin/pipeline" className="dash-btn secondary">🗂️ Pipeline</Link>
            <Link href="/admin/finanzas" className="dash-btn secondary">💰 Finanzas</Link>
            <a href="https://artiaagency.vercel.app" target="_blank" rel="noopener noreferrer" className="dash-btn primary">🌐 Ver sitio</a>
          </div>
        </div>

        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
          <KPICard label="Leads hoy"   value={leadsHoy    ?? 0} icon="📩" accent="#6366f1" />
          <KPICard label="Semana"      value={leadsSemana ?? 0} icon="📈" accent="#8b5cf6" hero />
          <KPICard label="Mes"         value={leadsMes    ?? 0} icon="📅" accent="#3b82f6"
            change={mesChange !== null ? `${mesChange >= 0 ? '+' : ''}${mesChange}%` : undefined}
            changePositive={mesChange !== null ? mesChange >= 0 : undefined} />
          <KPICard label="Total"       value={totalLeads  ?? 0} icon="👥" accent="#10b981" />
          <KPICard label="Emails env." value={totalEmails ?? 0} icon="✉️"  accent="#f59e0b" />
          <div className="kpi-card" style={{ background: ingresosMes > 0 ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : '#fff', border: `1px solid ${ingresosMes > 0 ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 16, marginBottom: 10 }}>💵</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981', letterSpacing: '-0.5px' }}>{fmtMoney(ingresosMes)}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: 3 }}>Cobrado este mes</div>
            {pendientesMes > 0 && <div style={{ fontSize: 10, color: '#d97706', marginTop: 4 }}>+{fmtMoney(pendientesMes)} pendiente</div>}
          </div>
        </div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 20 }}>

          {/* Leads recientes */}
          <div className="crm-card" style={{ overflow: 'hidden' }}>
            <div className="crm-card-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 18, background: 'linear-gradient(#6366f1, #8b5cf6)', borderRadius: 2 }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Leads recientes</span>
                {ultimosLeads && <span style={{ fontSize: 11, color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>{ultimosLeads.length}</span>}
              </div>
              <Link href="/admin/leads" className="crm-link-btn">Ver todos →</Link>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {ultimosLeads && ultimosLeads.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['', 'Cliente', 'Servicio', 'Estado', 'Folio', 'Fecha'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ultimosLeads.map((lead: any) => {
                      const ec = ESTADO_COLORS[lead.estado ?? 'nuevo'] ?? ESTADO_COLORS.nuevo
                      return (
                        <tr key={lead.id} className="crm-tr">
                          <td style={{ padding: '11px 12px 11px 14px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColor(lead.nombre), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff' }}>
                              {initials(lead.nombre)}
                            </div>
                          </td>
                          <td style={{ padding: '11px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{lead.nombre}</div>
                            {lead.email && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{lead.email}</div>}
                          </td>
                          <td style={{ padding: '11px 14px', borderBottom: '1px solid #f1f5f9', color: '#64748b', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{lead.servicio ?? '—'}</td>
                          <td style={{ padding: '11px 14px', borderBottom: '1px solid #f1f5f9' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: ec.bg, color: ec.text, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6 }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: ec.dot }} />
                              {ec.label}
                            </span>
                          </td>
                          <td style={{ padding: '11px 14px', borderBottom: '1px solid #f1f5f9' }}>
                            {lead.folio ? (
                              <Link href={`/admin/cliente/${lead.folio}`} style={{ fontFamily: 'monospace', fontSize: 11, color: '#6366f1', background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.2)', padding: '3px 8px', borderRadius: 5, textDecoration: 'none', fontWeight: 700, letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                                {lead.folio}
                              </Link>
                            ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                          </td>
                          <td style={{ padding: '11px 14px', borderBottom: '1px solid #f1f5f9', color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                            {new Date(lead.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>Sin leads aún.</div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Pipeline */}
            <div className="crm-card">
              <div className="crm-card-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 3, height: 18, background: 'linear-gradient(#f59e0b,#ef4444)', borderRadius: 2 }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Pipeline</span>
                </div>
                <Link href="/admin/pipeline" className="crm-link-btn">Kanban →</Link>
              </div>
              <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pipeline.map(p => (
                  <div key={p.estado}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.dot }} />{p.label}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', fontFamily: 'monospace' }}>{p.count}</span>
                    </div>
                    <div style={{ height: 5, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(p.count / totalPipeline) * 100}%`, background: p.dot, borderRadius: 99, minWidth: p.count > 0 ? 4 : 0 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones */}
            <div className="crm-card">
              <div className="crm-card-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 3, height: 18, background: 'linear-gradient(#6366f1,#8b5cf6)', borderRadius: 2 }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Acciones</span>
                </div>
              </div>
              <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { href: '/admin/finanzas',     label: 'Panel financiero',    icon: '💰', c: '#10b981', bg: 'rgba(16,185,129,.07)',  bd: 'rgba(16,185,129,.18)'  },
                  { href: '/admin/proyectos',    label: 'Proyectos activos',   icon: '📁', c: '#8b5cf6', bg: 'rgba(139,92,246,.07)',  bd: 'rgba(139,92,246,.18)'  },
                  { href: '/admin/emails/nueva', label: 'Nueva plantilla',     icon: '✦',  c: '#6366f1', bg: 'rgba(99,102,241,.07)',  bd: 'rgba(99,102,241,.18)'  },
                  { href: '/admin/ia',           label: 'Consulta IA',         icon: '🤖', c: '#f59e0b', bg: 'rgba(245,158,11,.07)',  bd: 'rgba(245,158,11,.18)'  },
                  { href: '/admin/imagenes',     label: 'Subir imágenes',      icon: '↑',  c: '#3b82f6', bg: 'rgba(59,130,246,.07)',  bd: 'rgba(59,130,246,.18)'  },
                ].map(a => (
                  <Link key={a.href} href={a.href} className="crm-action-link"
                    style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', borderRadius: 8, background: a.bg, border: `1px solid ${a.bd}`, fontSize: 12, fontWeight: 600, color: a.c, textDecoration: 'none' }}>
                    <span style={{ fontSize: 13 }}>{a.icon}</span> {a.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: buscar folio + PostHog + Sentry */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>

          {/* Buscar folio + plantillas */}
          <div className="crm-card">
            <div className="crm-card-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 3, height: 18, background: 'linear-gradient(#10b981,#3b82f6)', borderRadius: 2 }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Buscar folio</span>
              </div>
            </div>
            <div style={{ padding: '0 18px 18px' }}>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '12px 0', lineHeight: 1.5 }}>Accede a cualquier lead por su folio.</p>
              <form method="GET" action="/admin/cliente" style={{ display: 'flex', gap: 8 }}>
                <input name="folio" placeholder="ASMKT-0381"
                  style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#0f172a', background: '#f8fafc', outline: 'none', fontFamily: 'monospace', letterSpacing: '0.5px' }} />
                <button type="submit" style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>→</button>
              </form>
              <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 16, paddingTop: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Plantillas recientes</span>
                  <Link href="/admin/emails" style={{ fontSize: 11, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Ver todas →</Link>
                </div>
                {templates && templates.length > 0 ? templates.map((t: any) => (
                  <Link key={t.id} href={`/admin/emails/${t.id}`} className="crm-tpl-link"
                    style={{ display: 'block', padding: '9px 11px', borderRadius: 7, background: '#f8fafc', border: '1px solid #e2e8f0', textDecoration: 'none', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: '#0f172a' }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2, fontFamily: 'monospace' }}>
                      {new Date(t.updated_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </Link>
                )) : <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Sin plantillas aún.</p>}
              </div>
            </div>
          </div>

          <PostHogWidget />

          <SentryWidget />
        </div>
      </div>
    </div>
  )
}

function KPICard({ label, value, icon, accent, hero, change, changePositive }: {
  label: string; value: number; icon: string; accent: string; hero?: boolean
  change?: string; changePositive?: boolean
}) {
  return (
    <div className="kpi-card" style={{
      background: hero ? `linear-gradient(135deg, ${accent}18, ${accent}0a)` : '#ffffff',
      border: hero ? `1px solid ${accent}30` : '1px solid #e2e8f0',
      borderRadius: 14, padding: '18px 20px', position: 'relative', overflow: 'hidden',
    }}>
      {hero && <div style={{ position: 'absolute', top: -30, right: -30, width: 90, height: 90, borderRadius: '50%', background: `${accent}10` }} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 16, background: hero ? `${accent}15` : '#f8fafc', padding: '5px 6px', borderRadius: 7 }}>{icon}</span>
        {change && (
          <span style={{ fontSize: 10, fontWeight: 700, color: changePositive ? '#16a34a' : '#dc2626', background: changePositive ? '#f0fdf4' : '#fef2f2', padding: '2px 7px', borderRadius: 12 }}>
            {change}
          </span>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: hero ? accent : '#0f172a', letterSpacing: '-1px', marginBottom: 3 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: hero ? accent : '#94a3b8', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</div>
    </div>
  )
}

const STYLES = `
  @keyframes pulseDot { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(34,197,94,.4)}50%{opacity:.7;box-shadow:0 0 0 5px rgba(34,197,94,0)} }
  .pulse-dot{animation:pulseDot 2s ease-in-out infinite}
  .dash-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:9px;font-size:13px;font-weight:600;text-decoration:none;transition:all .18s;cursor:pointer}
  .dash-btn.primary{background:#0f172a;color:#fff}
  .dash-btn.primary:hover{background:#1e293b}
  .dash-btn.secondary{background:#fff;color:#374151;border:1px solid #e2e8f0}
  .dash-btn.secondary:hover{background:#f8fafc;border-color:#cbd5e1}
  .crm-card{background:#fff;border-radius:14px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,.04),0 4px 12px rgba(0,0,0,.03);transition:box-shadow .2s}
  .crm-card:hover{box-shadow:0 2px 6px rgba(0,0,0,.06),0 8px 24px rgba(0,0,0,.05)}
  .crm-card-head{display:flex;justify-content:space-between;align-items:center;padding:16px 18px 14px;border-bottom:1px solid #f1f5f9}
  .crm-link-btn{font-size:11px;color:#6366f1;text-decoration:none;font-weight:700;background:rgba(99,102,241,.07);padding:5px 11px;border-radius:7px;border:1px solid rgba(99,102,241,.18);transition:all .18s}
  .crm-link-btn:hover{background:rgba(99,102,241,.13)}
  .crm-tr{transition:background .12s}
  .crm-tr:hover{background:#fafbff!important}
  .crm-action-link{transition:opacity .15s,transform .15s}
  .crm-action-link:hover{opacity:.82;transform:translateX(2px)}
  .crm-tpl-link{transition:background .15s}
  .crm-tpl-link:hover{background:#f1f5f9!important}
  .kpi-card{transition:transform .18s,box-shadow .18s}
  .kpi-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.09)!important}
`
