type SentryData = {
  ok: boolean
  unresolvedCount: number
  issues: { id: string; title: string; level: string; count: string; lastSeen?: string }[]
  events24h: number
  platform: string
  alerts: { id: string; name: string; active: boolean }[]
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-1px', color: data.unresolvedCount > 0 ? '#dc2626' : '#16a34a' }}>
                  {data.unresolvedCount}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Issues</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-1px', color: '#0f172a' }}>
                  {data.events24h.toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Eventos 24h</div>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-1px', color: '#0f172a' }}>
                  {data.platform}
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>Plataforma</div>
              </div>
            </div>

            {data.alerts.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>Alertas activas</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {data.alerts.map(a => (
                    <span key={a.id} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: a.active ? '#f0fdf4' : '#f1f5f9', color: a.active ? '#16a34a' : '#94a3b8', fontWeight: 700, border: `0.5px solid ${a.active ? '#bbf7d0' : '#e2e8f0'}` }}>
                      {a.active ? '●' : '○'} {a.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

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