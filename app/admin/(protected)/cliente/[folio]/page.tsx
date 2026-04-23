import { createClient } from '@/lib/supabase/server'
import ClienteActions from './ClienteActions'
import SeguimientoClient from './SeguimientoClient'

export default async function AdminClienteFolioPage({
  params,
}: {
  params: Promise<{ folio: string }>          // ← Next.js 15: params es Promise
}) {
  const { folio } = await params              // ← Debe ser awaited
  const supabase  = await createClient()

  const { data: lead } = await supabase
    .from('leads')
    .select('id, folio, nombre, email, servicio, mensaje, estado, notas_internas, created_at')
    .eq('folio', folio)
    .single()

  if (!lead) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 15, color: '#64748b' }}>
          No se encontró ningún lead con el folio <strong>{folio}</strong>.
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, color: '#6366f1', background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.2)', padding: '2px 10px', borderRadius: 6 }}>
              FOLIO
            </span>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.5px' }}>
              {folio}
            </h1>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            {lead.nombre}{lead.email ? ` · ${lead.email}` : ''}
          </p>
        </div>
        <a
          href={`/seguimiento/${folio}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600, color: '#6366f1',
            background: 'rgba(99,102,241,.07)', border: '1px solid rgba(99,102,241,.2)',
            padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15,3 21,3 21,9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Ver como cliente
        </a>
      </div>

      {/* Layout: panel admin + preview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 28, alignItems: 'start' }}>

        {/* Panel de control */}
        <div>
          <ClienteActions
            folio={folio}
            estadoActual={lead.estado ?? 'nuevo'}
            tieneEmail={!!lead.email}
            notasActuales={lead.notas_internas ?? ''}
          />
        </div>

        {/* Preview — vista cliente */}
        <div style={{ position: 'sticky', top: 24 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, color: '#94a3b8',
            letterSpacing: '3px', textTransform: 'uppercase', marginBottom: 10,
          }}>
            Vista del cliente
          </p>
          <div style={{
            borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.06)',
            transform: 'scale(0.82)',
            transformOrigin: 'top center',
            marginBottom: -100,
          }}>
            <SeguimientoClient lead={lead} folio={folio} />
          </div>
        </div>

      </div>
    </div>
  )
}
