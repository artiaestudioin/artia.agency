'use client'

import { useEffect, useState } from 'react'

type PhData = {
  ok: boolean
  pageviews: number
  daily: { label: string; value: number }[]
  dashboards: { id: number; name: string; description?: string }[]
  insights: { id: number; name: string; type: string }[]
  activity: { user: string; action: string; created_at: string }[]
  project: { name: string; event_count: number; user_count: number } | null
}

type SentryData = {
  ok: boolean
  unresolvedCount: number
  issues: { id: string; title: string; level: string; count: string; lastSeen?: string }[]
  events24h: number
  platform: string
  alerts: { id: string; name: string; active: boolean }[]
}

export function PostHogWidget() {
  const [data, setData] = useState<PhData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'dashboards' | 'activity'>('overview')

  useEffect(() => {
    fetch('/api/admin/posthog-stats')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const maxVal = data ? Math.max(...data.daily.map(d => d.value), 1) : 1

  return (
    <div className="analytics-card">
      <div className="analytics-header" style={{ background: 'linear-gradient(135deg, #fff7ed, #fef3c7)', borderColor: '#fed7aa' }}>
        <div className="analytics-icon" style={{ background: 'rgba(249,115,22,.12)' }}>🦔</div>
        <div>
          <div className="analytics-title" style={{ color: '#92400e' }}>PostHog Analytics</div>
          <div className="analytics-subtitle" style={{ color: '#b45309' }}>ÚLTIMOS 7 DÍAS</div>
        </div>
      </div>

      {!loading && !error && data?.ok && (
        <div className="analytics-tabs">
          {[
            { key: 'overview', label: 'Vista general' },
            { key: 'dashboards', label: 'Dashboards' },
            { key: 'activity', label: 'Actividad' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={tab === t.key ? 'active' : ''}
              style={{ color: tab === t.key ? '#92400e' : '#94a3b8', borderColor: tab === t.key ? '#f97316' : 'transparent' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="analytics-body">
        {loading ? (
          <div className="analytics-loading">Conectando…</div>
        ) : error || !data?.ok ? (
          <div className="analytics-error">
            {error?.includes('missing_env') ? 'Variables POSTHOG_PERSONAL_API_KEY y POSTHOG_PROJECT_ID no detectadas.'
              : error?.includes('401') || error?.includes('403') ? '⚠️ API Key inválida.'
              : `Error conectando: ${error ?? 'desconocido'}`}
          </div>
        ) : (
          <>
            {tab === 'overview' && (
              <>
                <div className="analytics-metrics">
                  <div>
                    <div className="metric-value">{data.pageviews.toLocaleString()}</div>
                    <div className="metric-label">Pageviews</div>
                  </div>
                  <div>
                    <div className="metric-value">{data.project?.user_count?.toLocaleString() ?? '—'}</div>
                    <div className="metric-label">Usuarios</div>
                  </div>
                  <div>
                    <div className="metric-value">{data.project?.event_count?.toLocaleString() ?? '—'}</div>
                    <div className="metric-label">Eventos totales</div>
                  </div>
                </div>

                {data.daily.length > 0 && (
                  <div className="chart-bars">
                    {data.daily.map((d, i) => (
                      <div key={i} title={`${d.label}: ${d.value}`} className="chart-bar-wrapper">
                        <div className="chart-bar" style={{ height: `${Math.max((d.value / maxVal) * 100, 4)}%`, background: i === data.daily.length - 1 ? '#f97316' : '#fed7aa' }} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === 'dashboards' && (
              <div className="analytics-list">
                {data.dashboards.length > 0 ? data.dashboards.map(d => (
                  <a key={d.id} href={`https://app.posthog.com/dashboard/${d.id}`} target="_blank" rel="noopener noreferrer" className="analytics-link" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
                    <div style={{ fontWeight: 700, color: '#92400e' }}>{d.name}</div>
                    {d.description && <div style={{ fontSize: 10, color: '#b45309', marginTop: 2 }}>{d.description}</div>}
                  </a>
                )) : <div className="text-muted">No hay dashboards configurados</div>}
                
                {data.insights.length > 0 && (
                  <>
                    <div className="section-title">Insights</div>
                    {data.insights.map(i => (
                      <div key={i.id} className="list-item">
                        <span className="item-name">{i.name}</span>
                        <span className="item-meta">{i.type}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {tab === 'activity' && (
              <div className="analytics-list">
                {data.activity.length > 0 ? data.activity.map((a, i) => (
                  <div key={i} className="activity-item">
                    <div className="activity-dot" style={{ background: '#f97316' }} />
                    <div className="activity-content">
                      <span className="item-name">{a.user}</span>
                      <span className="text-muted"> {a.action}</span>
                    </div>
                    <span className="activity-date">
                      {new Date(a.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                )) : <div className="text-muted">Sin actividad reciente</div>}
              </div>
            )}
          </>
        )}
        <a href="https://app.posthog.com" target="_blank" rel="noopener noreferrer" className="analytics-footer" style={{ color: '#d97706' }}>
          Ver dashboard completo →
        </a>
      </div>

      <style>{`
        .analytics-card {
          background: #fff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.03);
          overflow: hidden;
          transition: box-shadow .2s;
        }
        .analytics-card:hover {
          box-shadow: 0 2px 6px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.05);
        }
        .analytics-header {
          padding: 16px 18px 14px;
          border-bottom: 1px solid;
          display: flex;
          align-items: center;
          gap: 10;
        }
        .analytics-icon {
          font-size: 18px;
          border-radius: 8px;
          padding: 5px 7px;
        }
        .analytics-title {
          font-weight: 700;
          font-size: 13px;
        }
        .analytics-subtitle {
          font-size: 10px;
          font-family: monospace;
          letter-spacing: 1px;
        }
        .analytics-tabs {
          display: flex;
          border-bottom: 1px solid #f1f5f9;
          background: #fff;
        }
        .analytics-tabs button {
          flex: 1;
          padding: 10px;
          font-size: 11px;
          font-weight: 700;
          border: none;
          background: transparent;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all .15s;
        }
        .analytics-tabs button.active {
          background: #fff;
        }
        .analytics-body {
          padding: 18px;
        }
        .analytics-loading {
          font-size: 13px;
          color: #94a3b8;
          margin-bottom: 14px;
        }
        .analytics-error {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 8px;
          line-height: 1.5;
        }
        .analytics-metrics {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        @media (max-width: 768px) {
          .analytics-metrics { grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
        }
        .metric-value {
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -1px;
        }
        @media (max-width: 768px) {
          .metric-value { font-size: 18px; }
        }
        .metric-label {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .chart-bars {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 36px;
          margin-bottom: 10px;
        }
        .chart-bar-wrapper {
          flex: 1;
          height: 100%;
          display: flex;
          align-items: flex-end;
        }
        .chart-bar {
          width: 100%;
          border-radius: 3px 3px 0 0;
          transition: height 0.3s;
        }
        .analytics-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .analytics-link {
          display: block;
          padding: 10px 12px;
          border-radius: 8px;
          text-decoration: none;
          border: 1px solid;
        }
        .section-title {
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-top: 8px;
          margin-bottom: 4px;
        }
        .list-item {
          font-size: 11px;
          color: #64748b;
          padding: 6px 0;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
        }
        .item-name {
          font-weight: 600;
          color: #0f172a;
        }
        .item-meta {
          font-size: 9px;
          color: #94a3b8;
          margin-left: 6px;
        }
        .activity-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          padding: 6px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .activity-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .activity-content {
          flex: 1;
        }
        .activity-date {
          font-size: 9px;
          color: #94a3b8;
          font-family: monospace;
        }
        .text-muted {
          color: #94a3b8;
        }
        .analytics-footer {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          margin-top: 12px;
        }
      `}</style>
    </div>
  )
}

export function SentryWidget() {
  const [data, setData] = useState<SentryData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/sentry-stats')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const levelColor = (l: string) => l === 'fatal' ? '#dc2626' : l === 'error' ? '#ea580c' : l === 'warning' ? '#d97706' : '#64748b'

  return (
    <div className="analytics-card">
      <div className="analytics-header" style={{ background: 'linear-gradient(135deg, #faf5ff, #ede9fe)', borderColor: '#ddd6fe' }}>
        <div className="analytics-icon" style={{ background: 'rgba(124,58,237,.1)' }}>🛡️</div>
        <div>
          <div className="analytics-title" style={{ color: '#5b21b6' }}>Sentry Monitoring</div>
          <div className="analytics-subtitle" style={{ color: '#7c3aed' }}>ISSUES SIN RESOLVER</div>
        </div>
      </div>
      <div className="analytics-body">
        {loading ? (
          <div className="analytics-loading">Conectando…</div>
        ) : error || !data?.ok ? (
          <div className="analytics-error">
            {error?.includes('missing_env') ? 'Variables SENTRY_AUTH_TOKEN, SENTRY_ORG y SENTRY_PROJECT no detectadas.'
              : error?.includes('401') || error?.includes('403') ? '⚠️ Token inválido.'
              : `Error conectando: ${error ?? 'desconocido'}`}
          </div>
        ) : (
          <>
            <div className="analytics-metrics">
              <div>
                <div className="metric-value" style={{ color: data.unresolvedCount > 0 ? '#dc2626' : '#16a34a' }}>
                  {data.unresolvedCount}
                </div>
                <div className="metric-label">Issues</div>
              </div>
              <div>
                <div className="metric-value">{data.events24h.toLocaleString()}</div>
                <div className="metric-label">Eventos 24h</div>
              </div>
              <div>
                <div className="metric-value">{data.platform}</div>
                <div className="metric-label">Plataforma</div>
              </div>
            </div>

            {data.alerts.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div className="section-title">Alertas activas</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {data.alerts.map(a => (
                    <span key={a.id} style={{
                      fontSize: 10, padding: '3px 10px', borderRadius: 20,
                      background: a.active ? '#f0fdf4' : '#f1f5f9',
                      color: a.active ? '#16a34a' : '#94a3b8',
                      fontWeight: 700, border: `0.5px solid ${a.active ? '#bbf7d0' : '#e2e8f0'}`
                    }}>
                      {a.active ? '●' : '○'} {a.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.issues.slice(0, 4).map(i => (
              <div key={i.id} style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
                color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0',
                padding: '5px 9px', borderRadius: 6, marginBottom: 5
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: levelColor(i.level), flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontFamily: 'monospace', fontSize: 10 }}>
                  {i.title}
                </span>
                {i.count && <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>×{i.count}</span>}
              </div>
            ))}
          </>
        )}
        <a href="https://sentry.io" target="_blank" rel="noopener noreferrer" className="analytics-footer" style={{ color: '#7c3aed' }}>
          Ver en Sentry →
        </a>
      </div>
    </div>
  )
}