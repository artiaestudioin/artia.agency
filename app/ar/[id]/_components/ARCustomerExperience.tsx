'use client'

import { useEffect, useRef, useState } from 'react'
import type { ARExperience } from '@/types/ar'
import { OCCASION_EMOJIS } from '@/types/ar'
import { ensureGsap, startCelebration, popIn, type ConfettiStyle } from './celebration'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string; 'ios-src'?: string; alt?: string
        ar?: boolean | ''; 'ar-modes'?: string; 'ar-scale'?: string
        'camera-controls'?: boolean | ''; 'auto-rotate'?: boolean | ''
        'auto-rotate-delay'?: string; 'rotation-per-second'?: string
        'interaction-prompt'?: string
        'shadow-intensity'?: string; exposure?: string
        'environment-image'?: string; loading?: string
        'animation-name'?: string; autoplay?: boolean | ''
        style?: React.CSSProperties
      }, HTMLElement>
    }
  }
}

function loadModelViewerScript(onReady?: () => void) {
  const existing = document.querySelector('script[data-mv]')
  if (existing) { customElements.whenDefined('model-viewer').then(() => onReady?.()); return }
  const s = document.createElement('script')
  s.type = 'module'
  s.src  = 'https://cdn.jsdelivr.net/npm/@google/model-viewer/dist/model-viewer.min.js'
  s.setAttribute('data-mv', '1')
  s.onload  = () => customElements.whenDefined('model-viewer').then(() => onReady?.())
  s.onerror = () => onReady?.()
  document.head.appendChild(s)
}

async function trackEvent(id: string, t: 'page_view' | 'ar_launch') {
  try {
    await fetch('/api/ar/events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experience_id: id, event_type: t }),
    })
  } catch { /* silent */ }
}

