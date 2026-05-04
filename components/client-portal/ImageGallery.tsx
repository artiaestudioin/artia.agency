'use client'
//nuevos cambios
import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Types ──────────────────────────────────────────────────────────

type ProjectFile = {
  id: string
  file_url: string
  file_name: string | null
  file_type: string | null
  file_size: number | null
  created_at: string
}

type ProjectInfo = {
  id: string
  name: string
  description: string | null
  access_code: string
  event_date: string | null
  status: string
  lead_name?: string | null
}

type FilterType = 'all' | 'favorites' | 'selected'

// ─── Helpers ────────────────────────────────────────────────────────

function isImage(type: string | null, url: string) {
  if (type?.startsWith('image/')) return true
  return /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(url)
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Toast Component ───────────────────────────────────────────────

function Toast({ message, visible, onClose }: { message: string; visible: boolean; onClose: () => void }) {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(onClose, 2500)
      return () => clearTimeout(t)
    }
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div className="animate-fade-up" style={{
      position: 'fixed',
      bottom: 100,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--color-accent-hover)',
      color: '#fff',
      padding: '14px 28px',
      borderRadius: 50,
      fontSize: 14,
      fontWeight: 500,
      zIndex: 9999,
      boxShadow: 'var(--shadow-lg)',
      whiteSpace: 'nowrap',
    }}>
      {message}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────

