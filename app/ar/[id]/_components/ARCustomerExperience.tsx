'use client'

import { useEffect, useRef, useState } from 'react'
import type { ARExperience } from '@/types/ar'
import { OCCASION_EMOJIS } from '@/types/ar'

// Registrar google/model-viewer como elemento custom del DOM
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string
        'ios-src'?: string
        alt?: string
        ar?: boolean | ''
        'ar-modes'?: string
        'ar-scale'?: string
        'camera-controls'?: boolean | ''
        'auto-rotate'?: boolean | ''
        'shadow-intensity'?: string
        'exposure'?: string
        'environment-image'?: string
        loading?: string
        poster?: string
        style?: React.CSSProperties
      }, HTMLElement>
    }
  }
}

// ── Frame decorativo ──────────────────────────────────────────────────────────
const FRAME_PATTERNS: Record<string, string> = {
  none:    '',
  elegant: '✦ ─────────────── ✦',
  floral:  '🌸 ─────────────── 🌸',
  minimal: '── ─────────────── ──',
  luxury:  '◆ ─────────────── ◆',
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function loadModelViewerScript() {
  if (document.querySelector('script[data-mv]')) return
  const s = document.createElement('script')
  s.type = 'module'
  s.src  = 'https://cdn.jsdelivr.net/npm/@google/model-viewer/dist/model-viewer.min.js'
  s.setAttribute('data-mv', '1')
  document.head.appendChild(s)
}

async function trackEvent(experienceId: string, eventType: 'page_view' | 'ar_launch') {
  try {
    await fetch('/api/ar/events', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ experience_id: experienceId, event_type: eventType }),
    })
  } catch { /* silent */ }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ARCustomerExperience({ experience }: { experience: ARExperience }) {
  const [arActive, setArActive]   = useState(false)
  const [arReady,  setArReady]    = useState(false)
  const [modelLoaded, setModelLoaded] = useState(false)
  const viewerRef = useRef<HTMLElement>(null)
  const audioRef  = useRef<HTMLAudioElement>(null)

  const primary    = experience.primary_color   ?? '#c084fc'
  const secondary  = experience.secondary_color ?? '#818cf8'
  const bg         = experience.bg_color        ?? '#0a0a0f'
  const font       = experience.font_family     ?? 'Playfair Display'
  const frameLine  = FRAME_PATTERNS[experience.frame_style ?? 'elegant']
  const ctaRadius  = experience.cta_border_radius ?? 999
  const ctaColor   = experience.cta_color       ?? primary
  const ctaTextClr = experience.cta_text_color  ?? '#ffffff'
  const ctaText    = experience.cta_text        ?? 'Abrir Cámara'

  // Track page_view al montar
  useEffect(() => {
    trackEvent(experience.id, 'page_view')
  }, [experience.id])

  // Cargar model-viewer script
  useEffect(() => {
    if (arActive) {
      loadModelViewerScript()
    }
  }, [arActive])

  // Audio
  useEffect(() => {
    if (experience.audio_url && experience.audio_autoplay && audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
  }, [experience.audio_url, experience.audio_autoplay])

  function handleARLaunch() {
    setArActive(true)
    trackEvent(experience.id, 'ar_launch')
  }

  function handleViewerLoad() {
    setModelLoaded(true)
    // Pequeño delay para mostrar la transición
    setTimeout(() => setArReady(true), 300)
  }

  // Trigger AR nativo del viewer
  function triggerNativeAR() {
    const viewer = viewerRef.current as any
    if (viewer?.activateAR) {
      viewer.activateAR()
    }
  }

  return (
    <>
      {/* Google Fonts — fuente seleccionada */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;600;700&family=Inter:wght@400;500&display=swap`}
        rel="stylesheet"
      />

      <div style={{
        minHeight: '100dvh',
        width: '100%',
        background: experience.bg_image
          ? `linear-gradient(to bottom, ${bg}e6 0%, ${bg} 50%), url(${experience.bg_image}) center/cover fixed`
          : `radial-gradient(ellipse 120% 60% at 50% 0%, ${primary}28 0%, ${bg} 70%)`,
        color: '#fff',
        fontFamily: `"${font}", "Playfair Display", serif`,
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* Audio */}
        {experience.audio_url && (
          <audio
            ref={audioRef}
            src={experience.audio_url}
            loop
            style={{ display: 'none' }}
          />
        )}

        {/* ── PANTALLA PRINCIPAL (antes de activar AR) ── */}
        {!arActive && (
          <div style={{
            minHeight: '100dvh',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '60px 28px 48px',
            boxSizing: 'border-box',
            textAlign: 'center',
            position: 'relative', zIndex: 1,
          }}>
            {/* Orbs de fondo */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: '-15%', left: '50%', transform: 'translateX(-50%)',
                width: 500, height: 500, borderRadius: '50%',
                background: `radial-gradient(circle, ${primary}22 0%, transparent 70%)`,
              }} />
              <div style={{
                position: 'absolute', bottom: '-10%', right: '-10%',
                width: 300, height: 300, borderRadius: '50%',
                background: `radial-gradient(circle, ${secondary}18 0%, transparent 70%)`,
              }} />
            </div>

            {/* Emoji ocasión */}
            <div style={{
              width: 96, height: 96, borderRadius: '50%',
              background: `${primary}18`,
              border: `1.5px solid ${primary}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 44, marginBottom: 24,
              boxShadow: `0 0 60px ${primary}33`,
              animation: 'float 3s ease-in-out infinite',
            }}>
              {OCCASION_EMOJIS[experience.occasion]}
            </div>

            {/* Frame decorativo */}
            {frameLine && (
              <p style={{
                margin: '0 0 16px', fontSize: 13,
                color: `${primary}88`,
                letterSpacing: '0.06em',
              }}>
                {frameLine}
              </p>
            )}

            {/* Para: nombre */}
            {experience.recipient_name && (
              <p style={{
                margin: '0 0 8px', fontSize: 12, fontWeight: 600,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: `${primary}bb`,
                fontFamily: 'Inter, system-ui, sans-serif',
              }}>
                Para {experience.recipient_name}
              </p>
            )}

            {/* Título */}
            <h1 style={{
              margin: '0 0 20px', fontSize: 'clamp(24px, 7vw, 36px)',
              fontWeight: 700, lineHeight: 1.15,
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}>
              {experience.title}
            </h1>

            {/* Separador */}
            <div style={{
              width: 48, height: 2,
              background: `linear-gradient(90deg, transparent, ${primary}, transparent)`,
              borderRadius: 2, marginBottom: 20,
            }} />

            {/* Mensaje */}
            <p style={{
              margin: '0 0 44px',
              fontSize: 'clamp(15px, 4vw, 17px)',
              lineHeight: 1.7,
              color: 'rgba(255,255,255,0.72)',
              maxWidth: 320,
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 400,
            }}>
              {experience.message}
            </p>

            {/* Frame decorativo inferior */}
            {frameLine && (
              <p style={{
                margin: '0 0 36px', fontSize: 13,
                color: `${primary}88`,
                letterSpacing: '0.06em',
              }}>
                {frameLine}
              </p>
            )}

            {/* CTA principal */}
            <button
              onClick={handleARLaunch}
              style={{
                padding: '18px 44px',
                fontSize: 17, fontWeight: 700,
                background: ctaColor,
                color: ctaTextClr,
                border: 'none',
                borderRadius: ctaRadius,
                cursor: 'pointer',
                boxShadow: `0 12px 40px ${ctaColor}55`,
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                letterSpacing: '0.02em',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 18px 50px ${ctaColor}66`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = `0 12px 40px ${ctaColor}55`
              }}
            >
              <span style={{ fontSize: 20 }}>📷</span>
              {ctaText}
            </button>

            <p style={{
              margin: '16px 0 0', fontSize: 12,
              color: 'rgba(255,255,255,0.3)',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}>
              Se solicitará acceso a la cámara al tocar
            </p>

            {/* Artia watermark */}
            <div style={{
              position: 'absolute', bottom: 20, left: 0, right: 0,
              display: 'flex', justifyContent: 'center',
              fontSize: 11, letterSpacing: '0.14em',
              color: 'rgba(255,255,255,0.15)',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}>
              Powered by ARTIA WebAR
            </div>
          </div>
        )}

        {/* ── PANTALLA AR (después de tap) ── */}
        {arActive && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: bg,
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Botón volver */}
            <div style={{
              position: 'absolute', top: 16, left: 16, zIndex: 60,
            }}>
              <button
                onClick={() => { setArActive(false); setArReady(false); setModelLoaded(false) }}
                style={{
                  padding: '8px 16px', borderRadius: 999,
                  background: 'rgba(0,0,0,0.55)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                ← Volver
              </button>
            </div>

            {/* Loading overlay */}
            {!arReady && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 55,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: bg,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  border: `3px solid ${primary}44`,
                  borderTop: `3px solid ${primary}`,
                  animation: 'spin 0.8s linear infinite',
                  marginBottom: 20,
                }} />
                <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
                  Cargando modelo 3D…
                </p>
              </div>
            )}

            {/* Model Viewer */}
            <model-viewer
              ref={viewerRef as any}
              src={experience.model_url ?? undefined}
              ios-src={experience.model_ios_url ?? undefined}
              alt={experience.model_alt}
              ar
              ar-modes="webxr scene-viewer quick-look"
              ar-scale="auto"
              camera-controls
              auto-rotate
              shadow-intensity="1.1"
              exposure="1.0"
              environment-image="neutral"
              loading="eager"
              style={{
                width: '100%', height: '100%',
                background: 'transparent',
                opacity: arReady ? 1 : 0,
                transition: 'opacity 0.4s ease',
              }}
              onLoad={handleViewerLoad}
            />

            {/* Botón AR nativo (complementario al de model-viewer) */}
            {arReady && experience.model_url && (
              <div style={{
                position: 'absolute', bottom: 36, left: 0, right: 0,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 12, zIndex: 58,
              }}>
                <button
                  onClick={triggerNativeAR}
                  style={{
                    padding: '16px 40px', fontSize: 16, fontWeight: 700,
                    background: ctaColor, color: ctaTextClr,
                    border: 'none', borderRadius: ctaRadius,
                    cursor: 'pointer',
                    boxShadow: `0 8px 28px ${ctaColor}55`,
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <span style={{ fontSize: 20 }}>🔮</span>
                  Ver en mi espacio
                </button>
                <p style={{
                  fontSize: 12, color: 'rgba(255,255,255,0.4)',
                  margin: 0, fontFamily: 'Inter, system-ui',
                }}>
                  Arrastra para rotar · pellizca para acercar
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-10px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
      `}</style>
    </>
  )
}
