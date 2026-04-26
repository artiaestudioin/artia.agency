'use client'

import { useState } from 'react'

type ProjectFile = {
  id: string
  file_url: string
  file_name: string | null
  file_type: string | null
  file_size: number | null
  created_at: string
}

function isImage(type: string | null, url: string) {
  if (type?.startsWith('image/')) return true
  return /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(url)
}

function isPdf(type: string | null, url: string) {
  if (type === 'application/pdf') return true
  return /\.pdf$/i.test(url)
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function ImageGallery({ files, projectId }: { files: ProjectFile[]; projectId: string }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const images = files.filter(f => isImage(f.file_type, f.file_url))
  const pdfs = files.filter(f => isPdf(f.file_type, f.file_url))
  const others = files.filter(f => !isImage(f.file_type, f.file_url) && !isPdf(f.file_type, f.file_url))

  if (files.length === 0) {
    return (
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
    )
  }

  return (
    <>
      {/* Galería de imágenes */}
      {images.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: '#00113a', margin: 0 }}>
              📸 Fotografías ({images.length})
            </h2>
            <a href={`/api/client/${projectId}/download-all`}
              style={{ fontSize: 12, color: '#2552ca', textDecoration: 'none', fontWeight: 700, background: '#eff6ff', padding: '6px 14px', borderRadius: 8 }}>
              Descargar todo ↓
            </a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {images.map(f => (
              <a
                key={f.id}
                href={f.file_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', aspectRatio: '4/3', borderRadius: 10, overflow: 'hidden', position: 'relative', textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                onMouseEnter={() => setHoveredId(f.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <img
                  src={f.file_url}
                  alt={f.file_name ?? 'Imagen'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.2s',
                    transform: hoveredId === f.id ? 'scale(1.05)' : 'scale(1)'
                  }}
                  loading="lazy"
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                    padding: '20px 10px 8px',
                    opacity: hoveredId === f.id ? 1 : 0,
                    transition: 'opacity 0.2s'
                  }}
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
    </>
  )
}