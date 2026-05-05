import { createClient } from '@/lib/supabase/server'
import { ESTADO_CONFIG } from '@/lib/config/estado'
import NuevoLeadModal from './NuevoLeadModal'
import Link from 'next/link'
import { Card, CardBody, Avatar, Badge, StatusBadge, EmptyState, COLORS, fmtMoney, relTime, GLOBAL_STYLES } from '@/components/DesignSystem'

export const metadata = { title: 'Leads — Artia Admin' }

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const { q, estado } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('leads')
    .select('id, folio, nombre, email, telefono, servicio, estado, payment_status, estimated_value, created_at, notes')
    .order('created_at', { ascending: false })
  if (estado && estado !== 'todos') query = query.eq('estado', estado)

  const { data: allLeads } = await query
  const leads = (allLeads ?? []).filter(l => {
    if (!q) return true
    const term = q.toLowerCase()
    return l.nombre?.toLowerCase().includes(term) || l.email?.toLowerCase().includes(term) || l.folio?.toLowerCase().includes(term) || l.servicio?.toLowerCase().includes(term)
  })

  const { data: allForCount } = await supabase.from('leads').select('estado')
  const counts = (allForCount ?? []).reduce((acc: Record<string, number>, l) => {
    acc[l.estado ?? 'nuevo'] = (acc[l.estado ?? 'nuevo'] ?? 0) + 1
    return acc
  }, {})
  const total = allForCount?.length ?? 0

  const filterOptions = [
    { key: 'todos', label: 'Todos', count: total },
    ...Object.entries(ESTADO_CONFIG).map(([k, v]) => ({ key: k, label: v.label, count: counts[k] ?? 0 })),
  ]

  const activeEstado = estado ?? 'todos'

  return (
    <div style={{ maxWidth: 1100 }}>
      <style>{GLOBAL_STYLES}</style>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: COLORS.primary, margin: '0 0 4px' }}>Leads</h1>
          <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>{total} leads en total</p>
        </div>
        <NuevoLeadModal />
      </header>

      {/* Filter tabs — Links puros, sin onClick, compatibles con Server Component */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {filterOptions.map(opt => {
          const isActive = activeEstado === opt.key
          const href = opt.key === 'todos'
            ? (q ? `/admin/leads?q=${encodeURIComponent(q)}` : '/admin/leads')
            : (q ? `/admin/leads?estado=${opt.key}&q=${encodeURIComponent(q)}` : `/admin/leads?estado=${opt.key}`)
          return (
            <Link
              key={opt.key}
              href={href}
              style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
                background: isActive ? COLORS.primary : COLORS.bgHover,
                color: isActive ? '#fff' : COLORS.textSecondary,
                border: `1.5px solid ${isActive ? COLORS.primary : COLORS.borderLight}`,
                transition: 'all 0.15s',
              }}
            >
              {opt.label}
              <span style={{
                fontSize: 10, fontWeight: 800,
                background: isActive ? 'rgba(255,255,255,0.25)' : COLORS.borderLight,
                color: isActive ? '#fff' : COLORS.textMuted,
                borderRadius: 20, padding: '1px 7px',
              }}>
                {opt.count}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Search — form GET puro, sin onChange, compatible con Server Component */}
      <form method="GET" action="/admin/leads" style={{ marginBottom: 20 }}>
        {estado && <input type="hidden" name="estado" value={estado} />}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Buscar por nombre, email, folio o servicio…"
            style={{
              flex: 1, padding: '10px 16px',
              border: `1.5px solid ${COLORS.borderLight}`,
              borderRadius: 10, fontSize: 13,
              outline: 'none', background: '#fff',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            style={{
              background: COLORS.primary, color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 18px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Buscar
          </button>
          {(q || estado) && (
            <a
              href="/admin/leads"
              style={{
                background: COLORS.bgHover, color: COLORS.textSecondary,
                borderRadius: 10, padding: '10px 14px', fontSize: 12,
                fontWeight: 600, textDecoration: 'none',
                display: 'flex', alignItems: 'center',
              }}
            >
              Limpiar ×
            </a>
          )}
        </div>
      </form>

      {/* Table */}
      <Card>
        {leads.length === 0 ? (
          <EmptyState icon="🔍" title="No se encontraron leads" subtitle={q || estado ? 'Intenta con otros filtros' : undefined} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: COLORS.bgHover, borderBottom: `1px solid ${COLORS.borderLight}` }}>
                  {['Cliente', 'Servicio', 'Estado', 'Valor', 'Pago', 'Hace'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: COLORS.textMuted, whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr key={lead.id} className="artia-table-row" style={{ borderBottom: i < leads.length - 1 ? `1px solid ${COLORS.borderLight}` : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/admin/cliente/${lead.folio ?? lead.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                        <Avatar name={lead.nombre} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                            {lead.nombre}
                          </div>
                          <div style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace' }}>
                            {lead.folio ?? lead.email ?? '—'}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', maxWidth: 180 }}>
                      <div style={{ fontSize: 12, color: COLORS.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lead.servicio ?? '—'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <StatusBadge status={lead.estado ?? 'nuevo'} />
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {lead.estimated_value ? (
                        <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.success }}>
                          ${lead.estimated_value.toLocaleString('es-EC')}
                        </span>
                      ) : <span style={{ color: COLORS.textLight, fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <Badge variant={lead.payment_status === 'pagado' ? 'success' : lead.payment_status === 'parcial' ? 'warning' : 'default'}>
                        {(lead.payment_status ?? 'pendiente').toUpperCase()}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: COLORS.textMuted, whiteSpace: 'nowrap' }}>
                      {relTime(lead.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}