export default function ARCustomerExperience({ experience }: { experience: ARExperience }) {
  const [scriptReady, setScriptReady] = useState(false)
  const [started,     setStarted]     = useState(false)
  const [btnPressed,  setBtnPressed]  = useState(false)
  const [arAvailable, setArAvailable] = useState(false)

  const viewerRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef  = useRef<HTMLAudioElement>(null)
  const voiceRef  = useRef<HTMLAudioElement>(null)
  const stopCelebrateRef = useRef<() => void>(() => {})

  // ── Config ──
  const primary   = experience.primary_color   ?? '#ff6b35'
  const secondary = experience.secondary_color ?? '#ff8c5a'
  const bg        = experience.bg_color        ?? '#1a0a00'
  const font      = experience.font_family     ?? 'Playfair Display'
  const ctaRadius = experience.cta_border_radius ?? 999
  const ctaColor  = experience.cta_color       ?? primary
  const ctaText   = experience.cta_text        ?? 'Ver mi sorpresa'
  const ctaTxtClr = experience.cta_text_color  ?? '#ffffff'
  const ctaAnim   = experience.cta_animation   ?? 'pulse'
  const emoji     = OCCASION_EMOJIS[experience.occasion ?? 'birthday']

  const hasModel = !!experience.model_url
  const confettiOn    = experience.confetti_enabled ?? true
  const confettiStyle = (experience.confetti_style ?? 'hearts') as ConfettiStyle
  const palette = (experience.confetti_colors ?? '').split(',').map(c => c.trim()).filter(Boolean)
  const colors  = palette.length ? palette : [primary, secondary, '#ffffff', '#ffd166']

  const audioOnLaunch = experience.audio_start_on_launch ?? true
  const hasBgImage     = !!experience.bg_image
  const overlayOpacity = experience.bg_overlay_opacity ?? 0.55
  const heroBg = hasBgImage
    ? undefined
    : `radial-gradient(ellipse 140% 80% at 50% -20%, ${primary}44 0%, ${bg} 65%)`

  const ctaIcons: Record<string, string> = {
    camera: '📷', gift: '🎁', heart: '❤️', star: '⭐', magic: '✨', flower: '🌸', rocket: '🚀', surprise: '🎊',
  }

  useEffect(() => { trackEvent(experience.id, 'page_view') }, [experience.id])

  useEffect(() => {
    if (hasModel) loadModelViewerScript(() => setScriptReady(true))
  }, [hasModel])

  useEffect(() => {
    if (experience.audio_url && experience.audio_autoplay && !audioOnLaunch && audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
  }, [experience.audio_url, experience.audio_autoplay, audioOnLaunch])

  // ¿AR disponible en este dispositivo? (WebXR / Scene Viewer / Quick Look)
  useEffect(() => {
    if (!started || !scriptReady) return
    const v = viewerRef.current as any
    if (!v) return
    const check = () => setArAvailable(!!v.canActivateAR)
    v.addEventListener?.('load', check)
    const t = setTimeout(check, 800)
    return () => { v.removeEventListener?.('load', check); clearTimeout(t) }
  }, [started, scriptReady])

  // Celebración al abrir (confeti + entrada del modelo)
  useEffect(() => {
    if (!started) return
    let stop = () => {}
    ;(async () => {
      const gsap = await ensureGsap().catch(() => null)
      popIn(gsap, viewerRef.current)
      if (confettiOn && canvasRef.current) {
        stopCelebrateRef.current?.()
        stop = await startCelebration(canvasRef.current, { colors, style: confettiStyle })
        stopCelebrateRef.current = stop
      }
    })()
    return () => { stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started])

  useEffect(() => () => stopCelebrateRef.current?.(), [])

  function playMedia() {
    if (experience.audio_url && audioRef.current) audioRef.current.play().catch(() => {})
    if (experience.voice_message_url && voiceRef.current) voiceRef.current.play().catch(() => {})
  }

  function handleLaunch() {
    setBtnPressed(true)
    trackEvent(experience.id, 'ar_launch')
    playMedia()             // dentro del gesto -> el móvil permite el audio
    setStarted(true)
  }

  function handleEnterAR() {
    const v = viewerRef.current as any
    if (v?.activateAR) { try { v.activateAR() } catch { /* noop */ } }
  }

  function handleClose() {
    stopCelebrateRef.current?.()
    audioRef.current?.pause()
    voiceRef.current?.pause()
    setStarted(false); setBtnPressed(false)
  }

  function replayConfetti() {
    if (!confettiOn || !canvasRef.current) return
    stopCelebrateRef.current?.()
    startCelebration(canvasRef.current, { colors, style: confettiStyle })
      .then(stop => { stopCelebrateRef.current = stop })
  }

  return (
    <div style={{ margin: 0, padding: 0, minHeight: '100dvh', background: bg }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href={`https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600&display=swap`}
        rel="stylesheet"
      />

      {experience.audio_url && <audio ref={audioRef} src={experience.audio_url} loop preload="auto" style={{ display: 'none' }} />}
      {experience.voice_message_url && <audio ref={voiceRef} src={experience.voice_message_url} preload="auto" style={{ display: 'none' }} />}

      {/* ─────────── PANTALLA 1 · MENSAJE ─────────── */}
      <div style={{ minHeight: '100dvh', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {hasBgImage ? (
          <>
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, backgroundImage: `url(${experience.bg_image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: `rgba(0,0,0,${overlayOpacity})` }} />
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: heroBg }}>
            <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${primary}28 0%, transparent 65%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: 350, height: 350, borderRadius: '50%', background: `radial-gradient(circle, ${secondary}1a 0%, transparent 70%)`, pointerEvents: 'none' }} />
          </div>
        )}

        <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 440, margin: '0 auto', padding: '0 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '100%',
            background: hasBgImage ? 'rgba(255,255,255,0.12)' : `${bg}cc`,
            backdropFilter: hasBgImage ? 'blur(20px) saturate(1.4)' : 'blur(10px)',
            WebkitBackdropFilter: hasBgImage ? 'blur(20px) saturate(1.4)' : 'blur(10px)',
            border: hasBgImage ? '1px solid rgba(255,255,255,0.25)' : `1px solid ${primary}33`,
            borderRadius: experience.card_border_radius ?? 28, padding: '44px 36px 40px',
            boxShadow: hasBgImage ? '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)' : `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px ${primary}22`,
            textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            {experience.logo_url && <img src={experience.logo_url} alt="logo" style={{ height: 32, objectFit: 'contain', marginBottom: 16, opacity: 0.85 }} />}

            <h1 style={{ margin: '0 0 16px', fontFamily: `"${font}", "Playfair Display", serif`, fontSize: 'clamp(26px, 7vw, 38px)', fontWeight: 700, lineHeight: 1.15, color: experience.text_color ?? '#ffffff', letterSpacing: '-0.01em' }}>
              {experience.title}
            </h1>

            <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 20, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))', animation: 'heartbeat 1.8s ease-in-out infinite' }}>{emoji}</div>

            {experience.subtitle && <p style={{ margin: '0 0 8px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>{experience.subtitle}</p>}

            {experience.recipient_name && (
              <p style={{ margin: '0 0 10px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: hasBgImage ? 'rgba(255,255,255,0.7)' : `${primary}cc` }}>
                Para {experience.recipient_name}
              </p>
            )}

            <p style={{ margin: '0 0 36px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 'clamp(14px, 4vw, 16px)', lineHeight: 1.7, color: hasBgImage ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.75)', maxWidth: 320, whiteSpace: 'pre-line' }}>
              {experience.message}
            </p>

            <button onClick={handleLaunch} aria-label={ctaText} style={{
              width: '100%', padding: '18px 32px', fontSize: 17, fontWeight: 700, letterSpacing: '0.01em',
              fontFamily: 'Inter, system-ui, sans-serif', background: ctaColor, color: ctaTxtClr,
              border: 'none', borderRadius: ctaRadius, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: `0 10px 35px ${ctaColor}60`, transform: btnPressed ? 'scale(0.96)' : 'scale(1)',
              transition: 'transform 0.15s ease',
              animation: !btnPressed && ctaAnim !== 'none' ? `cta-${ctaAnim} 2s ease-in-out infinite` : undefined,
            }}>
              <span style={{ fontSize: 22 }}>{ctaIcons[experience.cta_icon ?? 'gift'] ?? '🎁'}</span>
              {ctaText}
            </button>
          </div>

          <p style={{ marginTop: 28, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
            Powered by Artia WebAR
          </p>
        </div>
      </div>

      {/* ─────────── PANTALLA 2 · CELEBRACIÓN + AR ─────────── */}
      {started && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, overflow: 'hidden', background: heroBg ?? bg }}>

          {/* Modelo 3D */}
          {hasModel && scriptReady && (
            <model-viewer
              ref={viewerRef as any}
              src={experience.model_url!}
              ios-src={experience.model_ios_url ?? undefined}
              alt={experience.model_alt ?? 'Modelo 3D'}
              ar ar-modes="webxr scene-viewer quick-look" ar-scale="auto"
              camera-controls auto-rotate auto-rotate-delay="0" rotation-per-second="18deg"
              autoplay animation-name={experience.animation_name ?? undefined}
              interaction-prompt="none" shadow-intensity="1" exposure="1.15" environment-image="neutral"
              loading="eager"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent', '--poster-color': 'transparent' } as React.CSSProperties}
            >
              <div slot="ar-button" style={{ display: 'none' }} />
            </model-viewer>
          )}

          {/* Confeti */}
          {confettiOn && <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 3, pointerEvents: 'none' }} />}

          {/* Chrome */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 4, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)' }}>
            <button onClick={handleClose} aria-label="Cerrar" style={iconBtn}>✕</button>
            <div style={{ fontFamily: `"${font}", serif`, fontSize: 15, fontWeight: 600, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>{experience.title}</div>
            {confettiOn ? <button onClick={replayConfetti} aria-label="Repetir confeti" style={iconBtn}>🎉</button> : <div style={{ width: 40 }} />}
          </div>

          {experience.recipient_name && (
            <div style={{ position: 'absolute', top: 70, left: 0, right: 0, zIndex: 3, textAlign: 'center', pointerEvents: 'none' }}>
              <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 999, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>
                Para {experience.recipient_name} {emoji}
              </span>
            </div>
          )}

          {/* Pie: botón AR */}
          <div style={{ position: 'absolute', bottom: 34, left: 0, right: 0, zIndex: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '0 20px' }}>
            {arAvailable && (
              <button onClick={handleEnterAR} style={{
                padding: '16px 34px', fontSize: 16, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif',
                background: ctaColor, color: ctaTxtClr, border: 'none', borderRadius: ctaRadius, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10, boxShadow: `0 10px 35px ${ctaColor}66`,
              }}>
                <span style={{ fontSize: 20 }}>🪄</span> Ver en mi espacio
              </button>
            )}
            <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: 0, textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>
              {arAvailable ? 'Apunta a una superficie y coloca tu regalo · arrastra para girar' : 'Arrastra para girar · pellizca para acercar'}
            </p>
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { margin: 0; padding: 0; background: ${bg}; }
        model-viewer::part(default-ar-button) { display: none !important; }
        @keyframes heartbeat { 0%,100% { transform: scale(1); } 14% { transform: scale(1.15); } 28% { transform: scale(1); } 42% { transform: scale(1.1); } 56% { transform: scale(1); } }
        @keyframes cta-pulse  { 0%,100% { transform: scale(1); } 50% { transform: scale(1.035); } }
        @keyframes cta-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes cta-glow   { 0%,100% { box-shadow: 0 10px 35px ${ctaColor}55; } 50% { box-shadow: 0 12px 50px ${ctaColor}aa; } }
        button:focus-visible { outline: 2px solid rgba(255,255,255,0.7); outline-offset: 3px; }
      `}</style>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
  fontSize: 16, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
}
