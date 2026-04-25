import { createClient } from '@/lib/supabase/server'
import ProyectosCRMClient from './ProyectosCRMClient'

export const metadata = { title: 'Proyectos CRM — Artia Admin' }

export default async function ProyectosCRMPage() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id, name, description, access_code, status, event_date, created_at,
      lead_id,
      leads ( id, nombre, email, folio, servicio, payment_status )
    `)
    .order('created_at', { ascending: false })

  // Contar archivos por proyecto
  const projectIds = (projects ?? []).map(p => p.id)
  const { data: fileCounts } = projectIds.length > 0
    ? await supabase
        .from('project_files')
        .select('project_id')
        .in('project_id', projectIds)
    : { data: [] }

  const countMap: Record<string, number> = {}
  ;(fileCounts ?? []).forEach(f => {
    countMap[f.project_id] = (countMap[f.project_id] ?? 0) + 1
  })

  const projectsWithCount = (projects ?? []).map(p => ({
    ...p,
    file_count: countMap[p.id] ?? 0,
  }))

  return <ProyectosCRMClient projects={projectsWithCount} />
}
