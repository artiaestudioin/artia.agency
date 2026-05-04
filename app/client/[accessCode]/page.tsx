import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ImageGallery from '@/components/client-portal/ImageGallery'

export async function generateMetadata({ params }: { params: Promise<{ accessCode: string }> }) {
  const { accessCode } = await params
  return { title: `Galería — ${accessCode}` }
}

export default async function ClientPortalPage({ params }: { params: Promise<{ accessCode: string }> }) {
  const { accessCode } = await params
  const supabase = await createClient()

  // Buscar proyecto por código — AGREGAR access_code AL SELECT
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description, status, event_date, created_at, lead_id, access_code, leads(nombre, email)')
    .eq('access_code', accessCode.toUpperCase())
    .maybeSingle()

  if (!project) return notFound()

  // Archivos del proyecto
  const { data: files } = await supabase
    .from('project_files')
    .select('id, file_url, file_name, file_type, file_size, created_at')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })

  const fileList = files ?? []

  // Normalizar el lead (puede venir como array u objeto según tipos de Supabase)
  const lead = Array.isArray(project.leads) 
    ? project.leads[0] 
    : (project.leads as { nombre: string | null; email: string | null } | null)

  const projectInfo = {
    id: project.id,
    name: project.name,
    description: project.description,
    access_code: project.access_code,
    event_date: project.event_date,
    status: project.status,
    lead_name: lead?.nombre,
  }

  return (
    <ImageGallery 
      files={fileList} 
      projectId={project.id}
      accessCode={accessCode.toUpperCase()}
      projectInfo={projectInfo}
    />
  )
}
