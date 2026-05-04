//nuevos cambios 
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ImageGallery from '@/components/client-portal/ImageGallery'

export async function generateMetadata({ params }: { params: Promise<{ access_code: string }> }) {
  const { access_code } = await params
  return { title: `Portal Cliente — ${access_code}` }
}

export default async function ClientPortalPage({ params }: { params: Promise<{ access_code: string }> }) {
  const { access_code } = await params
  const supabase = await createClient()

  // Buscar proyecto por código
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, status, event_date, created_at, lead_id')
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

  const statusLabel: Record<string, string> = { activo: 'En producción', entregado: 'Entregado', archivado: 'Archivado' }
  const statusColor: Record<string, string> = { activo: '#2552ca', entregado: '#10b981', archivado: '#94a3b8' }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>

      {/* Header */}
      <div style={{ background: '#00113a', padding: '0 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src="https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png" alt="ARTIA" height="32" style={{ height: 32, width: 'auto' }} />
          <code style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', letterSpacing: '2px', fontFamily: 'monospace' }}>
            {access_code.toUpperCase()}
          </code>
        </div>
      </div>

      {/* Banner del proyecto */}
      <div style={{ background: '#00113a', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 36px' }}>
          <div style={{ display: 'inline-block', background: statusColor[project.status] ?? '#94a3b8', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 20, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>
            {statusLabel[project.status] ?? project.status}
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            {project.name}
          </h1>
          {project.event_date && (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              📅 {new Date(project.event_date).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: '8px 0 0' }}>
            Proyecto desde {new Date(project.created_at).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <ImageGallery files={fileList} projectId={project.id} accessCode={access_code.toUpperCase()} />
      </div>

      {/* Contacto */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 32px' }}>
        <div style={{ background: '#00113a', borderRadius: 14, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>¿Tienes alguna pregunta?</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Estamos disponibles para ayudarte</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href="https://wa.me/593969937265" style={{ background: '#10b981', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              WhatsApp
            </a>
            <a href="mailto:artia.estudioin@gmail.com" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', padding: '10px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
              Email
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}