'use client'

import { useEffect, useRef, useState } from 'react'
import type { ARExperience } from '@/types/ar'
import { OCCASION_EMOJIS } from '@/types/ar'
import {
  loadScript, CDN, ensureGsap, startCelebration, animateModelEntrance, popIn,
  type ConfettiStyle,
} from './celebration'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string; 'ios-src'?: string; alt?: string
        ar?: boolean | ''; 'ar-modes'?: string; 'ar-scale'?: string
        'camera-controls'?: boolean | ''; 'auto-rotate'?: boolean | ''
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
  const [mindStarted, setMindStarted] = useState(false)
  const [targetFound, setTargetFound] = useState(false)
  const [mindError,   setMindError]   = useState(false)

  const viewerRef   = useRef<HTMLElement>(null)
  const arContainer = useRef<HTMLDivElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const audioRef    = useRef<HTMLAudioElement>(null)
  const voiceRef    = useRef<HTMLAudioElement>(null)
  const sceneElRef  = useRef<any>(null)
  const stopCelebrateRef = useRef<() => void>(() => {})

  // ── Config derivada ──
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

  const arMode    = experience.ar_mode ?? 'hybrid'
  const modelScale = experience.model_scale ?? 1
  const hasModel   = !!experience.model_url
  const useMindAR  = !!experience.target_mind_url && arMode !== 'native'
  const needViewer = hasModel && (!useMindAR || arMode === 'hybrid' || arMode === 'native')
  const showNativeBtn = arMode !== 'immersive' && arAvailable

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
    if (needViewer) loadModelViewerScript(() => setScriptReady(true))
  }, [needViewer])

  useEffect(() => {
    if (experience.audio_url && experience.audio_autoplay && !audioOnLaunch && audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
  }, [experience.audio_url, experience.audio_autoplay, audioOnLaunch])

  // Disponibilidad de AR nativa
  useEffect(() => {
    if (!started || !scriptReady || arMode === 'immersive') return
    const v = viewerRef.current as any
    if (!v) return
    const check = () => setArAvailable(!!v.canActivateAR)
    v.addEventListener?.('load', check)
    const t = setTimeout(check, 800)
    return () => { v.removeEventListener?.('load', check); clearTimeout(t) }
  }, [started, scriptReady, arMode])

  function playMedia() {
    if (experience.audio_url && audioRef.current) audioRef.current.play().catch(() => {})
    if (experience.voice_message_url && voiceRef.current) voiceRef.current.play().catch(() => {})
  }

  // ── Escena MindAR (anclaje a marcador) ──
  useEffect(() => {
    if (!started || !useMindAR) return
    const container = arContainer.current
    if (!container) return
    let cancelled = false

    ;(async () => {
      try {
        await loadScript(CDN.aframe, () => !!(window as any).AFRAME)
        await loadScript(CDN.aframeExtras, () => !!(window as any).AFRAME?.components['animation-mixer'])
        await loadScript(CDN.mindarAframe, () => !!(window as any).AFRAME?.components['mindar-image'])
        if (cancelled) return
        const gsap = await ensureGsap()

        const mixerAttr = experience.animation_name
          ? `animation-mixer="clip: ${experience.animation_name}"`
          : 'animation-mixer'

        container.innerHTML = `
          <a-scene
            mindar-image="imageTargetSrc: ${experience.target_mind_url}; autoStart: false; uiLoading: no; uiScanning: no; uiError: no; filterMinCF: 0.0005; filterBeta: 0.01"
            embedded color-space="sRGB"
            renderer="colorManagement: true; physicallyCorrectLights: true; alpha: true"
            vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false">
            <a-assets><a-asset-item id="celModel" src="${experience.model_url}"></a-asset-item></a-assets>
            <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
            <a-entity id="celTarget" mindar-image-target="targetIndex: 0">
              <a-gltf-model id="celGltf" src="#celModel" position="0 0 0" rotation="0 0 0" scale="0.001 0.001 0.001" ${mixerAttr}></a-gltf-model>
            </a-entity>
          </a-scene>`

        const sceneEl: any = container.querySelector('a-scene')
        sceneElRef.current = sceneEl
        const targetEl: any = container.querySelector('#celTarget')
        const gltfEl: any   = container.querySelector('#celGltf')

        const startMind = () => {
          try { sceneEl.systems['mindar-image-system'].start(); setMindStarted(true) }
          catch { setMindError(true) }
        }
        if (sceneEl.hasLoaded) startMind()
        else sceneEl.addEventListener('loaded', startMind, { once: true })

        let first = true
        targetEl.addEventListener('targetFound', () => {
          setTargetFound(true)
          if (first) {
            first = false
            animateModelEntrance(gsap, gltfEl.object3D, modelScale)
            if (confettiOn && canvasRef.current) {
              stopCelebrateRef.current?.()
              startCelebration(canvasRef.current, { colors, style: confettiStyle })
                .then(stop => { stopCelebrateRef.current = stop })
            }
          }
        })
        targetEl.addEventListener('targetLost', () => setTargetFound(false))
      } catch {
        if (!cancelled) setMindError(true)
      }
    })()

    return () => {
      cancelled = true
      try { sceneElRef.current?.systems?.['mindar-image-system']?.stop() } catch {}
      stopCelebrateRef.current?.()
      if (arContainer.current) arContainer.current.innerHTML = ''
      sceneElRef.current = null
      setMindStarted(false); setTargetFound(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, useMindAR])

  // ── Celebración del fallback 3D (sin marcador) ──
  useEffect(() => {
    if (!started || useMindAR) return
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
  }, [started, useMindAR])

  useEffect(() => () => stopCelebrateRef.current?.(), [])

  // ── Acciones ──
  function handleLaunch() {
    setBtnPressed(true)
    trackEvent(experience.id, 'ar_launch')
    playMedia()
    setStarted(true)
    if (arMode === 'native') {
      setTimeout(() => { (viewerRef.current as any)?.activateAR?.() }, 350)
    }
  }

  function handleClose() {
    try { sceneElRef.current?.systems?.['mindar-image-system']?.stop() } catch {}
    stopCelebrateRef.current?.()
    audioRef.current?.pause()
    voiceRef.current?.pause()
    setStarted(false); setBtnPressed(false)
    setTargetFound(false); setMindStarted(false); setMindError(false)
  }

  function handleNativeAR() {
    const v = viewerRef.current as any
    if (!v?.activateAR) return
    try { sceneElRef.current?.systems?.['mindar-image-system']?.pause?.() } catch {}
    try { v.activateAR() } catch { /* noop */ }
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

      {experience.audio_url && (
        <audio ref={audioRef} src={experience.audio_url} loop preload="auto" style={{ display: 'none' }} />
      )}
      {experience.voice_message_url && (
        <audio ref={voiceRef} src={experience.voice_message_url} preload="auto" style={{ display: 'none' }} />
      )}

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
              <span style={{ fontSize: 22 }}>{ctaIcons[experience.cta_icon ?? 'camera'] ?? '📷'}</span>
              {ctaText}
            </button>

            <p style={{ margin: '14px 0 0', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, color: hasBgImage ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.3)' }}>
              {useMindAR
                ? 'Apunta la cámara al marcador del regalo'
                : arMode === 'native' ? 'Se abrirá la cámara para colocar tu regalo' : 'Toca para descubrir tu regalo'}
            </p>
          </div>

          <p style={{ marginTop: 28, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 11, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
            Powered by Artia WebAR
          </p>
        </div>
      </div>

      {/* ─────────── PANTALLA 2 · ESCENA AR ─────────── */}
      {started && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: bg, overflow: 'hidden' }}>

          {/* MindAR (anclado al marcador) */}
          {useMindAR && <div ref={arContainer} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />}

          {/* Fallback 3D sobre fondo de marca / modo nativo */}
          {!useMindAR && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: heroBg ?? bg }}>
              {hasModel && scriptReady && (
                <model-viewer
                  ref={viewerRef as any}
                  src={experience.model_url!}
                  ios-src={experience.model_ios_url ?? undefined}
                  alt={experience.model_alt ?? 'Modelo AR'}
                  ar ar-modes="scene-viewer quick-look" ar-scale="auto"
                  camera-controls autoplay
                  animation-name={experience.animation_name ?? undefined}
                  interaction-prompt="none" shadow-intensity="1" exposure="1.1"
                  environment-image="neutral" loading="eager"
                  style={{ width: '100%', height: '100%', background: 'transparent', '--poster-color': 'transparent' } as React.CSSProperties}
                >
                  <div slot="ar-button" style={{ display: 'none' }} />
                </model-viewer>
              )}
            </div>
          )}

          {/* model-viewer oculto para la AR nativa cuando se usa MindAR */}
          {useMindAR && hasModel && arMode === 'hybrid' && scriptReady && (
            <model-viewer
              ref={viewerRef as any}
              src={experience.model_url!}
              ios-src={experience.model_ios_url ?? undefined}
              alt={experience.model_alt ?? 'Modelo AR'}
              ar ar-modes="scene-viewer quick-look" ar-scale="auto"
              loading="eager"
              style={{ position: 'fixed', width: 1, height: 1, opacity: 0, pointerEvents: 'none', zIndex: -1 } as React.CSSProperties}
            >
              <div slot="ar-button" style={{ display: 'none' }} />
            </model-viewer>
          )}

          {/* Confeti */}
          {confettiOn && <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 3, pointerEvents: 'none' }} />}

          {/* Chrome */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 4, padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)' }}>
            <button onClick={handleClose} aria-label="Cerrar" style={iconBtn}>✕</button>
            <div style={{ fontFamily: `"${font}", serif`, fontSize: 15, fontWeight: 600, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>{experience.title}</div>
            {confettiOn ? <button onClick={replayConfetti} aria-label="Repetir confeti" style={iconBtn}>🎉</button> : <div style={{ width: 40 }} />}
          </div>

          {/* Hint de escaneo (MindAR buscando marcador) */}
          {useMindAR && !targetFound && !mindError && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, pointerEvents: 'none', padding: 24, textAlign: 'center' }}>
              {experience.target_image_url && (
                <div style={{ position: 'relative', width: 150, height: 150, borderRadius: 16, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.6)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}>
                  <img src={experience.target_image_url} alt="marcador" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, animation: 'scanline 2s ease-in-out infinite', background: 'linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)' }} />
                </div>
              )}
              <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.4)', padding: '10px 18px', borderRadius: 999, backdropFilter: 'blur(8px)', margin: 0 }}>
                {mindStarted ? 'Apunta la cámara a la imagen del regalo' : 'Iniciando cámara…'}
              </p>
            </div>
          )}

          {/* Error MindAR */}
          {mindError && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center' }}>
              <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '14px 18px', borderRadius: 14, maxWidth: 320 }}>
                No se pudo iniciar la cámara AR. Revisa los permisos e inténtalo de nuevo{showNativeBtn ? ', o usa “Verlo sobre mi mesa”.' : '.'}
              </p>
            </div>
          )}

          {/* Nombre del destinatario */}
          {experience.recipient_name && (targetFound || !useMindAR) && (
            <div style={{ position: 'absolute', top: 70, left: 0, right: 0, zIndex: 3, textAlign: 'center', pointerEvents: 'none' }}>
              <span style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 999, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' }}>
                Para {experience.recipient_name} {emoji}
              </span>
            </div>
          )}

          {/* Pie */}
          <div style={{ position: 'absolute', bottom: 34, left: 0, right: 0, zIndex: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '0 20px' }}>
            {showNativeBtn && (
              <button onClick={handleNativeAR} style={{
                padding: '15px 30px', fontSize: 15, fontWeight: 700, fontFamily: 'Inter, system-ui, sans-serif',
                background: ctaColor, color: ctaTxtClr, border: 'none', borderRadius: ctaRadius, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10, boxShadow: `0 10px 35px ${ctaColor}66`,
              }}>
                <span style={{ fontSize: 18 }}>🪄</span> Verlo sobre mi mesa
              </button>
            )}
            {!useMindAR && (
              <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0, textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>
                Arrastra para girar · pellizca para acercar
              </p>
            )}
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
        @keyframes scanline   { 0%,100% { transform: translateY(-100%); } 50% { transform: translateY(100%); } }
        button:focus-visible { outline: 2px solid rgba(255,255,255,0.7); outline-offset: 3px; }
        /* MindAR usa video de fondo; lo dejamos cubrir su contenedor */
        .mindar-ui-overlay { z-index: 1 !important; }
      `}</style>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
  fontSize: 16, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
}
