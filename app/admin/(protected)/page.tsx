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

  // NUEVO MODELO: payment_parents + payment_installments
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
    supabase.from('leads').select('id, folio, nombre, email, servicio, estado, created_at').order('created_at', { ascending: false }).limit(12),
    supabase.from('email_templates').select('id, name, updated_at').order('updated_at', { ascending: false }).limit(3),
    supabase.from('email_sends').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('estado'),
    // NUEVO: payment_parents con installments anidados
    supabase.from('payment_parents').select(`
      id, lead_id, contract_value, description, payment_month, status, created_at,
      installments:payment_installments (id, amount, status, payment_date, payment_number),
      lead:lead_id (nombre, folio, servicio)
    `),
  ])

  // Pipeline
  const pipeline = Object.keys(ESTADO_COLORS).map(k => ({
    estado: k, ...ESTADO_COLORS[k],
    count: (estadoData ?? []).filter((r: any) => r.estado === k).length,
  }))
  const totalPipeline = pipeline.reduce((a, b) => a + b.count, 0) || 1

  const mesChange = leadsMesAnterior && leadsMesAnterior > 0
    ? Math.round(((leadsMes ?? 0) - leadsMesAnterior) / leadsMesAnterior * 100) : null

  // NUEVO: Widget financiero con payment_parents
  const totalFacturado = (paymentParents ?? []).reduce((s: number, p: any) => s + (p.contract_value || 0), 0)
  const totalPagado = (paymentParents ?? []).reduce((s: number, p: any) => 
    s + (p.installments ?? []).filter((i: any) => i.status === 'pagado').reduce((sum: number, i: any) => sum + (Number(i.amount) || 0), 0), 0)
  const totalPendiente = totalFacturado - totalPagado
  const contratosActivos = (paymentParents ?? []).filter((p: any) => p.status === 'activo').length

  const fecha = ahora.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
  const hora = ahora.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="dashboard-container">
      <style>{STYLES}</style>

      {/* Header */}
      <header className="dashboard-header">
        <div>
          <div className="status-badge">
            <span className="pulse-dot" />
            <span>Sistema activo</span>
          </div>
          <h1>Dashboard</h1>
          <p>{fecha} · {hora}</p>
        </div>
        <div className="header-actions">
          <Link href="/admin/leads" className="btn-secondary">👥 Leads</Link>
          <Link href="/admin/pipeline" className="btn-secondary">🗂️ Pipeline</Link>
          <Link href="/admin/finanzas" className="btn-secondary">💰 Finanzas</Link>
          <a href="https://artiaagency.vercel.app" target="_blank" rel="noopener noreferrer" className="btn-primary">🌐 Ver sitio</a>
        </div>
      </header>

      {/* KPI Grid */}
      <section className="kpi-grid">
        <KPICard label="Leads hoy" value={leadsHoy ?? 0} icon="📩" accent="#6366f1" />
        <KPICard label="Semana" value={leadsSemana ?? 0} icon="📈" accent="#8b5cf6" hero />
        <KPICard label="Mes" value={leadsMes ?? 0} icon="📅" accent="#3b82f6"
          change={mesChange !== null ? `${mesChange >= 0 ? '+' : ''}${mesChange}%` : undefined}
          changePositive={mesChange !== null ? mesChange >= 0 : undefined} />
        <KPICard label="Total" value={totalLeads ?? 0} icon="👥" accent="#10b981" />
        <KPICard label="Emails env." value={totalEmails ?? 0} icon="✉️" accent="#f59e0b" />
        
        {/* NUEVO: KPI Financiero */}
        <div className="kpi-card kpi-finance">
          <div className="kpi-finance-header">
            <span>💵</span>
            <div>
              <div className="kpi-finance-value">{fmtMoney(totalFacturado)}</div>
              <div className="kpi-finance-label">Facturado total</div>
            </div>
          </div>
          <div className="kpi-finance-detail">
            <span className="text-success">{fmtMoney(totalPagado)} pagado</span>
            {totalPendiente > 0 && <span className="text-warning">+{fmtMoney(totalPendiente)} pendiente</span>}
          </div>
          <div className="kpi-finance-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${totalFacturado > 0 ? (totalPagado / totalFacturado) * 100 : 0}%` }} />
            </div>
            <span>{totalFacturado > 0 ? Math.round((totalPagado / totalFacturado) * 100) : 0}% cobrado</span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="main-grid">
        {/* Leads Table */}
        <section className="card leads-card">
          <div className="card-header">
            <div className="card-title">
              <div className="title-bar" style={{ background: 'linear-gradient(#6366f1, #8b5cf6)' }} />
              <span>Leads recientes</span>
              {ultimosLeads && <span className="badge">{ultimosLeads.length}</span>}
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
                    return (
                      <tr key={lead.id} className="table-row-hover">
                        <td>
                          <div className="avatar" style={{ background: avatarColor(lead.nombre) }}>
                            {initials(lead.nombre)}
                          </div>
                        </td>
                        <td>
                          <div className="cell-name">{lead.nombre}</div>
                          {lead.email && <div className="cell-email">{lead.email}</div>}
                        </td>
                        <td className="cell-service">{lead.servicio ?? '—'}</td>
                        <td>
                          <span className="status-badge" style={{ background: ec.bg, color: ec.text }}>
                            <span className="status-dot" style={{ background: ec.dot }} />
                            {ec.label}
                          </span>
                        </td>
                        <td>
                          {lead.folio ? (
                            <Link href={`/admin/cliente/${lead.folio}`} className="folio-link">
                              {lead.folio}
                            </Link>
                          ) : <span className="text-muted">—</span>}
                        </td>
                        <td className="cell-date">
                          {new Date(lead.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
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

        {/* Sidebar */}
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
                <span>Acciones</span>
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
        </aside>
      </div>

      {/* Bottom Row */}
      <div className="bottom-grid">
        {/* Buscar Folio */}
        <section className="card">
          <div className="card-header">
            <div className="card-title">
              <div className="title-bar" style={{ background: 'linear-gradient(#10b981, #3b82f6)' }} />
              <span>Buscar folio</span>
            </div>
          </div>
          <div className="card-body">
            <p className="text-muted">Accede a cualquier lead por su folio.</p>
            <form method="GET" action="/admin/cliente" className="search-form">
              <input name="folio" placeholder="ASMKT-0381" className="search-input" />
              <button type="submit" className="search-btn">→</button>
            </form>
            <div className="templates-section">
              <div className="templates-header">
                <span>Plantillas recientes</span>
                <Link href="/admin/emails">Ver todas →</Link>
              </div>
              {templates && templates.length > 0 ? templates.map((t: any) => (
                <Link key={t.id} href={`/admin/emails/${t.id}`} className="template-link">
                  <div>{t.name}</div>
                  <div className="template-date">
                    {new Date(t.updated_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </Link>
              )) : <p className="text-muted">Sin plantillas aún.</p>}
            </div>
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
      <div className="kpi-header">
        <span className="kpi-icon">{icon}</span>
        {change && (
          <span className={`kpi-change ${changePositive ? 'positive' : 'negative'}`}>
            {change}
          </span>
        )}
      </div>
      <div className="kpi-value" style={{ color: hero ? accent : '#0f172a' }}>{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  )
}

const STYLES = `
  .dashboard-container { font-family: 'Inter', system-ui, sans-serif; }
  
  /* Header */
  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 28px;
    flex-wrap: wrap;
    gap: 16px;
  }
  .status-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 3px;
  }
  .status-badge span:last-child {
    font-family: monospace;
    font-size: 10px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #64748b;
  }
  .pulse-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #22c55e;
    animation: pulseDot 2s ease-in-out infinite;
  }
  @keyframes pulseDot {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(34,197,94,.4); }
    50% { opacity: .7; box-shadow: 0 0 0 5px rgba(34,197,94,0); }
  }
  .dashboard-header h1 {
    font-size: 24px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 2px;
    letter-spacing: -0.5px;
  }
  .dashboard-header p {
    margin: 0;
    font-size: 12px;
    color: #94a3b8;
    text-transform: capitalize;
  }
  .header-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .btn-primary, .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 9px;
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    transition: all .18s;
    cursor: pointer;
  }
  .btn-primary {
    background: #0f172a;
    color: #fff;
  }
  .btn-primary:hover { background: #1e293b; }
  .btn-secondary {
    background: #fff;
    color: #374151;
    border: 1px solid #e2e8f0;
  }
  .btn-secondary:hover { background: #f8fafc; border-color: #cbd5e1; }

  /* KPI Grid */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }
  @media (max-width: 1200px) {
    .kpi-grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 768px) {
    .kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  }
  
  .kpi-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 18px 20px;
    position: relative;
    overflow: hidden;
    transition: transform .18s, box-shadow .18s;
  }
  .kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,.09);
  }
  .kpi-hero {
    background: linear-gradient(135deg, var(--accent)18, var(--accent)0a);
    border-color: var(--accent)30;
  }
  .kpi-hero-glow {
    position: absolute;
    top: -30px;
    right: -30px;
    width: 90px;
    height: 90px;
    border-radius: 50%;
    background: var(--accent)10;
  }
  .kpi-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .kpi-icon {
    font-size: 16px;
    background: #f8fafc;
    padding: 5px 6px;
    border-radius: 7px;
  }
  .kpi-hero .kpi-icon {
    background: var(--accent)15;
  }
  .kpi-value {
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -1px;
    margin-bottom: 3px;
  }
  .kpi-label {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .kpi-change {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 12px;
  }
  .kpi-change.positive {
    color: #16a34a;
    background: #f0fdf4;
  }
  .kpi-change.negative {
    color: #dc2626;
    background: #fef2f2;
  }

  /* KPI Finance */
  .kpi-finance {
    background: linear-gradient(135deg, #f0fdf4, #dcfce7);
    border-color: #bbf7d0;
  }
  .kpi-finance-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }
  .kpi-finance-header > span:first-child {
    font-size: 20px;
  }
  .kpi-finance-value {
    font-size: 20px;
    font-weight: 800;
    color: #10b981;
    letter-spacing: -0.5px;
  }
  .kpi-finance-label {
    font-size: 11px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .kpi-finance-detail {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 11px;
  }
  .text-success { color: #10b981; font-weight: 600; }
  .text-warning { color: #d97706; font-weight: 600; }
  .kpi-finance-progress {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .kpi-finance-progress > span {
    font-size: 10px;
    color: #94a3b8;
    font-weight: 600;
    white-space: nowrap;
  }

  /* Main Grid */
  .main-grid {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 20px;
    margin-bottom: 20px;
  }
  @media (max-width: 1024px) {
    .main-grid { grid-template-columns: 1fr; }
  }

  /* Cards */
  .card {
    background: #fff;
    border-radius: 14px;
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
    padding: 16px 18px 14px;
    border-bottom: 1px solid #f1f5f9;
  }
  .card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
  }
  .title-bar {
    width: 3px;
    height: 18px;
    border-radius: 2px;
  }
  .badge {
    font-size: 11px;
    color: #94a3b8;
    background: #f1f5f9;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 600;
  }
  .link-btn {
    font-size: 11px;
    color: #6366f1;
    text-decoration: none;
    font-weight: 700;
    background: rgba(99,102,241,.07);
    padding: 5px 11px;
    border-radius: 7px;
    border: 1px solid rgba(99,102,241,.18);
    transition: all .18s;
  }
  .link-btn:hover {
    background: rgba(99,102,241,.13);
  }
  .card-body {
    padding: 0 18px 18px;
  }

  /* Table */
  .table-wrapper {
    overflow-x: auto;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  .data-table thead tr {
    background: #f8fafc;
  }
  .data-table th {
    padding: 10px 14px;
    text-align: left;
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
    letter-spacing: 1px;
    text-transform: uppercase;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
  }
  .data-table td {
    padding: 11px 14px;
    border-bottom: 1px solid #f1f5f9;
    white-space: nowrap;
  }
  .table-row-hover {
    transition: background .12s;
  }
  .table-row-hover:hover {
    background: #fafbff !important;
  }
  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 800;
    color: #fff;
  }
  .cell-name {
    font-weight: 600;
    color: #0f172a;
    font-size: 13px;
  }
  .cell-email {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 1px;
  }
  .cell-service {
    color: #64748b;
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 10px;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 6px;
  }
  .status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }
  .folio-link {
    font-family: monospace;
    font-size: 11px;
    color: #6366f1;
    background: rgba(99,102,241,.08);
    border: 1px solid rgba(99,102,241,.2);
    padding: 3px 8px;
    border-radius: 5px;
    text-decoration: none;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  .cell-date {
    color: #94a3b8;
    font-size: 11px;
    font-family: monospace;
  }
  .text-muted {
    color: #94a3b8;
  }

  /* Sidebar */
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  /* Pipeline */
  .pipeline-list {
    padding: 0 18px 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .pipeline-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .pipeline-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .pipeline-label {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 600;
    color: #374151;
  }
  .pipeline-count {
    font-size: 12px;
    font-weight: 700;
    color: #6b7280;
    font-family: monospace;
  }
  .progress-bar {
    height: 5px;
    background: #f1f5f9;
    border-radius: 99px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.5s ease;
    min-width: 4px;
  }

  /* Actions */
  .actions-list {
    padding: 0 18px 18px;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .action-link {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 9px 11px;
    border-radius: 8px;
    background: var(--accent)07;
    border: 1px solid var(--accent)12;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
    text-decoration: none;
    transition: opacity .15s, transform .15s;
  }
  .action-link:hover {
    opacity: 0.82;
    transform: translateX(2px);
  }

  /* Bottom Grid */
  .bottom-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
  }
  @media (max-width: 1024px) {
    .bottom-grid { grid-template-columns: 1fr; }
  }

  /* Search Form */
  .search-form {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
  .search-input {
    flex: 1;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 12px;
    color: #0f172a;
    background: #f8fafc;
    outline: none;
    font-family: monospace;
    letter-spacing: 0.5px;
  }
  .search-btn {
    background: #6366f1;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0 14px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  /* Templates */
  .templates-section {
    border-top: 1px solid #f1f5f9;
    margin-top: 16px;
    padding-top: 14px;
  }
  .templates-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    align-items: center;
  }
  .templates-header span {
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
  }
  .templates-header a {
    font-size: 11px;
    color: #6366f1;
    text-decoration: none;
    font-weight: 600;
  }
  .template-link {
    display: block;
    padding: 9px 11px;
    border-radius: 7px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    text-decoration: none;
    margin-bottom: 6px;
    transition: background .15s;
  }
  .template-link:hover {
    background: #f1f5f9;
  }
  .template-link div:first-child {
    font-weight: 600;
    font-size: 12px;
    color: #0f172a;
  }
  .template-date {
    font-size: 10px;
    color: #94a3b8;
    margin-top: 2px;
    font-family: monospace;
  }

  /* Empty State */
  .empty-state {
    padding: 48px 24px;
    text-align: center;
    color: #94a3b8;
    font-size: 14px;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .dashboard-header {
      flex-direction: column;
      gap: 12px;
    }
    .header-actions {
      width: 100%;
    }
    .header-actions a, .header-actions button {
      flex: 1;
      justify-content: center;
    }
    .kpi-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .kpi-value {
      font-size: 22px;
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
      padding: 8px 10px;
    }
    .cell-service, .cell-email {
      max-width: 100px;
    }
  }
`