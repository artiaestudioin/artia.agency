'use client'

import { useEffect, useRef, useState } from 'react'
import type { ARExperience } from '@/types/ar'
import { OCCASION_EMOJIS } from '@/types/ar'

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
        'auto-rotate-delay'?: string
        'rotation-per-second'?: string
        'shadow-intensity'?: string
        'exposure'?: string
        'environment-image'?: string
        loading?: string
        'animation-name'?: string
        autoplay?: boolean | ''
        style?: React.CSSProperties
      }, HTMLElement>
    }
  }
}

function loadModelViewerScript() {
  if (document.querySelector('script[data-mv]')) return
  const s = document.createElement('script')
  s.type  = 'module'
  s.src   = 'https://cdn.jsdelivr.net/npm/@google/model-viewer/dist/model-viewer.min.js'
  s.setAttribute('data-mv', '1')
  document.head.appendChild(s)
}

async function trackEvent(experienceId: string, eventType: 'page_view' | 'ar_launch') {
  try {
    await fetch('/api/ar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experience_id: experienceId, event_type: eventType }),
    })
  } catch { /* silent */ }
}

// ── CTA Icon component ────────────────────────────────────────────────────────
function CTAIcon({ icon }: { icon: string }) {
  const icons: Record<string, string> = {
    camera:   '📷',
    gift:     '🎁',
    heart:    '❤️',
    star:     '⭐',
    magic:    '✨',
    flower:   '🌸',
    rocket:   '🚀',
    surprise: '🎊',
  }
  return <span style={{ fontSize: 22, lineHeight: 1 }}>{icons[icon] ?? '📷'}</span>
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function ARCustomerExperience({ experience }: { experience: ARExperience }) {
  const [arActive,    setArActive]    = useState(false)
  const [arReady,     setArReady]     = useState(false)
  const [btnPressed,  setBtnPressed]  = useState(false)
  const viewerRef = useRef<HTMLElement>(null)
  const audioRef  = useRef<HTMLAudioElement>(null)

  const primary   = experience.primary_color   ?? '#ff6b35'
  const secondary = experience.secondary_color ?? '#ff8c5a'
  const bg        = experience.bg_color        ?? '#1a0a00'
  const font      = experience.font_family     ?? 'Playfair Display'
  const ctaRadius = experience.cta_border_radius ?? 999
  const ctaColor  = experience.cta_color        ?? primary
  const ctaText   = experience.cta_text         ?? 'Ver mi sorpresa'
  const ctaTxtClr = experience.cta_text_color   ?? '#ffffff'
  const occasion  = experience.occasion         ?? 'birthday'
  const emoji     = OCCASION_EMOJIS[occasion]

  // Track page_view
  useEffect(() => { trackEvent(experience.id, 'page_view') }, [experience.id])

  // Audio
  useEffect(() => {
    if (experience.audio_url && experience.audio_autoplay && audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
  }, [experience.audio_url, experience.audio_autoplay])

  function handleLaunch() {
    setBtnPressed(true)
    setTimeout(() => {
      setArActive(true)
      trackEvent(experience.id, 'ar_launch')
      loadModelViewerScript()
    }, 260)
  }

  function triggerNativeAR() {
    const v = viewerRef.current as any
    if (v?.activateAR) v.activateAR()
  }

  // ── Hero background ──────────────────────────────────────────────────────
  const hasBgImage = !!experience.bg_image
  const overlayOpacity = (experience as any).bg_overlay_opacity ?? 0.55

  const heroBg = hasBgImage
    ? undefined   // manejado por el style del hero
    : `radial-gradient(ellipse 140% 80% at 50% -20%, ${primary}44 0%, ${bg} 65%)`

  return (
    <>
      {/* Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href={`https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600&display=swap`}
        rel="stylesheet"
      />

      {/* Audio */}
      {experience.audio_url && (
        <audio ref={audioRef} src={experience.audio_url} loop style={{ display: 'none' }} />
      )}

      <div style={{ margin: 0, padding: 0, minHeight: '100dvh', background: bg }}>

        {/* ══ PANTALLA PRINCIPAL ══════════════════════════════════════════ */}
        {!arActive && (
          <div style={{
            minHeight: '100dvh',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}>

            {/* Background image */}
            {hasBgImage && (
              <>
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 0,
                  backgroundImage: `url(${experience.bg_image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }} />
                {/* Dark overlay */}
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 1,
                  background: `rgba(0,0,0,${overlayOpacity})`,
                }} />
              </>
            )}

            {/* Gradient background (sin imagen) */}
            {!hasBgImage && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 0,
                background: heroBg,
              }}>
                {/* Orbs decorativos */}
                <div style={{
                  position: 'absolute', top: '-20%', left: '50%',
                  transform: 'translateX(-50%)',
                  width: 600, height: 600, borderRadius: '50%',
                  background: `radial-gradient(circle, ${primary}28 0%, transparent 65%)`,
                  pointerEvents: 'none',
                }} />
                <div style={{
                  position: 'absolute', bottom: '-15%', right: '-10%',
                  width: 350, height: 350, borderRadius: '50%',
                  background: `radial-gradient(circle, ${secondary}1a 0%, transparent 70%)`,
                  pointerEvents: 'none',
                }} />
              </div>
            )}

            {/* Card central */}
            <div style={{
              position: 'relative', zIndex: 2,
              width: '100%', maxWidth: 440,
              margin: '0 auto',
              padding: '0 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>

              {/* Glass card */}
              <div style={{
                width: '100%',
                background: hasBgImage
                  ? 'rgba(255,255,255,0.12)'
                  : `${bg}cc`,
                backdropFilter: hasBgImage ? 'blur(20px) saturate(1.4)' : 'blur(10px)',
                WebkitBackdropFilter: hasBgImage ? 'blur(20px) saturate(1.4)' : 'blur(10px)',
                border: hasBgImage
                  ? '1px solid rgba(255,255,255,0.25)'
                  : `1px solid ${primary}33`,
                borderRadius: 28,
                padding: '44px 36px 40px',
                boxShadow: hasBgImage
                  ? '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)'
                  : `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px ${primary}22`,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0,
              }}>

                {/* Título */}
                <h1 style={{
                  margin: '0 0 16px',
                  fontFamily: `"${font}", "Playfair Display", serif`,
                  fontSize: 'clamp(26px, 7vw, 38px)',
                  fontWeight: 700,
                  lineHeight: 1.15,
                  color: '#ffffff',
                  letterSpacing: '-0.01em',
                }}>
                  {experience.title}
                </h1>

                {/* Emoji / icono ocasión */}
                <div style={{
                  fontSize: 48,
                  lineHeight: 1,
                  marginBottom: 20,
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
                  animation: 'heartbeat 1.8s ease-in-out infinite',
                }}>
                  {emoji}
                </div>

                {/* Subtítulo / recipient */}
                {experience.recipient_name && (
                  <p style={{
                    margin: '0 0 10px',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: hasBgImage ? 'rgba(255,255,255,0.7)' : `${primary}cc`,
                  }}>
                    Para {experience.recipient_name}
                  </p>
                )}

                {/* Mensaje */}
                <p style={{
                  margin: '0 0 36px',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 'clamp(14px, 4vw, 16px)',
                  lineHeight: 1.7,
                  color: hasBgImage ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.75)',
                  maxWidth: 320,
                }}>
                  {experience.message}
                </p>

                {/* CTA Button */}
                <button
                  onClick={handleLaunch}
                  style={{
                    width: '100%',
                    padding: '18px 32px',
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: '0.01em',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    background: ctaColor,
                    color: ctaTxtClr,
                    border: 'none',
                    borderRadius: ctaRadius,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    boxShadow: `0 10px 35px ${ctaColor}60`,
                    transform: btnPressed ? 'scale(0.96)' : 'scale(1)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  <CTAIcon icon={experience.cta_icon ?? 'camera'} />
                  {ctaText}
                </button>

                <p style={{
                  margin: '14px 0 0',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 12,
                  color: hasBgImage ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.3)',
                }}>
                  Se solicitará acceso a la cámara al tocar
                </p>
              </div>

              {/* Artia watermark */}
              <p style={{
                marginTop: 28,
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 11,
                letterSpacing: '0.14em',
                color: 'rgba(255,255,255,0.2)',
                textTransform: 'uppercase',
              }}>
                Powered by Artia WebAR
              </p>
            </div>
          </div>
        )}

        {/* ══ PANTALLA AR ════════════════════════════════════════════════ */}
        {arActive && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: bg,
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Barra superior */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              zIndex: 110,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
            }}>
              <button
                onClick={() => { setArActive(false); setArReady(false); setBtnPressed(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px',
                  borderRadius: 999,
                  background: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontSize: 13, fontWeight: 600,
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                }}
              >
                ← Volver
              </button>
              <div style={{
                fontFamily: `"${font}", serif`,
                fontSize: 15, fontWeight: 600, color: '#fff',
                textShadow: '0 1px 6px rgba(0,0,0,0.5)',
              }}>
                {experience.title}
              </div>
              <div style={{ width: 72 }} /> {/* spacer */}
            </div>

            {/* Loading */}
            {!arReady && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 105,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: bg,
                gap: 20,
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  border: `3px solid ${primary}33`,
                  borderTop: `3px solid ${primary}`,
                  animation: 'spin 0.8s linear infinite',
                }} />
                <p style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 15, color: 'rgba(255,255,255,0.6)', margin: 0,
                }}>
                  Preparando tu experiencia…
                </p>
              </div>
            )}

            {/* Model Viewer */}
            {experience.model_url && (
              <model-viewer
                ref={viewerRef as any}
                src={experience.model_url}
                ios-src={experience.model_ios_url ?? undefined}
                alt={experience.model_alt}
                ar
                ar-modes="webxr scene-viewer quick-look"
                ar-scale="auto"
                camera-controls
                auto-rotate
                auto-rotate-delay="1000"
                rotation-per-second="20deg"
                shadow-intensity="1.2"
                exposure="1.0"
                environment-image="neutral"
                loading="eager"
                autoplay
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'transparent',
                  '--poster-color': 'transparent',
                  opacity: arReady ? 1 : 0,
                  transition: 'opacity 0.5s ease',
                } as React.CSSProperties}
                onLoad={() => setTimeout(() => setArReady(true), 400)}
              />
            )}

            {/* Botón AR nativo + hint */}
            {arReady && (
              <div style={{
                position: 'absolute', bottom: 40, left: 0, right: 0,
                zIndex: 108,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 12,
              }}>
                <button
                  onClick={triggerNativeAR}
                  style={{
                    padding: '16px 44px',
                    fontSize: 16, fontWeight: 700,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    background: ctaColor,
                    color: ctaTxtClr,
                    border: 'none',
                    borderRadius: ctaRadius,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    boxShadow: `0 10px 35px ${ctaColor}55`,
                  }}
                >
                  <span style={{ fontSize: 20 }}>🔮</span>
                  Ver en mi espacio
                </button>
                <p style={{
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0,
                }}>
                  Arrastra para rotar · pellizca para escalar
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { margin: 0; padding: 0; background: ${bg}; }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          14%       { transform: scale(1.15); }
          28%       { transform: scale(1); }
          42%       { transform: scale(1.1); }
          56%       { transform: scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        button:focus-visible {
          outline: 2px solid rgba(255,255,255,0.6);
          outline-offset: 3px;
        }
      `}</style>
    </>
  )
}
