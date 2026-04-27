'use client'

import { useEffect, useState } from 'react'

type PhData = { ok: boolean; pageviews: number; daily: { label: string; value: number }[] }
type SentryData = { ok: boolean; unresolvedCount: number; issues: { id: string; title: string; level: string; count: string }[] }

export function PostHogWidget() {
  const [data, setData]       = useState<PhData | null>(null)
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/posthog-stats')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const maxVal = data ? Math.max(...data.daily.map(d => d.value), 1) : 1

  return (
    <div className="crm-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px 14px', background: 'linear-gradient(135deg, #fff7ed, #fef3c7)', borderBottom: '1px solid #fed7aa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 18, background: 'rgba(249,115,22,.12)', borderRadius: 8, padding: '5px 7px' }}>🦔</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e' }}>PostHog Analytics</div>
            <div style={{ fontSize: 10, color: '#b45309', fontFamily: 'monospace', letterSpacing: 1 }}>ÚLTIMOS 7 DÍAS</div>
          </div>
        </div>
      </div>
      <div style={{ padding: '18px' }}>
        {loading ? (
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>Conectando…</div>
        ) : error || !data?.ok ? (
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, lineHeight: 1.5 }}>
            {error?.includes('missing_env') ? 'Variables POSTHOG_PERSONAL_API_KEY y POSTHOG_PROJECT_ID no detectadas.'
              : error?.includes('401') || error?.includes('403') ? '⚠️ API Key inválida — verifica POSTHOG_PERSONAL_API_KEY.'
              : `Error conectando: ${error ?? 'desconocido'}`}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#0f172a', letterSpacing: '-1px', marginBottom: 2 }}>
              {data.pageviews.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>Pageviews totales</div>
            {data.daily.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36, marginBottom: 10 }}>
                {data.daily.map((d, i) => (
                  <div key={i} title={`${d.label}: ${d.value}`} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ width: '100%', height: `${Math.max((d.value / maxVal) * 100, 4)}%`, background: i === data.daily.length - 1 ? '#f97316' : '#fed7aa', borderRadius: '3px 3px 0 0' }} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <a href="https://app.posthog.com" target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#d97706', textDecoration: 'none' }}>
          Ver dashboard completo →
        </a>
      </div>
    </div>
  )
}

export function SentryWidget() {
  const [data, setData]       = useState<SentryData | null>(null)
  const [error, setError]     = useState<string | null>(null)
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
    <div className="crm-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px 14px', background: 'linear-gradient(135deg, #faf5ff, #ede9fe)', borderBottom: '1px solid #ddd6fe' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 18, background: 'rgba(124,58,237,.1)', borderRadius: 8, padding: '5px 7px' }}>🛡️</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#5b21b6' }}>Sentry Monitoring</div>
            <div style={{ fontSize: 10, color: '#7c3aed', fontFamily: 'monospace', letterSpacing: 1 }}>ISSUES SIN RESOLVER</div>
          </div>
        </div>
      </div>
      <div style={{ padding: '18px' }}>
        {loading ? (
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 14 }}>Conectando…</div>
        ) : error || !data?.ok ? (
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, lineHeight: 1.5 }}>
            {error?.includes('missing_env') ? 'Variables SENTRY_AUTH_TOKEN, SENTRY_ORG y SENTRY_PROJECT no detectadas.'
              : error?.includes('401') || error?.includes('403') ? '⚠️ Token inválido — verifica SENTRY_AUTH_TOKEN.'
              : `Error conectando: ${error ?? 'desconocido'}`}
          </div>
        ) : (
          <>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px', marginBottom: 2, color: data.unresolvedCount > 0 ? '#dc2626' : '#16a34a' }}>
              {data.unresolvedCount}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: data.issues.length > 0 ? 10 : 14 }}>
              {data.unresolvedCount === 0 ? '✓ Sin errores activos' : `error${data.unresolvedCount !== 1 ? 'es' : ''} sin resolver`}
            </div>
            {data.issues.slice(0, 4).map(i => (
              <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#475569', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '5px 9px', borderRadius: 6, marginBottom: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: levelColor(i.level), flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontFamily: 'monospace', fontSize: 10 }}>{i.title}</span>
                {i.count && <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', flexShrink: 0 }}>×{i.count}</span>}
              </div>
            ))}
          </>
        )}
        <a href="https://sentry.io" target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#7c3aed', textDecoration: 'none', marginTop: 6 }}>
          Ver en Sentry →
        </a>
      </div>
    </div>
  )
}
