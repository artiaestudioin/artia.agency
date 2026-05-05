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

const LOGO_LIGHT = 'https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/logo%20artia%20azul.png'
const LOGO_DARK  = 'https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png'

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
}

function avatarColor(name: string) {
  const c = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6']
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % c.length
  return c[h]
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const ahora = new Date()
  const inicioDia = new Date(ahora); inicioDia.setHours(0,0,0,0)
  const inicioSemana = new Date(Date.now() - 7 * 86400000)
  const inicioMes = new Date(Date.now() - 30 * 86400000)
  const inicioMesAnt = new Date(Date.now() - 60 * 86400000)

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
    { data: paymentParents },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', inicioDia.toISOString()),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', inicioSemana.toISOString()),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', inicioMes.toISOString()),
    supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', inicioMesAnt.toISOString()).lt('created_at', inicioMes.toISOString()),
    supabase.from('leads').select('id, folio, nombre, email, servicio, estado, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('email_templates').select('id, name, updated_at').order('updated_at', { ascending: false }).limit(3),
    supabase.from('email_sends').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('estado'),
    supabase.from('payment_parents').select(`
      id, lead_id, contract_value, description, payment_month, status, created_at,
      installments:payment_installments (id, amount, status, payment_date, payment_number),
      lead:lead_id (nombre, folio, servicio)
    `),
  ])

  const pipeline = Object.keys(ESTADO_COLORS).map(k => ({
    estado: k, ...ESTADO_COLORS[k],
    count: (estadoData ?? []).filter((r: any) => r.estado === k).length,
  }))
  const totalPipeline = pipeline.reduce((a, b) => a + b.count, 0) || 1

  const mesChange = leadsMesAnterior && leadsMesAnterior > 0
    ? Math.round(((leadsMes ?? 0) - leadsMesAnterior) / leadsMesAnterior * 100) : null

  const totalFacturado = (paymentParents ?? []).reduce((s: number, p: any) => s + (p.contract_value || 0), 0)
  const totalPagado = (paymentParents ?? []).reduce((s: number, p: any) => 
    s + (p.installments ?? []).filter((i: any) => i.status === 'pagado').reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0), 0)
  const totalPendiente = totalFacturado - totalPagado

  const fecha = ahora.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
  const hora = ahora.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="dashboard-container">
      <style>{STYLES}</style>

      {/* Header */}
      <header className="dashboard-header">
        <div className="header-branding">
          <div className="logo-wrapper">
            <img 
              src={LOGO_LIGHT} 
              alt="Artia Agency" 
              className="logo-light" 
              style={{ height: 32, width: 'auto', objectFit: 'contain' }}
            />
            <img 
              src={LOGO_DARK} 
              alt="Artia Agency" 
              className="logo-dark" 
              style={{ height: 32, width: 'auto', objectFit: 'contain' }}
            />
            <span className="crm-tag">CRM</span>
          </div>
          <div className="header-meta">
            <div className="status-badge">
              <span className="pulse-dot" />
              <span>Sistema activo</span>
            </div>
            <h1>Dashboard</h1>
            <p>{fecha} · {hora}</p>
          </div>
        </div>
        <div className="header-actions">
          <Link href="/admin/leads" className="btn-secondary">👥 Leads</Link>
          <Link href="/admin/pipeline" className="btn-secondary">🗂️ Pipeline</Link>
          <Link href="/admin/finanzas" className="btn-secondary">💰 Finanzas</Link>
          <a href="https://artiaagency.vercel.app" target="_blank" rel="noopener noreferrer" className="btn-primary">🌐 Ver sitio</a>
        </div>
      </header>

      {/* KPI Grid - Rediseñado: más ancho, centrado, mejor distribución */}
      <section className="kpi-grid">
        <KPICard label="Leads hoy" value={leadsHoy ?? 0} icon="📩" accent="#6366f1" />
        <KPICard label="Esta semana" value={leadsSemana ?? 0} icon="📈" accent="#8b5cf6" hero />
        <KPICard label="Este mes" value={leadsMes ?? 0} icon="📅" accent="#3b82f6"
          change={mesChange !== null ? `${mesChange >= 0 ? '+' : ''}${mesChange}%` : undefined}
          changePositive={mesChange !== null ? mesChange >= 0 : undefined} />
        <KPICard label="Total acumulado" value={totalLeads ?? 0} icon="👥" accent="#10b981" />
        <KPICard label="Emails enviados" value={totalEmails ?? 0} icon="✉️" accent="#f59e0b" />
        
        {/* KPI Financiero */}
        <div className="kpi-card kpi-finance">
          <div className="kpi-finance-header">
            <span className="kpi-finance-icon">💵</span>
            <div className="kpi-finance-main">
              <div className="kpi-finance-value">{fmtMoney(totalFacturado)}</div>
              <div className="kpi-finance-label">Facturado total</div>
            </div>
          </div>
          <div className="kpi-finance-detail">
            <span className="text-success">{fmtMoney(totalPagado)} pagado</span>
            {totalPendiente > 0 && <span className="text-warning">{fmtMoney(totalPendiente)} pendiente</span>}
          </div>
          <div className="kpi-finance-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${totalFacturado > 0 ? (totalPagado / totalFacturado) * 100 : 0}%` }} />
            </div>
            <span className="progress-text">{totalFacturado > 0 ? Math.round((totalPagado / totalFacturado) * 100) : 0}% cobrado</span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="main-grid">
        {/* Leads Table - Máximo 5 registros, fila clickeable completa */}
        <section className="card leads-card">
          <div className="card-header">
            <div className="card-title">
              <div className="title-bar" style={{ background: 'linear-gradient(#6366f1, #8b5cf6)' }} />
              <span>Leads recientes</span>
              {ultimosLeads && <span className="badge">{ultimosLeads.length} de {totalLeads ?? 0}</span>}
            </div>
            <Link href="/admin/leads" className="link-btn">Ver todos →</Link>
          </div>
          <div className="table-wrapper">
            {ultimosLeads && ultimosLeads.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    {['', 'Cliente', 'Servicio', 'Estado', 'Folio', 'Fecha'].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ultimosLeads.map((lead: any) => {
                    const ec = ESTADO_COLORS[lead.estado ?? 'nuevo'] ?? ESTADO_COLORS.nuevo
                    const href = lead.folio ? `/admin/cliente/${lead.folio}` : `/admin/cliente/${lead.id}`
                    return (
                      <tr key={lead.id} className="table-row-clickable">
                        <td>
                          <Link href={href} className="row-link">
                            <div className="avatar" style={{ background: avatarColor(lead.nombre) }}>
                              {initials(lead.nombre)}
                            </div>
                          </Link>
                        </td>
                        <td>
                          <Link href={href} className="row-link">
                            <div className="cell-name">{lead.nombre}</div>
                            {lead.email && <div className="cell-email">{lead.email}</div>}
                          </Link>
                        </td>
                        <td className="cell-service">
                          <Link href={href} className="row-link">{lead.servicio ?? '—'}</Link>
                        </td>
                        <td>
                          <Link href={href} className="row-link">
                            <span className="status-badge" style={{ background: ec.bg, color: ec.text }}>
                              <span className="status-dot" style={{ background: ec.dot }} />
                              {ec.label}
                            </span>
                          </Link>
                        </td>
                        <td>
                          <Link href={href} className="row-link">
                            {lead.folio ? (
                              <span className="folio-badge">{lead.folio}</span>
                            ) : <span className="text-muted">—</span>}
                          </Link>
                        </td>
                        <td className="cell-date">
                          <Link href={href} className="row-link">
                            {new Date(lead.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">Sin leads aún.</div>
            )}
          </div>
        </section>

        {/* Sidebar - Reorganizado: Pipeline, Acciones, Buscar Folio */}
        <aside className="sidebar">
          {/* Pipeline */}
          <section className="card">
            <div className="card-header">
              <div className="card-title">
                <div className="title-bar" style={{ background: 'linear-gradient(#f59e0b, #ef4444)' }} />
                <span>Pipeline</span>
              </div>
              <Link href="/admin/pipeline" className="link-btn">Kanban →</Link>
            </div>
            <div className="pipeline-list">
              {pipeline.map(p => (
                <div key={p.estado} className="pipeline-item">
                  <div className="pipeline-info">
                    <span className="pipeline-label">
                      <span className="status-dot" style={{ background: p.dot }} />
                      {p.label}
                    </span>
                    <span className="pipeline-count">{p.count}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(p.count / totalPipeline) * 100}%`, background: p.dot }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Acciones Rápidas */}
          <section className="card">
            <div className="card-header">
              <div className="card-title">
                <div className="title-bar" style={{ background: 'linear-gradient(#6366f1, #8b5cf6)' }} />
                <span>Acciones rápidas</span>
              </div>
            </div>
            <div className="actions-list">
              {[
                { href: '/admin/finanzas', label: 'Panel financiero', icon: '💰', c: '#10b981' },
                { href: '/admin/proyectos', label: 'Proyectos activos', icon: '📁', c: '#8b5cf6' },
                { href: '/admin/emails/nueva', label: 'Nueva plantilla', icon: '✦', c: '#6366f1' },
                { href: '/admin/ia', label: 'Consulta IA', icon: '🤖', c: '#f59e0b' },
                { href: '/admin/imagenes', label: 'Subir imágenes', icon: '↑', c: '#3b82f6' },
              ].map(a => (
                <Link key={a.href} href={a.href} className="action-link" style={{ '--accent': a.c } as any}>
                  <span>{a.icon}</span> {a.label}
                </Link>
              ))}
            </div>
          </section>

          {/* Buscar Folio - Reubicado al sidebar */}
          <section className="card">
            <div className="card-header">
              <div className="card-title">
                <div className="title-bar" style={{ background: 'linear-gradient(#10b981, #3b82f6)' }} />
                <span>Buscar folio</span>
              </div>
            </div>
            <div className="card-body">
              <p className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>Accede directamente a cualquier lead por su número de folio.</p>
              <form method="GET" action="/admin/cliente" className="search-form">
                <input name="folio" placeholder="Ej: ART-2024-001" className="search-input" />
                <button type="submit" className="search-btn">→</button>
              </form>
            </div>
          </section>
        </aside>
      </div>

      {/* Bottom Row */}
      <div className="bottom-grid">
        {/* Plantillas recientes */}
        <section className="card">
          <div className="card-header">
            <div className="card-title">
              <div className="title-bar" style={{ background: 'linear-gradient(#ec4899, #8b5cf6)' }} />
              <span>Plantillas recientes</span>
            </div>
            <Link href="/admin/emails" className="link-btn">Ver todas →</Link>
          </div>
          <div className="card-body" style={{ paddingTop: 8 }}>
            {templates && templates.length > 0 ? templates.map((t: any) => (
              <Link key={t.id} href={`/admin/emails/${t.id}`} className="template-link">
                <div className="template-name">{t.name}</div>
                <div className="template-date">
                  {new Date(t.updated_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </Link>
            )) : <p className="text-muted">Sin plantillas aún.</p>}
          </div>
        </section>

        <PostHogWidget />
        <SentryWidget />
      </div>
    </div>
  )
}

function KPICard({ label, value, icon, accent, hero, change, changePositive }: {
  label: string; value: number; icon: string; accent: string; hero?: boolean
  change?: string; changePositive?: boolean
}) {
  return (
    <div className={`kpi-card ${hero ? 'kpi-hero' : ''}`} style={{ '--accent': accent } as any}>
      {hero && <div className="kpi-hero-glow" />}
      <div className="kpi-content">
        <div className="kpi-icon-wrapper">
          <span className="kpi-icon">{icon}</span>
        </div>
        <div className="kpi-data">
          <div className="kpi-value" style={{ color: hero ? accent : '#0f172a' }}>{value}</div>
          <div className="kpi-label">{label}</div>
        </div>
        {change && (
          <span className={`kpi-change ${changePositive ? 'positive' : 'negative'}`}>
            {change}
          </span>
        )}
      </div>
    </div>
  )
}

const STYLES = `
  .dashboard-container { 
    font-family: 'Inter', system-ui, -apple-system, sans-serif; 
    max-width: 1400px;
    margin: 0 auto;
  }
  
  /* ─── Header & Branding ─── */
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
    flex-wrap: wrap;
    gap: 20px;
  }
  .header-branding {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .logo-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px 0;
  }
  .logo-wrapper img {
    height: 32px;
    width: auto;
    object-fit: contain;
    display: block;
  }
  .logo-dark { display: none; }
  @media (prefers-color-scheme: dark) {
    .logo-light { display: none; }
    .logo-dark { display: block; }
  }
  .crm-tag {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #94a3b8;
    padding: 3px 8px;
    background: #f1f5f9;
    border-radius: 4px;
    margin-left: 4px;
  }
  .header-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .status-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }
  .status-badge span:last-child {
    font-family: monospace;
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 600;
  }
  .pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #22c55e;
    animation: pulseDot 2s ease-in-out infinite;
  }
  @keyframes pulseDot {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(34,197,94,.4); }
    50% { opacity: .7; box-shadow: 0 0 0 6px rgba(34,197,94,0); }
  }
  .dashboard-header h1 {
    font-size: 28px;
    font-weight: 800;
    color: #0f172a;
    margin: 0;
    letter-spacing: -0.8px;
    line-height: 1.2;
  }
  .dashboard-header p {
    margin: 4px 0 0;
    font-size: 13px;
    color: #94a3b8;
    text-transform: capitalize;
    font-weight: 500;
  }
  .header-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }
  .btn-primary, .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 18px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition: all .2s;
    cursor: pointer;
    border: none;
  }
  .btn-primary {
    background: #0f172a;
    color: #fff;
  }
  .btn-primary:hover { 
    background: #1e293b; 
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(15,23,42,0.2);
  }
  .btn-secondary {
    background: #fff;
    color: #374151;
    border: 1px solid #e2e8f0;
  }
  .btn-secondary:hover { 
    background: #f8fafc; 
    border-color: #cbd5e1;
    transform: translateY(-1px);
  }

  /* ─── KPI Grid ─── */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 16px;
    margin-bottom: 28px;
  }
  @media (max-width: 1200px) {
    .kpi-grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 768px) {
    .kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  }
  
  .kpi-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 20px;
    position: relative;
    overflow: hidden;
    transition: transform .2s, box-shadow .2s;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 120px;
  }
  .kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(0,0,0,.08);
    border-color: #cbd5e1;
  }
  .kpi-hero {
    background: linear-gradient(135deg, var(--accent)08, var(--accent)04);
    border-color: var(--accent)25;
  }
  .kpi-hero-glow {
    position: absolute;
    top: -40px;
    right: -40px;
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: var(--accent)08;
    pointer-events: none;
  }
  .kpi-content {
    display: flex;
    align-items: center;
    gap: 14px;
    position: relative;
    z-index: 1;
  }
  .kpi-icon-wrapper {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .kpi-hero .kpi-icon-wrapper {
    background: var(--accent)12;
  }
  .kpi-icon {
    font-size: 20px;
    line-height: 1;
  }
  .kpi-data {
    flex: 1;
    min-width: 0;
  }
  .kpi-value {
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -1.5px;
    line-height: 1;
    margin-bottom: 6px;
  }
  .kpi-label {
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }
  .kpi-change {
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 20px;
    flex-shrink: 0;
    margin-left: auto;
  }
  .kpi-change.positive {
    color: #16a34a;
    background: #f0fdf4;
  }
  .kpi-change.negative {
    color: #dc2626;
    background: #fef2f2;
  }

  /* ─── KPI Finance ─── */
  .kpi-finance {
    background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
    border-color: #bbf7d0;
  }
  .kpi-finance-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 14px;
  }
  .kpi-finance-icon {
    font-size: 24px;
    line-height: 1;
  }
  .kpi-finance-main {
    flex: 1;
  }
  .kpi-finance-value {
    font-size: 24px;
    font-weight: 800;
    color: #10b981;
    letter-spacing: -0.5px;
    line-height: 1.2;
  }
  .kpi-finance-label {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 2px;
  }
  .kpi-finance-detail {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
    font-size: 12px;
    flex-wrap: wrap;
  }
  .text-success { color: #10b981; font-weight: 700; }
  .text-warning { color: #d97706; font-weight: 700; }
  .kpi-finance-progress {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .progress-text {
    font-size: 11px;
    color: #94a3b8;
    font-weight: 600;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  /* ─── Main Grid ─── */
  .main-grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 24px;
    margin-bottom: 24px;
    align-items: start;
  }
  @media (max-width: 1024px) {
    .main-grid { grid-template-columns: 1fr; }
  }

  /* ─── Cards ─── */
  .card {
    background: #fff;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.03);
    overflow: hidden;
    transition: box-shadow .2s;
  }
  .card:hover {
    box-shadow: 0 2px 6px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.05);
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 20px 16px;
    border-bottom: 1px solid #f1f5f9;
  }
  .card-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
  }
  .title-bar {
    width: 4px;
    height: 20px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .badge {
    font-size: 11px;
    color: #64748b;
    background: #f1f5f9;
    padding: 3px 10px;
    border-radius: 20px;
    font-weight: 600;
  }
  .link-btn {
    font-size: 12px;
    color: #6366f1;
    text-decoration: none;
    font-weight: 700;
    background: rgba(99,102,241,.08);
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid rgba(99,102,241,.15);
    transition: all .2s;
    white-space: nowrap;
  }
  .link-btn:hover {
    background: rgba(99,102,241,.14);
    border-color: rgba(99,102,241,.25);
  }
  .card-body {
    padding: 16px 20px 20px;
  }

  /* ─── Table ─── */
  .table-wrapper {
    overflow-x: auto;
  }
  .data-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
  }
  .data-table thead tr {
    background: #fafbff;
  }
  .data-table th {
    padding: 12px 16px;
    text-align: left;
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
  }
  .data-table td {
    padding: 0;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  .data-table tbody tr:last-child td {
    border-bottom: none;
  }
  
  /* ─── FILA CLICKEABLE ─── */
  .table-row-clickable {
    transition: background .15s ease;
  }
  .table-row-clickable:hover {
    background: #f8fafc;
  }
  .table-row-clickable:hover td {
    background: transparent;
  }
  .row-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    text-decoration: none;
    color: inherit;
    width: 100%;
    height: 100%;
  }
  .row-link:hover {
    color: inherit;
  }

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 800;
    color: #fff;
    flex-shrink: 0;
  }
  .cell-name {
    font-weight: 700;
    color: #0f172a;
    font-size: 13px;
    line-height: 1.3;
  }
  .cell-email {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
    font-weight: 500;
  }
  .cell-service {
    color: #475569;
    max-width: 160px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
  }
  .cell-service .row-link {
    justify-content: flex-start;
  }
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 20px;
    white-space: nowrap;
  }
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .folio-badge {
    font-family: 'SF Mono', Monaco, monospace;
    font-size: 11px;
    color: #6366f1;
    background: rgba(99,102,241,.08);
    border: 1px solid rgba(99,102,241,.18);
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 700;
    letter-spacing: 0.3px;
    white-space: nowrap;
  }
  .cell-date {
    color: #94a3b8;
    font-size: 12px;
    font-family: 'SF Mono', Monaco, monospace;
    font-variant-numeric: tabular-nums;
  }
  .cell-date .row-link {
    justify-content: flex-start;
  }
  .text-muted {
    color: #94a3b8;
    font-size: 13px;
  }

  /* ─── Sidebar ─── */
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  /* ─── Pipeline ─── */
  .pipeline-list {
    padding: 0 20px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .pipeline-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .pipeline-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .pipeline-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #374151;
  }
  .pipeline-count {
    font-size: 13px;
    font-weight: 800;
    color: #64748b;
    font-family: 'SF Mono', Monaco, monospace;
  }
  .progress-bar {
    height: 6px;
    background: #f1f5f9;
    border-radius: 99px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    min-width: 2px;
  }

  /* ─── Actions ─── */
  .actions-list {
    padding: 0 20px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .action-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 10px;
    background: var(--accent)06;
    border: 1px solid var(--accent)12;
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    text-decoration: none;
    transition: all .2s;
  }
  .action-link:hover {
    background: var(--accent)10;
    transform: translateX(3px);
    border-color: var(--accent)25;
  }
  .action-link span {
    font-size: 16px;
    line-height: 1;
  }

  /* ─── Search Form (Sidebar) ─── */
  .search-form {
    display: flex;
    gap: 8px;
  }
  .search-input {
    flex: 1;
    border: 1.5px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 13px;
    color: #0f172a;
    background: #f8fafc;
    outline: none;
    font-family: 'SF Mono', Monaco, monospace;
    letter-spacing: 0.3px;
    transition: border-color .2s, box-shadow .2s;
  }
  .search-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99,102,241,.08);
  }
  .search-input::placeholder {
    color: #94a3b8;
    font-family: 'Inter', system-ui, sans-serif;
  }
  .search-btn {
    background: #6366f1;
    color: #fff;
    border: none;
    border-radius: 10px;
    padding: 0 16px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: background .2s, transform .1s;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .search-btn:hover {
    background: #4f46e5;
  }
  .search-btn:active {
    transform: scale(0.96);
  }

  /* ─── Bottom Grid ─── */
  .bottom-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 24px;
  }
  @media (max-width: 1024px) {
    .bottom-grid { grid-template-columns: 1fr; }
  }

  /* ─── Templates ─── */
  .template-link {
    display: block;
    padding: 12px 14px;
    border-radius: 10px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    text-decoration: none;
    margin-bottom: 8px;
    transition: all .2s;
  }
  .template-link:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    transform: translateX(2px);
  }
  .template-link:last-child {
    margin-bottom: 0;
  }
  .template-name {
    font-weight: 700;
    font-size: 13px;
    color: #0f172a;
    margin-bottom: 4px;
  }
  .template-date {
    font-size: 11px;
    color: #94a3b8;
    font-family: 'SF Mono', Monaco, monospace;
  }

  /* ─── Empty State ─── */
  .empty-state {
    padding: 56px 24px;
    text-align: center;
    color: #94a3b8;
    font-size: 14px;
    font-weight: 500;
  }

  /* ─── Responsive ─── */
  @media (max-width: 768px) {
    .dashboard-header {
      flex-direction: column;
      gap: 16px;
    }
    .header-actions {
      width: 100%;
    }
    .header-actions a {
      flex: 1;
      justify-content: center;
    }
    .kpi-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .kpi-value {
      font-size: 26px;
    }
    .main-grid {
      grid-template-columns: 1fr;
    }
    .sidebar {
      order: -1;
    }
    .bottom-grid {
      grid-template-columns: 1fr;
    }
    .data-table {
      font-size: 12px;
    }
    .data-table th, .data-table td {
      padding: 0;
    }
    .row-link {
      padding: 10px 12px;
    }
    .cell-service, .cell-email {
      max-width: 120px;
    }
  }
`