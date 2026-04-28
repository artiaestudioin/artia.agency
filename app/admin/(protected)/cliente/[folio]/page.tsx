import { createClient } from '@/lib/supabase/server'
import Vista360Client from './Vista360Client'

export async function generateMetadata({ params }: { params: Promise<{ folio: string }> }) {
  const { folio } = await params
  return { title: `Cliente ${folio} — Artia Admin` }
}

export default async function AdminClienteFolioPage({ params }: { params: Promise<{ folio: string }> }) {
  const { folio } = await params
  const supabase  = await createClient()

  // Buscar lead por folio O por id (soporte ambos)
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

  // Datos relacionados en paralelo — ahora usa payment_parents + installments
  const [
    { data: paymentParents },
    { data: project },
  ] = await Promise.all([
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
      .maybeSingle(),
  ])

  const { data: projectFiles } = project
    ? await supabase
        .from('project_files')
        .select('id, file_url, file_name, file_type')
        .eq('project_id', project.id)
        .limit(6)
    : { data: [] }

  return (
    <Vista360Client
      lead={lead}
      paymentParents={paymentParents ?? []}
      project={project}
      projectFiles={projectFiles ?? []}
    />
  )
}