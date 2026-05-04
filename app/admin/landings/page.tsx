// app/admin/landings/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LandingStats } from '@/types/landing'
import { Card, CardBody, Badge, EmptyState, COLORS, fmtMoney, relTime } from '@/components/DesignSystem'

export const metadata = { title: 'Landing Pages — Artia Admin' }

export default async function LandingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status, q } = await searchParams
  const supabase = await createClient()

  // Get stats from view
  let query = supabase.from('landing_stats').select('*').order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: landings } = await query

  // Filter by search
  const filtered = (landings || []).filter((l: LandingStats) => {
    if (!q) return true
    const term = q.toLowerCase()
    return l.name?.toLowerCase().includes(term) || l.slug?.toLowerCase().includes(term)
  })

  // Counts
  const counts = {
    all: landings?.length || 0,
    active: landings?.filter((l: LandingStats) => l.status === 'active').length || 0,
    draft: landings?.filter((l: LandingStats) => l.status === 'draft').length || 0,
    paused: landings?.filter((l: LandingStats) => l.status === 'paused').length || 0,
    archived: landings?.filter((l: LandingStats) => l.status === 'archived').length || 0,
  }

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    active: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
    draft: { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },
    paused: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
    archived: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      <style>{GLOBAL_STYLES}</style>

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: COLORS.primary, margin: '0 0 4px' }}>Landing Pages</h1>
          <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>
            {counts.all} landings · {counts.active} activas · ${filtered.reduce((s: number, l: LandingStats) => s + (l.revenue_total || 0), 0).toFixed(2)} revenue
          </p>
        </div>
        <Link href="/admin/landings/nuevo"
          style={{
            background: COLORS.primary, color: '#fff', textDecoration: 'none',
            padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
          + Nueva Landing
        </Link>
      </header>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'all', label: 'Todas', count: counts.all },
          { key: 'active', label: 'Activas', count: counts.active },
          { key: 'draft', label: 'Borradores', count: counts.draft },
          { key: 'paused', label: 'Pausadas', count: counts.paused },
          { key: 'archived', label: 'Archivadas', count: counts.archived },
        ].map(opt => {
          const isActive = (status || 'all') === opt.key
          const href = opt.key === 'all'
            ? (q ? `/admin/landings?q=${encodeURIComponent(q)}` : '/admin/landings')
            : (q ? `/admin/landings?status=${opt.key}&q=${encodeURIComponent(q)}` : `/admin/landings?status=${opt.key}`)
          return (
            <Link key={opt.key} href={href}
              style={{
                padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
                background: isActive ? COLORS.primary : COLORS.bgHover,
                color: isActive ? '#fff' : COLORS.textSecondary,
                border: `1.5px solid ${isActive ? COLORS.primary : COLORS.borderLight}`,
                transition: 'all 0.15s',
              }}>
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

      {/* Search */}
      <form method="GET" action="/admin/landings" style={{ marginBottom: 20 }}>
        {status && <input type="hidden" name="status" value={status} />}
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="text" name="q" defaultValue={q ?? ''}
            placeholder="Buscar por nombre o slug..."
            style={{
              flex: 1, padding: '10px 16px',
              border: `1.5px solid ${COLORS.borderLight}`,
              borderRadius: 10, fontSize: 13, outline: 'none', background: '#fff',
            }} />
          <button type="submit"
            style={{
              background: COLORS.primary, color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
            Buscar
          </button>
          {(q || status) && (
            <a href="/admin/landings"
              style={{
                background: COLORS.bgHover, color: COLORS.textSecondary,
                borderRadius: 10, padding: '10px 14px', fontSize: 12,
                fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center',
              }}>
              Limpiar ×
            </a>
          )}
        </div>
      </form>

      {/* Landings Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {filtered.length === 0 ? (
          <EmptyState icon="🎯" title="No se encontraron landings" subtitle={q ? 'Intenta con otros términos' : 'Crea tu primera landing page'} />
        ) : (
          filtered.map((landing: LandingStats) => {
            const sc = statusColors[landing.status] || statusColors.draft
            return (
              <div key={landing.id}
                style={{
                  background: '#fff', borderRadius: 14, border: '0.5px solid #e2e8f0',
                  overflow: 'hidden', transition: 'all 0.2s',
                }}
                className="landing-card"
              >
                {/* Preview Image */}
                <div style={{ height: 160, background: 'linear-gradient(135deg, #667eea, #764ba2)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.6))',
                  }} />
                  <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16 }}>
                    <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                      {landing.name}
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, margin: '4px 0 0' }}>
                      /lp/{landing.slug}
                    </p>
                  </div>
                  <span style={{
                    position: 'absolute', top: 12, right: 12,
                    background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                    padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 800,
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    {landing.status}
                  </span>
                </div>

                {/* Stats */}
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{landing.views_count?.toLocaleString() || 0}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Views</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{landing.conversion_rate || 0}%</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Conv. Rate</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>${landing.revenue_total?.toFixed(0) || 0}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Revenue</div>
                    </div>
                  </div>

                  {/* Mini progress */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                      <span>Progreso funnel</span>
                      <span>{landing.clicks_count || 0} clicks · {landing.conversions_count || 0} conversiones</span>
                    </div>
                    <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${Math.min((landing.conversions_count / Math.max(landing.views_count, 1)) * 100 * 20, 100)}%`,
                        background: 'linear-gradient(90deg, #667eea, #764ba2)', borderRadius: 3, transition: 'width 0.5s',
                      }} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Link href={`/lp/${landing.slug}`} target="_blank"
                      style={{
                        flex: 1, textAlign: 'center', padding: '8px 12px', borderRadius: 8,
                        background: '#eff6ff', color: '#2563eb', textDecoration: 'none',
                        fontSize: 12, fontWeight: 700, border: '0.5px solid #bfdbfe',
                      }}>
                      👁️ Ver
                    </Link>
                    {/* DESPUÉS (CORREGIDO): */}
<Link href={`/admin/landings/${landing.id}/editar`}
  style={{
    flex: 1, textAlign: 'center', padding: '8px 12px', borderRadius: 8,
    background: '#f8fafc', color: '#475569', textDecoration: 'none',
    fontSize: 12, fontWeight: 700, border: '0.5px solid #e2e8f0',
  }}>
  ✏️ Editar
</Link>
<Link href={`/admin/landings/${landing.id}/stats`}
  style={{
    flex: 1, textAlign: 'center', padding: '8px 12px', borderRadius: 8,
    background: '#f8fafc', color: '#475569', textDecoration: 'none',
    fontSize: 12, fontWeight: 700, border: '0.5px solid #e2e8f0',
  }}>
  📊 Stats
</Link>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <style>{`
        .landing-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.08);
        }
      `}</style>
    </div>
  )
}

const GLOBAL_STYLES = `
  .artia-table-row:hover { background: #f8fafc; }
`
