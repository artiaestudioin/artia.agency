import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export async function generateMetadata({ params }: { params: Promise<{ access_code: string }> }) {
  const { access_code } = await params
  return { title: `Portal Cliente — ${access_code}` }
}

type ProjectFile = {
  id: string
  file_url: string
  file_name: string | null
  file_type: string | null
  file_size: number | null
  created_at: string
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function isImage(type: string | null, url: string) {
  if (type?.startsWith('image/')) return true
  return /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(url)
}

function isPdf(type: string | null, url: string) {
  if (type === 'application/pdf') return true
  return /\.pdf$/i.test(url)
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

  const fileList = (files ?? []) as ProjectFile[]
  const images   = fileList.filter(f => isImage(f.file_type, f.file_url))
  const pdfs     = fileList.filter(f => isPdf(f.file_type, f.file_url))
  const others   = fileList.filter(f => !isImage(f.file_type, f.file_url) && !isPdf(f.file_type, f.file_url))

  const statusLabel = { activo: 'En producción', entregado: 'Entregado', archivado: 'Archivado' }
  const statusColor = { activo: '#2552ca', entregado: '#10b981', archivado: '#94a3b8' }

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
          <div style={{ display: 'inline-block', background: (statusColor as any)[project.status] ?? '#94a3b8', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 20, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 14 }}>
            {(statusLabel as any)[project.status] ?? project.status}
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

        {fileList.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: '#fff', borderRadius: 16, border: '0.5px solid #e2e8f0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📂</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#00113a', margin: '0 0 8px' }}>
              Tu galería está siendo preparada
            </h3>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
              Pronto encontrarás aquí todos los archivos de tu proyecto.<br/>
              Te notificaremos cuando estén disponibles.
            </p>
          </div>
        )}

        {/* Galería de imágenes */}
        {images.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#00113a', margin: 0 }}>
                📸 Fotografías ({images.length})
              </h2>
              <a href={`/api/client/${project.id}/download-all`}
                style={{ fontSize: 12, color: '#2552ca', textDecoration: 'none', fontWeight: 700, background: '#eff6ff', padding: '6px 14px', borderRadius: 8 }}>
                Descargar todo ↓
              </a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {images.map(f => (
                <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', aspectRatio: '4/3', borderRadius: 10, overflow: 'hidden', position: 'relative', textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <img src={f.file_url} alt={f.file_name ?? 'Imagen'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }}
                    onMouseOver={e => ((e.target as HTMLImageElement).style.transform = 'scale(1.05)')}
                    onMouseOut={e => ((e.target as HTMLImageElement).style.transform = 'scale(1)')}
                    loading="lazy"
                  />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.6))', padding: '20px 10px 8px', opacity: 0, transition: 'opacity 0.2s' }}
                    onMouseOver={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                    onMouseOut={e => ((e.currentTarget as HTMLElement).style.opacity = '0')}
                  >
                    <div style={{ color: '#fff', fontSize: 11, fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {f.file_name ?? 'Ver archivo'}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* PDFs */}
        {pdfs.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#00113a', margin: '0 0 14px' }}>
              📄 Documentos PDF ({pdfs.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pdfs.map(f => (
                <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', textDecoration: 'none', transition: 'all 0.15s' }}
                >
                  <div style={{ width: 40, height: 40, background: '#fef2f2', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    📄
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.file_name ?? 'Documento PDF'}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{fmtSize(f.file_size)}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#2552ca' }}>Abrir ↗</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Otros archivos */}
        {others.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#00113a', margin: '0 0 14px' }}>
              📎 Archivos ({others.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {others.map(f => (
                <a key={f.id} href={f.file_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', textDecoration: 'none' }}
                >
                  <div style={{ width: 40, height: 40, background: '#f8fafc', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📎</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.file_name ?? 'Archivo'}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{fmtSize(f.file_size)}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#2552ca' }}>Descargar ↓</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Contacto */}
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