export default function ImageGallery({ 
  files,
  projectId, 
  accessCode,
  projectInfo 
}: { 
  files: ProjectFile[]
  projectId: string
  accessCode: string
  projectInfo?: ProjectInfo | null
}) {
  const images = files.filter(f => isImage(f.file_type, f.file_url))
  const pid = projectId

  // Estados
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`favorites-${pid}`)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    }
    return new Set()
  })

  const [selected, setSelected] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`selected-${pid}`)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    }
    return new Set()
  })

  const [filter, setFilter] = useState<FilterType>('all')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false })
  const [slideshow, setSlideshow] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const slideshowRef = useRef<NodeJS.Timeout | null>(null)

  // ─── Computed values (DEBEN ir antes de los useEffect que las usan) ───

  const filteredImages = images.filter(img => {
    if (filter === 'favorites') return favorites.has(img.id)
    if (filter === 'selected') return selected.has(img.id)
    return true
  })

  const currentImage = filteredImages[lightboxIndex]

  // Info del evento
  const eventName = projectInfo?.name || 'Proyecto'
  const eventDate = formatDate(projectInfo?.event_date)
  const clientName = projectInfo?.lead_name || projectInfo?.description || ''

  // Persistencia
  useEffect(() => {
    localStorage.setItem(`favorites-${pid}`, JSON.stringify([...favorites]))
  }, [favorites, pid])

  useEffect(() => {
    localStorage.setItem(`selected-${pid}`, JSON.stringify([...selected]))
  }, [selected, pid])

  // Slideshow
  useEffect(() => {
    if (slideshow && lightboxOpen) {
      slideshowRef.current = setInterval(() => {
        setLightboxIndex(prev => (prev + 1) % filteredImages.length)
      }, 3000)
    }
    return () => {
      if (slideshowRef.current) clearInterval(slideshowRef.current)
    }
  }, [slideshow, lightboxOpen, filteredImages.length])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!lightboxOpen) return
      if (e.key === 'ArrowRight') navigateLightbox(1)
      if (e.key === 'ArrowLeft') navigateLightbox(-1)
      if (e.key === 'Escape') { setLightboxOpen(false); setSlideshow(false); }
      if (e.key === 'f') toggleFavorite(filteredImages[lightboxIndex]?.id)
      if (e.key === 's') toggleSelect(filteredImages[lightboxIndex]?.id)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lightboxOpen, lightboxIndex, filteredImages])

  const showToast = (message: string) => {
    setToast({ message, visible: true })
  }

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id); showToast('Eliminado de favoritos') }
      else { next.add(id); showToast('Añadido a favoritos') }
      return next
    })
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id); showToast('Foto deseleccionada') }
      else { next.add(id); showToast('Foto seleccionada') }
      return next
    })
  }, [])

  const saveSelection = async () => {
    try {
      showToast(`${selected.size} fotos guardadas correctamente`)
    } catch {
      showToast('Error guardando seleccion')
    }
  }

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
    setZoomed(false)
    setSlideshow(false)
  }

  const navigateLightbox = (dir: number) => {
    setLightboxIndex(prev => {
      const next = prev + dir
      if (next < 0) return filteredImages.length - 1
      if (next >= filteredImages.length) return 0
      return next
    })
    setZoomed(false)
  }

  // ─── Empty State ──────────────────────────────────────────────────

  if (files.length === 0) {
    return (
      <div className="animate-fade-in" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg)',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '80px 40px',
          background: 'var(--color-bg-white)',
          borderRadius: 'var(--radius-2xl)',
          border: '1px solid var(--color-border)',
          maxWidth: 480,
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ fontSize: 56, marginBottom: 24, opacity: 0.6 }}>📷</div>
          <h3 style={{ 
            fontSize: 22, 
            fontWeight: 600, 
            color: 'var(--color-text-primary)', 
            margin: '0 0 12px', 
            fontFamily: 'var(--font-playfair), serif' 
          }}>
            Tu galeria esta siendo preparada
          </h3>
          <p style={{ fontSize: 15, color: 'var(--color-text-light)', margin: 0, lineHeight: 1.6 }}>
            Pronto encontraras aqui todos los momentos capturados de tu dia especial.
            <br />Te notificaremos cuando esten disponibles.
          </p>
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg)',
      color: 'var(--color-text-primary)',
    }}>
      {/* Sidebar */}
      <aside style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width: sidebarOpen ? 280 : 72,
        height: '100vh',
        background: 'var(--color-bg-white)',
        borderRight: '1px solid var(--color-border)',
        zIndex: 100,
        transition: 'width var(--transition-slow)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--color-border-light)' }}>
          <div style={{
            fontFamily: 'var(--font-playfair), serif',
            fontSize: sidebarOpen ? 20 : 14,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: 1,
            textAlign: sidebarOpen ? 'left' : 'center',
            transition: 'all var(--transition-slow)',
          }}>
            {sidebarOpen ? 'ARTIA STUDIO' : 'AS'}
          </div>
          {sidebarOpen && (
            <div style={{ 
              fontSize: 10, 
              color: 'var(--color-text-muted)', 
              letterSpacing: 3, 
              marginTop: 4, 
              textTransform: 'uppercase' 
            }}>
              Fotografia
            </div>
          )}
        </div>

        {/* Event Info */}
        {sidebarOpen && (
          <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border-light)' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--color-bg-cream)',
              margin: '0 auto 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
            }}>
              💑
            </div>
            <div style={{ 
              textAlign: 'center', 
              fontSize: 15, 
              fontWeight: 600, 
              color: 'var(--color-text-primary)', 
              marginBottom: 4 
            }}>
              {eventName}
            </div>
            {clientName && (
              <div style={{ 
                textAlign: 'center', 
                fontSize: 12, 
                color: 'var(--color-text-muted)', 
                marginBottom: 4 
              }}>
                {clientName}
              </div>
            )}
            {eventDate && (
              <div style={{ 
                textAlign: 'center', 
                fontSize: 12, 
                color: 'var(--color-text-muted)' 
              }}>
                {eventDate}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px' }}>
          {[
            { key: 'all' as FilterType, icon: '🖼️', label: 'Galeria completa', count: images.length },
            { key: 'favorites' as FilterType, icon: '❤️', label: 'Favoritos', count: favorites.size },
            { key: 'selected' as FilterType, icon: '✓', label: 'Seleccionadas', count: selected.size },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: sidebarOpen ? '12px 16px' : '12px 0',
                justifyContent: sidebarOpen ? 'flex-start' : 'center',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: filter === item.key ? 'var(--color-bg-warm)' : 'transparent',
                color: filter === item.key ? 'var(--color-text-primary)' : 'var(--color-text-light)',
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
                fontSize: 14,
                fontWeight: filter === item.key ? 600 : 400,
                position: 'relative',
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              {sidebarOpen && (
                <>
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    background: filter === item.key ? '#e8e0d6' : 'var(--color-bg-cream)',
                    padding: '2px 8px',
                    borderRadius: 10,
                    color: 'var(--color-text-secondary)',
                  }}>
                    {item.count}
                  </span>
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Access Code */}
        {sidebarOpen && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border-light)' }}>
            <div style={{ 
              fontSize: 10, 
              color: 'var(--color-text-muted)', 
              letterSpacing: '1px', 
              textTransform: 'uppercase', 
              marginBottom: 6 
            }}>
              Codigo de acceso
            </div>
            <code style={{
              fontSize: 12,
              fontFamily: 'monospace',
              background: 'var(--color-bg-warm)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-md)',
              display: 'block',
              textAlign: 'center',
              color: 'var(--color-text-secondary)',
              letterSpacing: '2px',
            }}>
              {accessCode}
            </code>
          </div>
        )}

        {/* Toggle sidebar */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            padding: 16,
            border: 'none',
            background: 'transparent',
            borderTop: '1px solid var(--color-border-light)',
            cursor: 'pointer',
            color: 'var(--color-text-muted)',
            fontSize: 18,
            textAlign: 'center',
          }}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </aside>

      {/* Main Content */}
      <main style={{
        marginLeft: sidebarOpen ? 280 : 72,
        transition: 'margin-left var(--transition-slow)',
        minHeight: '100vh',
        paddingBottom: selected.size > 0 ? 120 : 0,
      }}>
        {/* Header */}
        <header style={{
          padding: '32px 40px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-playfair), serif',
              fontSize: 32,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              margin: '0 0 8px',
              letterSpacing: -0.5,
            }}>
              {filter === 'all' && 'Galeria completa'}
              {filter === 'favorites' && 'Tus favoritos'}
              {filter === 'selected' && 'Fotos seleccionadas'}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>
              {filteredImages.length} {filteredImages.length === 1 ? 'fotografia' : 'fotografias'}
              {filter === 'all' && ` · ${images.length} en total`}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => { setFilter('all'); openLightbox(0); setSlideshow(true); }}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-white)',
                color: 'var(--color-text-secondary)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all var(--transition-base)',
              }}
            >
              ▶ Presentacion
            </button>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: filter === 'all' ? 'var(--color-accent)' : 'var(--color-bg-white)',
                color: filter === 'all' ? '#fff' : 'var(--color-text-secondary)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
              }}
            >
              Todo
            </button>
            <button
              onClick={() => setFilter('favorites')}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: filter === 'favorites' ? 'var(--color-accent)' : 'var(--color-bg-white)',
                color: filter === 'favorites' ? '#fff' : 'var(--color-text-secondary)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
              }}
            >
              ❤️ Favoritos
            </button>
            <button
              onClick={() => setFilter('selected')}
              style={{
                padding: '10px 20px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: filter === 'selected' ? 'var(--color-accent)' : 'var(--color-bg-white)',
                color: filter === 'selected' ? '#fff' : 'var(--color-text-secondary)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
              }}
            >
              ✓ Seleccionadas
            </button>
          </div>
        </header>

        {/* Photo Grid */}
        <div style={{
          padding: '0 40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {filteredImages.map((img, idx) => {
            const isFav = favorites.has(img.id)
            const isSel = selected.has(img.id)
            const isHover = hoveredId === img.id

            return (
              <div
                key={img.id}
                onMouseEnter={() => setHoveredId(img.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => openLightbox(idx)}
                className="animate-fade-up"
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  aspectRatio: '4/3',
                  background: 'var(--color-bg-cream)',
                  boxShadow: isHover ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                  transition: 'box-shadow var(--transition-slow)',
                }}
              >
                <img
                  src={img.file_url}
                  alt={img.file_name ?? 'Fotografia'}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'var(--transition-transform)',
                    transform: isHover ? 'scale(1.04)' : 'scale(1)',
                  }}
                />

                {/* Overlay on hover */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: isHover ? 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 50%)' : 'transparent',
                  transition: 'all var(--transition-slow)',
                  pointerEvents: 'none',
                }} />

                {/* Badges */}
                <div style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  display: 'flex',
                  gap: 8,
                  pointerEvents: 'none',
                }}>
                  {isFav && (
                    <span style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.95)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      boxShadow: 'var(--shadow-sm)',
                    }}>❤️</span>
                  )}
                  {isSel && (
                    <span style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: 'var(--color-accent)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700,
                      boxShadow: 'var(--shadow-sm)',
                    }}>✓</span>
                  )}
                </div>

                {/* Hover Actions */}
                {isHover && (
                  <div
                    className="animate-fade-up"
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      left: 12,
                      right: 12,
                      display: 'flex',
                      gap: 8,
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => toggleFavorite(img.id)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: isFav ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.9)',
                        color: isFav ? 'var(--color-favorite)' : 'var(--color-text-primary)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)',
                        transition: 'all var(--transition-base)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      {isFav ? '❤️' : '🤍'} Favorito
                    </button>
                    <button
                      onClick={() => toggleSelect(img.id)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 'var(--radius-sm)',
                        border: 'none',
                        background: isSel ? 'var(--color-accent)' : 'rgba(255,255,255,0.9)',
                        color: isSel ? '#fff' : 'var(--color-text-primary)',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        backdropFilter: 'blur(8px)',
                        transition: 'all var(--transition-base)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >
                      {isSel ? '✓ Seleccionada' : '✓ Seleccionar'}
                    </button>
                  </div>
                )}

                {/* Filename on hover */}
                {isHover && (
                  <div className="animate-fade-up" style={{
                    position: 'absolute',
                    bottom: 56,
                    left: 12,
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 500,
                    textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }}>
                    {img.file_name}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filteredImages.length === 0 && (
          <div className="animate-fade-in" style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: 'var(--color-text-muted)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>
              {filter === 'favorites' ? '❤️' : '✓'}
            </div>
            <p style={{ fontSize: 16 }}>
              No hay fotos {filter === 'favorites' ? 'en favoritos' : 'seleccionadas'} aun
            </p>
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      {selected.size > 0 && (
        <div className="animate-slide-right" style={{
          position: 'fixed',
          bottom: 0,
          left: sidebarOpen ? 280 : 72,
          right: 0,
          background: 'var(--color-bg-white)',
          borderTop: '1px solid var(--color-border)',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          zIndex: 90,
          boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
          transition: 'left var(--transition-slow)',
        }}>
          {/* Thumbnails */}
          <div style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            maxWidth: 400,
            padding: '4px 0',
          }}>
            {[...selected].slice(0, 8).map(id => {
              const img = images.find(i => i.id === id)
              if (!img) return null
              return (
                <div key={id} style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '2px solid var(--color-accent)',
                  position: 'relative',
                }}>
                  <img src={img.file_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => toggleSelect(id)}
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: 'var(--color-accent)',
                      color: '#fff',
                      border: '2px solid #fff',
                      fontSize: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              )
            })}
            {selected.size > 8 && (
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-bg-cream)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
                flexShrink: 0,
              }}>
                +{selected.size - 8}
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* Counter */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>seleccionadas</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>
              {selected.size}
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={() => setFilter('selected')}
            style={{
              padding: '12px 24px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-white)',
              color: 'var(--color-text-secondary)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            👁 Ver seleccion
          </button>
          <button
            onClick={saveSelection}
            style={{
              padding: '12px 32px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: 'var(--color-accent)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: 'var(--shadow-md)',
              transition: 'all var(--transition-base)',
            }}
          >
            💾 Guardar seleccion
          </button>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && currentImage && (
        <div
          className="animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.92)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={() => { setLightboxOpen(false); setSlideshow(false); }}
        >
          {/* Top Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ color: '#fff', fontSize: 14, opacity: 0.7 }}>
              {lightboxIndex + 1} / {filteredImages.length}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setSlideshow(!slideshow)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: slideshow ? 'rgba(255,255,255,0.2)' : 'transparent',
                  color: '#fff',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {slideshow ? '⏸ Pausar' : '▶ Presentacion'}
              </button>
              <button
                onClick={() => setZoomed(!zoomed)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: '#fff',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                {zoomed ? '🔍 Alejar' : '🔍 Zoom'}
              </button>
              <button
                onClick={() => { setLightboxOpen(false); setSlideshow(false); }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: '#fff',
                  fontSize: 20,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Image Area */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              padding: '0 80px',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Prev */}
            <button
              onClick={() => navigateLightbox(-1)}
              style={{
                position: 'absolute',
                left: 24,
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                fontSize: 20,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                zIndex: 10,
              }}
            >
              ←
            </button>

            <img
              src={currentImage.file_url}
              alt={currentImage.file_name ?? ''}
              style={{
                maxWidth: '100%',
                maxHeight: zoomed ? '150%' : '85vh',
                objectFit: 'contain',
                borderRadius: 4,
                transition: 'all var(--transition-slow)',
                cursor: zoomed ? 'zoom-out' : 'default',
              }}
              onClick={() => !zoomed && setZoomed(true)}
            />

            {/* Next */}
            <button
              onClick={() => navigateLightbox(1)}
              style={{
                position: 'absolute',
                right: 24,
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: '#fff',
                fontSize: 20,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                zIndex: 10,
              }}
            >
              →
            </button>
          </div>

          {/* Bottom Actions */}
          <div
            style={{
              padding: '20px 24px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => toggleFavorite(currentImage.id)}
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255,255,255,0.2)',
                background: favorites.has(currentImage.id) ? 'rgba(225,29,72,0.8)' : 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {favorites.has(currentImage.id) ? '❤️' : '🤍'}
              {favorites.has(currentImage.id) ? 'Favorito' : 'Añadir favorito'}
            </button>
            <button
              onClick={() => toggleSelect(currentImage.id)}
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255,255,255,0.2)',
                background: selected.has(currentImage.id) ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.1)',
                color: selected.has(currentImage.id) ? 'var(--color-text-primary)' : '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {selected.has(currentImage.id) ? '✓ Seleccionada' : '✓ Seleccionar'}
            </button>
            <a
              href={currentImage.file_url}
              download
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              ⬇ Descargar
            </a>
          </div>

          {/* Filename */}
          <div style={{
            textAlign: 'center',
            padding: '0 24px 16px',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13,
          }}>
            {currentImage.file_name} · {fmtSize(currentImage.file_size)}
          </div>
        </div>
      )}

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} onClose={() => setToast({ ...toast, visible: false })} />
    </div>
  )
}