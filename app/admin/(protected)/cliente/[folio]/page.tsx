import { createClient } from '@/lib/supabase/server'
import ClienteActions from './ClienteActions'
import SeguimientoClient from './SeguimientoClient'

export default async function AdminClienteFolioPage({
  params,
}: {
  params: { folio: string }
}) {
  const supabase = await createClient()
  const folio = params.folio

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
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Título */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
          Folio: <span style={{ color: '#2563eb' }}>{folio}</span>
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          {lead.nombre}{lead.email ? ` · ${lead.email}` : ''}
        </p>
      </div>

      {/* Layout: admin izquierda, preview derecha */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 28, alignItems: 'start' }}>
        {/* Panel admin */}
        <div>
          <ClienteActions
            folio={folio}
            estadoActual={lead.estado ?? 'nuevo'}
            tieneEmail={!!lead.email}
            notasActuales={lead.notas_internas ?? ''}
          />
        </div>

        {/* Preview cliente */}
        <div style={{ position: 'sticky', top: 24 }}>
          <p style={{
            fontSize: 10, fontWeight: 700, color: '#94a3b8',
            letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 12,
          }}>
            Vista del cliente
          </p>
          <div style={{ transform: 'scale(0.88)', transformOrigin: 'top center', marginBottom: -60 }}>
            <SeguimientoClient lead={lead} folio={folio} />
          </div>
        </div>
      </div>
    </div>
  )
}
