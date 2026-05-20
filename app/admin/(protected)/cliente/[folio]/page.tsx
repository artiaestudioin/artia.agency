import { createClient } from '@/lib/supabase/server'
import Vista360Client from './Vista360Client'

export async function generateMetadata({ params }: { params: Promise<{ folio: string }> }) {
  const { folio } = await params
  return { title: `Cliente ${folio} — Artia Admin` }
}

export default async function AdminClienteFolioPage({ params }: { params: Promise<{ folio: string }> }) {
  const { folio } = await params
  const supabase = await createClient()

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(folio)

  const { data: lead } = await supabase
    .from('leads')
    .select('id, folio, nombre, email, telefono, servicio, mensaje, estado, notes, estimated_value, final_value, contract_value, payment_status, created_at')
    .eq(isUuid ? 'id' : 'folio', folio)
    .single()

  if (!lead) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 15, color: '#64748b' }}>
          No se encontró el lead <strong>{folio}</strong>.
        </p>
      </div>
    )
  }

  // Fetch related data after lead validation
  let paymentParents: any[] = []
  let project: any = null
  let projectFiles: any[] = []

  const results = await Promise.all([
    supabase
      .from('payment_parents')
      .select(`
        *,
        installments:payment_installments(*)
      `)
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('projects')
      .select('id, name, access_code, status, event_date, created_at')
      .eq('lead_id', lead.id)
      .maybeSingle()
  ])

  paymentParents = results[0].data ?? []
  project = results[1].data

  if (project) {
    const { data } = await supabase
      .from('project_files')
      .select('id, file_url, file_name, file_type')
      .eq('project_id', project.id)
      .limit(6)

    projectFiles = data ?? []
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, color: '#6366f1', background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.2)', padding: '2px 10px', borderRadius: 6 }}>
              FOLIO
            </span>
            <h1 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: 0 }}>
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
          Ver como cliente
        </a>
      </div>

      {/* Vista 360 */}
      <Vista360Client
        lead={lead}
        paymentParents={paymentParents}
        project={project}
        projectFiles={projectFiles}
      />

    </div>
  )
}