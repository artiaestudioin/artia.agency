import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ImageGallery from '@/components/client-portal/ImageGallery'

export async function generateMetadata({ params }: { params: Promise<{ access_code: string }> }) {
  const { access_code } = await params
  return { title: `Galería — ${access_code}` }
}

export default async function ClientPortalPage({ params }: { params: Promise<{ access_code: string }> }) {
  const { access_code } = await params
  const supabase = await createClient()

  // Buscar proyecto por código
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, description, status, event_date, created_at, lead_id, leads(nombre, email)')
    .eq('access_code', access_code.toUpperCase())
    .maybeSingle()

  if (!project) return notFound()

  // Archivos del proyecto
  const { data: files } = await supabase
    .from('project_files')
    .select('id, file_url, file_name, file_type, file_size, created_at')
    .eq('project_id', project.id)
    .order('created_at', { ascending: false })

  const fileList = files ?? []

  const projectInfo = {
    id: project.id,
    name: project.name,
    description: project.description,
    access_code: project.access_code,
    event_date: project.event_date,
    status: project.status,
    lead_name: Array.isArray(project.leads) ? project.leads[0]?.nombre : project.leads?.nombre,
  }

  return (
    <ImageGallery 
      files={fileList} 
      projectId={project.id}
      accessCode={access_code.toUpperCase()}
      projectInfo={projectInfo}
    />
  )
}