'use client'

import { useState, useEffect, useRef } from 'react'

interface ImageItem {
  name: string
  url: string
  path: string
  size: number
  created_at: string
}

export default function ImagenesPage() {
  const [images, setImages]     = useState<ImageItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [copied, setCopied]     = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cargar imágenes al montar
  useEffect(() => { fetchImages() }, [])

  async function fetchImages() {
    setLoading(true)
    try {
      const res = await fetch('/api/upload/list')
      const data = await res.json()
      setImages(data.images ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setProgress(`Subiendo ${i + 1} de ${files.length}: ${file.name}`)

      const form = new FormData()
      form.append('file', file)

      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) {
        alert(`Error: ${data.error}`)
      }
    }

    setProgress('')
    setUploading(false)
    fetchImages()
  }

  async function handleDelete(path: string) {
    if (!confirm('¿Eliminar esta imagen?')) return
    setDeleting(path)
    await fetch('/api/upload/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    })
    setDeleting(null)
    fetchImages()
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(null), 2000)
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#00113a', margin: '0 0 6px' }}>
          Imágenes
        </h1>
        <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
          Sube imágenes para usar en tus plantillas de email. Se guardan en Supabase Storage.
        </p>
      </div>

      {/* Zona de drop */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => {
          e.preventDefault()
          setDragOver(false)
          handleUpload(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#2552ca' : '#cbd5e1'}`,
          borderRadius: 12,
          padding: '40px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? '#eff6ff' : '#f8fafc',
          transition: 'all 0.2s',
          marginBottom: 32,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleUpload(e.target.files)}
        />

        {uploading ? (
          <div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#2552ca' }}>
              {progress}
            </p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🖼️</div>
            <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
              Arrastra imágenes aquí o haz clic para seleccionar
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
              JPG, PNG, WEBP, GIF, SVG · Máx. 5MB por archivo · Múltiples a la vez
            </p>
          </div>
        )}
      </div>

      {/* Galería */}
      {loading ? (
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Cargando imágenes…</p>
      ) : images.length === 0 ? (
        <div style={{
          background: '#fff',
          border: '0.5px solid #e2e8f0',
          borderRadius: 12,
          padding: '48px 32px',
          textAlign: 'center',
        }}>
          <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
            Aún no hay imágenes
          </p>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
            Sube tu primera imagen usando la zona de arriba.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
        }}>
          {images.map(img => (
            <div key={img.path} style={{
              background: '#fff',
              border: '0.5px solid #e2e8f0',
              borderRadius: 12,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Preview */}
              <div style={{
                height: 140,
                background: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* Info */}
              <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0f172a',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {img.name}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>
                  {formatSize(img.size)}
                </p>

                {/* Botones */}
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  <button
                    onClick={() => copyUrl(img.url)}
                    style={{
                      flex: 1,
                      background: copied === img.url ? '#10b981' : '#00113a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      padding: '7px 0',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    {copied === img.url ? '✓ Copiado' : 'Copiar URL'}
                  </button>
                  <button
                    onClick={() => handleDelete(img.path)}
                    disabled={deleting === img.path}
                    style={{
                      background: '#fef2f2',
                      color: '#dc2626',
                      border: '0.5px solid #fecaca',
                      borderRadius: 6,
                      padding: '7px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {deleting === img.path ? '…' : '✕'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
