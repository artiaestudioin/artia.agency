import { createClient } from '@/lib/supabase/server'
import NuevoLeadModal from './NuevoLeadModal'
import Link from 'next/link'

export const metadata = { title: 'Leads — Artia Admin' }

const ESTADO_CFG: Record<string, { label: string; color: string; bg: string }> = {
  nuevo:      { label: 'Nuevo',      color: '#3b82f6', bg: '#eff6ff' },
  contactado: { label: 'Contactado', color: '#f59e0b', bg: '#fefce8' },
  en_proceso: { label: 'En proceso', color: '#8b5cf6', bg: '#f5f3ff' },
  cerrado:    { label: 'Cerrado',    color: '#10b981', bg: '#f0fdf4' },
  perdido:    { label: 'Perdido',    color: '#ef4444', bg: '#fef2f2' },
}

function initials(n: string) {
  return n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function avatarColor(n: string) {
  const p = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444']
  let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % p.length
  return p[h]
}
function relTime(d: string) {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>
}) {
  const { q, estado } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('leads')
    .select('id, folio, nombre, email, telefono, servicio, estado, payment_status, estimated_value, created_at')
    .order('created_at', { ascending: false })

  if (estado && estado !== 'todos') query = query.eq('estado', estado)

  const { data: allLeads } = await query
  const leads = (allLeads ?? []).filter(l => {
    if (!q) return true
    const term = q.toLowerCase()
    return (
      l.nombre?.toLowerCase().includes(term) ||
      l.email?.toLowerCase().includes(term) ||
      l.folio?.toLowerCase().includes(term) ||
      l.servicio?.toLowerCase().includes(term)
    )
  })

  // Conteos por estado
  const { data: allForCount } = await supabase.from('leads').select('estado')
  const counts = (allForCount ?? []).reduce((acc: Record<string, number>, l) => {
    acc[l.estado ?? 'nuevo'] = (acc[l.estado ?? 'nuevo'] ?? 0) + 1
    return acc
  }, {})
  const total = allForCount?.length ?? 0

  return (
    <div style={{ maxWidth: 1100 }}>
      <style>{`
        .lead-row:hover { background: #f8fafc !important; }
        .filter-btn:hover { opacity: 0.85; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#00113a', margin: 0 }}>Leads</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0' }}>{total} leads en total</p>
        </div>
        <NuevoLeadModal />
      </div>

      {/* Filtros por estado */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {[
          { key: 'todos', label: 'Todos', count: total },
          ...Object.entries(ESTADO_CFG).map(([k, v]) => ({ key: k, label: v.label, count: counts[k] ?? 0 })),
        ].map(f => {
          const isActive = (estado ?? 'todos') === f.key
          const cfg = ESTADO_CFG[f.key]
          return (
            <a
              key={f.key}
              href={f.key === 'todos' ? '/admin/leads' : `/admin/leads?estado=${f.key}${q ? `&q=${q}` : ''}`}
              className="filter-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                textDecoration: 'none',
                background: isActive ? (cfg?.color ?? '#00113a') : '#fff',
                color: isActive ? '#fff' : '#475569',
                border: `0.5px solid ${isActive ? (cfg?.color ?? '#00113a') : '#e2e8f0'}`,
                transition: 'all 0.15s',
              }}
            >
              {f.label}
              <span style={{
                background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                color: isActive ? '#fff' : '#64748b',
                borderRadius: 10, padding: '0 6px', fontSize: 10, fontWeight: 800,
              }}>
                {f.count}
              </span>
            </a>
          )
        })}
      </div>

      {/* Buscador */}
      <form method="GET" action="/admin/leads" style={{ marginBottom: 20 }}>
        {estado && <input type="hidden" name="estado" value={estado} />}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre, email, folio o servicio…"
            style={{
              flex: 1, padding: '10px 14px', border: '0.5px solid #e2e8f0', borderRadius: 8,
              fontSize: 13, outline: 'none', background: '#fff', maxWidth: 400,
            }}
          />
          <button type="submit" style={{ background: '#00113a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Buscar
          </button>
          {(q || estado) && (
            <a href="/admin/leads" style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              Limpiar ×
            </a>
          )}
        </div>
      </form>

      {/* Tabla */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
        {leads.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No se encontraron leads</div>
            {(q || estado) && (
              <a href="/admin/leads" style={{ display: 'inline-block', marginTop: 12, color: '#2552ca', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
                Ver todos los leads →
              </a>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '0.5px solid #e2e8f0' }}>
                {['Cliente', 'Servicio', 'Estado', 'Valor', 'Pago', 'Hace'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => {
                const cfg = ESTADO_CFG[lead.estado ?? 'nuevo'] ?? ESTADO_CFG['nuevo']
                return (
                  <tr key={lead.id} className="lead-row" style={{ borderBottom: i < leads.length - 1 ? '0.5px solid #f1f5f9' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/admin/cliente/${lead.folio ?? lead.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: avatarColor(lead.nombre), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                          {initials(lead.nombre)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                            {lead.nombre}
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>
                            {lead.folio ?? lead.email ?? '—'}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: 180 }}>
                      <div style={{ fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lead.servicio ?? '—'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color, padding: '3px 10px', borderRadius: 20 }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {lead.estimated_value ? (
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>
                          ${lead.estimated_value.toLocaleString('es-EC')}
                        </span>
                      ) : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                        background: lead.payment_status === 'pagado' ? '#f0fdf4' : lead.payment_status === 'parcial' ? '#fff7ed' : '#fef9ec',
                        color: lead.payment_status === 'pagado' ? '#10b981' : lead.payment_status === 'parcial' ? '#f97316' : '#d97706',
                      }}>
                        {(lead.payment_status ?? 'pendiente').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {relTime(lead.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}