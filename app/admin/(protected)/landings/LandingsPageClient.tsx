'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LandingStats } from '@/types/landing'
import { COLORS } from '@/components/DesignSystem'

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  active:   { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  draft:    { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },
  paused:   { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  archived: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
}

export default function LandingsPageClient({
  landings: initialLandings,
  counts: initialCounts,
  status,
  q,
}: {
  landings: LandingStats[]
  counts: Record<string, number>
  status?: string
  q?: string
}) {
  const router = useRouter()
  const [landings, setLandings] = useState<LandingStats[]>(initialLandings)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const counts = {
    all: initialCounts.all,
    active: initialCounts.active,
    draft: initialCounts.draft,
    paused: initialCounts.paused,
    archived: initialCounts.archived,
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/landings/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setLandings(prev => prev.filter(l => l.id !== id))
        setConfirmId(null)
        router.refresh()
      } else {
        const err = await res.json()
        alert(`Error al eliminar: ${err.error || 'Error desconocido'}`)
      }
    } catch {
      alert('Error de conexión al eliminar la landing')
    } finally {
      setDeletingId(null)
    }
  }

  const totalRevenue = landings.reduce((s, l) => s + (l.revenue_total || 0), 0)

  return (
    <div style={{ maxWidth: 1200 }}>
      <style>{GLOBAL_STYLES}</style>

      {/* Delete Confirmation Modal */}
      {confirmId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: '28px 32px',
            maxWidth: 400, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
              ⚠️ Eliminar Landing Page
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 20px', lineHeight: 1.6 }}>
              Esta acción eliminará la landing y todas sus variantes relacionadas. Los pedidos existentes no serán afectados. <strong>Esta acción no se puede deshacer.</strong>
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmId(null)}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                  background: '#f8fafc', color: '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmId)}
                disabled={deletingId === confirmId}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: 'none',
                  background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 13,
                  cursor: deletingId === confirmId ? 'not-allowed' : 'pointer',
                  opacity: deletingId === confirmId ? 0.7 : 1,
                }}>
                {deletingId === confirmId ? '⏳ Eliminando...' : '🗑️ Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: COLORS.primary, margin: '0 0 4px' }}>Landing Pages</h1>
          <p style={{ fontSize: 13, color: COLORS.textMuted, margin: 0 }}>
            {counts.all} paginas · {counts.active} activas · ${totalRevenue.toFixed(2)} de ganancia
          </p>
        </div>
        <Link href="/admin/landings/nuevo"
          style={{
            background: COLORS.primary, color: '#fff', textDecoration: 'none',
            padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
          + Crear nueva pagina de ventas
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
        {landings.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#475569', marginBottom: 4 }}>No se encontraron páginas</div>
            <div style={{ fontSize: 13 }}>{q ? 'Intenta con otros términos' : 'Crea tu primera landing page'}</div>
          </div>
        ) : (
          landings.map((landing: LandingStats) => {
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
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Visitas</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{landing.conversion_rate || 0}%</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Conv. Rate</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: '#10b981' }}>${landing.revenue_total?.toFixed(0) || 0}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Ganancia</div>
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
                        height: '100%',
                        width: `${Math.min((landing.conversions_count / Math.max(landing.views_count, 1)) * 100 * 20, 100)}%`,
                        background: 'linear-gradient(90deg, #667eea, #764ba2)', borderRadius: 3,
                        transition: 'width 0.5s',
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
                      📊 Analitícas
                    </Link>
                    <button
                      onClick={() => setConfirmId(landing.id)}
                      style={{
                        padding: '8px 12px', borderRadius: 8,
                        background: '#fff5f5', color: '#dc2626',
                        fontSize: 12, fontWeight: 700, border: '0.5px solid #fecaca',
                        cursor: 'pointer',
                      }}>
                      🗑️
                    </button>
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