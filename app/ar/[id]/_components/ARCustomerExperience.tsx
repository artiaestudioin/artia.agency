'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { ARExperience } from '@/types/ar'
import { OCCASION_EMOJIS } from '@/types/ar'

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
        'disable-zoom'?: boolean | ''
        style?: React.CSSProperties
      }, HTMLElement>
    }
  }
}

// ── Carga del script de model-viewer (preserva la base actual) ──────────────
function loadModelViewerScript(onReady?: () => void) {
  const existing = document.querySelector('script[data-mv]')
  if (existing) {
    customElements.whenDefined('model-viewer').then(() => onReady?.())
    return
  }
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

// ── Confeti sobre canvas (sin dependencias, control total) ──────────────────
type ConfShape = 'classic' | 'hearts' | 'stars' | 'petals'

function drawHeart(ctx: CanvasRenderingContext2D, s: number) {
  ctx.beginPath()
  ctx.moveTo(0, s * 0.3)
  ctx.bezierCurveTo(0, 0, -s * 0.5, 0, -s * 0.5, s * 0.3)
  ctx.bezierCurveTo(-s * 0.5, s * 0.62, 0, s * 0.8, 0, s)
  ctx.bezierCurveTo(0, s * 0.8, s * 0.5, s * 0.62, s * 0.5, s * 0.3)
  ctx.bezierCurveTo(s * 0.5, 0, 0, 0, 0, s * 0.3)
  ctx.fill()
}

function drawStar(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI / 5) * (2 * i) - Math.PI / 2
    const a2 = a + Math.PI / 5
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45)
  }
  ctx.closePath()
  ctx.fill()
}

function runConfetti(
  canvas: HTMLCanvasElement,
  opts: { colors: string[]; shape: ConfShape; durationMs?: number; intensity?: number },
): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const reduce = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  function resize() {
    canvas.width = Math.floor(canvas.clientWidth * dpr)
    canvas.height = Math.floor(canvas.clientHeight * dpr)
  }
  resize()
  window.addEventListener('resize', resize)

  const W = () => canvas.width
  const H = () => canvas.height
  const colors = opts.colors.length ? opts.colors : ['#ff6b35', '#ffd166', '#ffffff']
  const shape = opts.shape
  const duration = reduce ? 700 : (opts.durationMs ?? 2600)
  const rate = reduce ? 1 : (opts.intensity ?? 3)        // partículas por frame durante la lluvia

  type P = {
    x: number; y: number; vx: number; vy: number; rot: number; vrot: number
    size: number; color: string; life: number; ttl: number; wobble: number
  }
  const parts: P[] = []

  function spawn(burst = false) {
    const x = burst ? W() / 2 + (Math.random() - 0.5) * W() * 0.5 : Math.random() * W()
    const y = burst ? H() * 0.92 : -10 * dpr
    parts.push({
      x, y,
      vx: (Math.random() - 0.5) * (burst ? 9 : 2.4) * dpr,
      vy: burst ? -(7 + Math.random() * 7) * dpr : (1.6 + Math.random() * 2.2) * dpr,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.3,
      size: (7 + Math.random() * 8) * dpr,
      color: colors[(Math.random() * colors.length) | 0],
      life: 0,
      ttl: 150 + Math.random() * 120,
      wobble: Math.random() * Math.PI * 2,
    })
  }

  // Estallido inicial + lluvia
  const initial = reduce ? 26 : 70
  for (let i = 0; i < initial; i++) spawn(true)

  const t0 = performance.now()
  let raf = 0
  let stopped = false

  function frame(now: number) {
    if (stopped) return
    const elapsed = now - t0
    if (elapsed < duration) for (let i = 0; i < rate; i++) spawn(false)

    ctx!.clearRect(0, 0, W(), H())
    const g = 0.16 * dpr
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]
      p.vy += g
      p.wobble += 0.1
      p.x += p.vx + Math.sin(p.wobble) * 0.6 * dpr
      p.y += p.vy
      p.rot += p.vrot
      p.life++
      const fade = Math.max(0, 1 - p.life / p.ttl)

      ctx!.save()
      ctx!.globalAlpha = fade
      ctx!.translate(p.x, p.y)
      ctx!.rotate(p.rot)
      ctx!.fillStyle = p.color
      if (shape === 'hearts') drawHeart(ctx!, p.size)
      else if (shape === 'stars') drawStar(ctx!, p.size * 0.7)
      else if (shape === 'petals') {
        ctx!.beginPath()
        ctx!.ellipse(0, 0, p.size * 0.65, p.size * 0.32, 0, 0, Math.PI * 2)
        ctx!.fill()
      } else {
        ctx!.fillRect(-p.size * 0.5, -p.size * 0.3, p.size, p.size * 0.6)
      }
      ctx!.restore()

      if (p.y > H() + 40 * dpr || p.life > p.ttl) parts.splice(i, 1)
    }

    if (elapsed < duration || parts.length > 0) raf = requestAnimationFrame(frame)
    else cleanup()
  }
  raf = requestAnimationFrame(frame)

  function cleanup() {
    stopped = true
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    ctx?.clearRect(0, 0, W(), H())
  }
  return cleanup
}

// ── Componente ──────────────────────────────────────────────────────────────
export default function ARCustomerExperience({ experience }: { experience: ARExperience }) {
  const [scriptReady, setScriptReady] = useState(false)
  const [started,     setStarted]     = useState(false)   // el usuario abrió la sorpresa
  const [btnPressed,  setBtnPressed]  = useState(false)
  const [cameraOn,    setCameraOn]    = useState(false)
  const [cameraDenied,setCameraDenied]= useState(false)
  const [arAvailable, setArAvailable] = useState(false)

  const viewerRef   = useRef<HTMLElement>(null)
  const videoRef    = useRef<HTMLVideoElement>(null)
  const audioRef    = useRef<HTMLAudioElement>(null)
  const voiceRef    = useRef<HTMLAudioElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const stopConfettiRef = useRef<() => void>(() => {})

  // ── Configuración derivada con defaults seguros ──
  const primary   = experience.primary_color     ?? '#ff6b35'
  const secondary = experience.secondary_color   ?? '#ff8c5a'
  const bg        = experience.bg_color           ?? '#1a0a00'
  const font      = experience.font_family        ?? 'Playfair Display'
  const ctaRadius = experience.cta_border_radius  ?? 999
  const ctaColor  = experience.cta_color          ?? primary
  const ctaText   = experience.cta_text           ?? 'Ver mi sorpresa'
  const ctaTxtClr = experience.cta_text_color     ?? '#ffffff'
  const ctaAnim   = experience.cta_animation      ?? 'pulse'
  const emoji     = OCCASION_EMOJIS[experience.occasion ?? 'birthday']

  const arMode    = experience.ar_mode            ?? 'hybrid'
  const wantsCamera   = arMode !== 'native'                 // immersive | hybrid usan cámara web
  const showNativeBtn = arMode !== 'immersive' && arAvailable
  const modelScale    = experience.model_scale    ?? 1

  const confettiOn    = experience.confetti_enabled ?? true
  const confettiStyle = (experience.confetti_style ?? 'hearts') as ConfShape
  const confettiColors = (experience.confetti_colors ?? '')
    .split(',').map(c => c.trim()).filter(Boolean)
  const palette = confettiColors.length ? confettiColors : [primary, secondary, '#ffffff', '#ffd166']

  const audioOnLaunch = experience.audio_start_on_launch ?? true
  const hasBgImage     = !!experience.bg_image
  const overlayOpacity = experience.bg_overlay_opacity ?? 0.55
  const heroBg = hasBgImage
    ? undefined
    : `radial-gradient(ellipse 140% 80% at 50% -20%, ${primary}44 0%, ${bg} 65%)`

  const ctaIcons: Record<string, string> = {
    camera: '📷', gift: '🎁', heart: '❤️', star: '⭐',
    magic: '✨', flower: '🌸', rocket: '🚀', surprise: '🎊',
  }

  // ── Efectos de ciclo de vida ──
  useEffect(() => { trackEvent(experience.id, 'page_view') }, [experience.id])

  // Precargar model-viewer
  useEffect(() => {
    if (!experience.model_url) return
    loadModelViewerScript(() => setScriptReady(true))
  }, [experience.model_url])

  // Música autoplay heredado: solo si NO se sincroniza con el botón
  useEffect(() => {
    if (experience.audio_url && experience.audio_autoplay && !audioOnLaunch && audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
  }, [experience.audio_url, experience.audio_autoplay, audioOnLaunch])

  // Detectar disponibilidad de AR nativa del modelo
  useEffect(() => {
    if (!started || !scriptReady) return
    const v = viewerRef.current as any
    if (!v) return
    const check = () => setArAvailable(!!v.canActivateAR)
    v.addEventListener?.('load', check)
    const t = setTimeout(check, 600)
    return () => { v.removeEventListener?.('load', check); clearTimeout(t) }
  }, [started, scriptReady])

  // Confeti al entrar a la escena
  useEffect(() => {
    if (!started || !confettiOn || !canvasRef.current) return
    if (arMode === 'native' && arAvailable) return        // la AR del sistema toma el control
    stopConfettiRef.current?.()
    stopConfettiRef.current = runConfetti(canvasRef.current, { colors: palette, shape: confettiStyle })
    return () => stopConfettiRef.current?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started])

  // Limpieza al desmontar
  useEffect(() => () => stopStream(), [])

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const startCamera = useCallback(async () => {
    if (!wantsCamera) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }, audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCameraOn(true)
    } catch {
      setCameraDenied(true)   // fallback: escena 3D sobre fondo de marca
    }
  }, [wantsCamera])

  function playMedia() {
    if (experience.audio_url && audioRef.current) audioRef.current.play().catch(() => {})
    if (experience.voice_message_url && voiceRef.current) voiceRef.current.play().catch(() => {})
  }

  // ── Acción principal: abrir la sorpresa ──
  function handleLaunch() {
    setBtnPressed(true)
    trackEvent(experience.id, 'ar_launch')
    playMedia()                       // dentro del gesto del usuario -> el móvil permite audio
    setStarted(true)
    if (wantsCamera) startCamera()
    if (arMode === 'native') {
      // entregar a la AR del sistema (Scene Viewer / Quick Look)
      setTimeout(() => {
        const v = viewerRef.current as any
        v?.activateAR?.()
      }, 350)
    }
  }

  function handleClose() {
    stopConfettiRef.current?.()
    stopStream()
    setCameraOn(false)
    setCameraDenied(false)
    setStarted(false)
    setBtnPressed(false)
    audioRef.current?.pause()
    voiceRef.current?.pause()
  }

  function replayConfetti() {
    if (!confettiOn || !canvasRef.current) return
    stopConfettiRef.current?.()
    stopConfettiRef.current = runConfetti(canvasRef.current, { colors: palette, shape: confettiStyle })
  }

  return (
    <div style={{ margin: 0, padding: 0, minHeight: '100dvh', background: bg }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href={`https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600&display=swap`}
        rel="stylesheet"
      />

      {/* Medios (ocultos) */}
      {experience.audio_url && (
        <audio ref={audioRef} src={experience.audio_url} loop preload="auto" style={{ display: 'none' }} />
      )}
      {experience.voice_message_url && (
        <audio ref={voiceRef} src={experience.voice_message_url} preload="auto" style={{ display: 'none' }} />
      )}

      {/* ─────────── PANTALLA 1 · MENSAJE (no arranca AR) ─────────── */}
      <div style={{
        minHeight: '100dvh', position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {hasBgImage ? (
          <>
            <div style={{
              position: 'absolute', inset: 0, zIndex: 0,
              backgroundImage: `url(${experience.bg_image})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
            }} />
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: `rgba(0,0,0,${overlayOpacity})` }} />
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: heroBg }}>
            <div style={{
              position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
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

        <div style={{
          position: 'relative', zIndex: 2,
          width: '100%', maxWidth: 440, margin: '0 auto', padding: '0 20px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div style={{
            width: '100%',
            background: hasBgImage ? 'rgba(255,255,255,0.12)' : `${bg}cc`,
            backdropFilter: hasBgImage ? 'blur(20px) saturate(1.4)' : 'blur(10px)',
            WebkitBackdropFilter: hasBgImage ? 'blur(20px) saturate(1.4)' : 'blur(10px)',
            border: hasBgImage ? '1px solid rgba(255,255,255,0.25)' : `1px solid ${primary}33`,
            borderRadius: experience.card_border_radius ?? 28, padding: '44px 36px 40px',
            boxShadow: hasBgImage
              ? '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)'
              : `0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px ${primary}22`,
            textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            {experience.logo_url && (
              <img src={experience.logo_url} alt="logo"
                style={{ height: 32, objectFit: 'contain', marginBottom: 16, opacity: 0.85 }} />
            )}

            <h1 style={{
              margin: '0 0 16px',
              fontFamily: `"${font}", "Playfair Display", serif`,
              fontSize: 'clamp(26px, 7vw, 38px)', fontWeight: 700, lineHeight: 1.15,
              color: experience.text_color ?? '#ffffff', letterSpacing: '-0.01em',
            }}>
              {experience.title}
            </h1>

            <div style={{
              fontSize: 48, lineHeight: 1, marginBottom: 20,
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
              animation: 'heartbeat 1.8s ease-in-out infinite',
            }}>
              {emoji}
            </div>

            {experience.subtitle && (
              <p style={{ margin: '0 0 8px', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>
                {experience.subtitle}
              </p>
            )}

            {experience.recipient_name && (
              <p style={{
                margin: '0 0 10px', fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 12, fontWeight: 700, letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: hasBgImage ? 'rgba(255,255,255,0.7)' : `${primary}cc`,
              }}>
                Para {experience.recipient_name}
              </p>
            )}

            <p style={{
              margin: '0 0 36px', fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: 'clamp(14px, 4vw, 16px)', lineHeight: 1.7,
              color: hasBgImage ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.75)',
              maxWidth: 320, whiteSpace: 'pre-line',
            }}>
              {experience.message}
            </p>

            <button onClick={handleLaunch} aria-label={ctaText} style={{
              width: '100%', padding: '18px 32px',
              fontSize: 17, fontWeight: 700, letterSpacing: '0.01em',
              fontFamily: 'Inter, system-ui, sans-serif',
              background: ctaColor, color: ctaTxtClr,
              border: 'none', borderRadius: ctaRadius, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: `0 10px 35px ${ctaColor}60`,
              transform: btnPressed ? 'scale(0.96)' : 'scale(1)',
              transition: 'transform 0.15s ease',
              animation: !btnPressed && ctaAnim !== 'none' ? `cta-${ctaAnim} 2s ease-in-out infinite` : undefined,
            }}>
              <span style={{ fontSize: 22 }}>{ctaIcons[experience.cta_icon ?? 'camera'] ?? '📷'}</span>
              {ctaText}
            </button>

            <p style={{
              margin: '14px 0 0', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12,
              color: hasBgImage ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.3)',
            }}>
              {wantsCamera ? 'Se pedirá permiso de cámara al tocar' : 'Toca para abrir tu sorpresa'}
            </p>
          </div>

          <p style={{
            marginTop: 28, fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 11, letterSpacing: '0.14em',
            color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase',
          }}>
            Powered by Artia WebAR
          </p>
        </div>
      </div>

      {/* ─────────── PANTALLA 2 · ESCENA AR (control total) ─────────── */}
      {started && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: bg, overflow: 'hidden' }}>

          {/* Cámara web de fondo (immersive / hybrid) */}
          {wantsCamera && (
            <video
              ref={videoRef}
              playsInline muted autoPlay
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', zIndex: 0,
                opacity: cameraOn ? 1 : 0, transition: 'opacity 0.5s ease',
              }}
            />
          )}

          {/* Fondo de marca si no hay cámara (denegada o modo native fallback) */}
          {(!cameraOn) && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: heroBg ?? bg }} />
          )}

          {/* Modelo 3D encima de la cámara (transparente) */}
          {experience.model_url && scriptReady && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              transform: `scale(${modelScale})`, transformOrigin: 'center center',
              pointerEvents: 'auto',
            }}>
              <model-viewer
                ref={viewerRef as any}
                src={experience.model_url}
                ios-src={experience.model_ios_url ?? undefined}
                alt={experience.model_alt ?? 'Modelo AR'}
                ar
                ar-modes="webxr scene-viewer quick-look"
                ar-scale="auto"
                camera-controls
                autoplay
                animation-name={experience.animation_name ?? undefined}
                interaction-prompt="none"
                shadow-intensity="1"
                exposure="1.1"
                environment-image="neutral"
                loading="eager"
                style={{ width: '100%', height: '100%', background: 'transparent', '--poster-color': 'transparent' } as React.CSSProperties}
              />
            </div>
          )}

          {/* Confeti (canvas overlay) */}
          {confettiOn && (
            <canvas ref={canvasRef} style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              zIndex: 2, pointerEvents: 'none',
            }} />
          )}

          {/* Chrome de la experiencia */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 4,
            padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
          }}>
            <button onClick={handleClose} aria-label="Cerrar" style={iconBtn}>✕</button>
            <div style={{ fontFamily: `"${font}", serif`, fontSize: 15, fontWeight: 600, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
              {experience.title}
            </div>
            {confettiOn
              ? <button onClick={replayConfetti} aria-label="Repetir confeti" style={iconBtn}>🎉</button>
              : <div style={{ width: 40 }} />}
          </div>

          {/* Mensaje flotante para el destinatario */}
          {experience.recipient_name && (
            <div style={{
              position: 'absolute', top: 70, left: 0, right: 0, zIndex: 3,
              textAlign: 'center', pointerEvents: 'none',
            }}>
              <span style={{
                display: 'inline-block', padding: '6px 16px', borderRadius: 999,
                background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)',
                fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12, fontWeight: 600,
                letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff',
              }}>
                Para {experience.recipient_name} {emoji}
              </span>
            </div>
          )}

          {/* Pie: estado cámara + botón AR nativa (hybrid) */}
          <div style={{
            position: 'absolute', bottom: 34, left: 0, right: 0, zIndex: 4,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            padding: '0 20px',
          }}>
            {showNativeBtn && (
              <button
                onClick={() => { const v = viewerRef.current as any; v?.activateAR?.() }}
                style={{
                  padding: '15px 30px', fontSize: 15, fontWeight: 700,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  background: ctaColor, color: ctaTxtClr, border: 'none',
                  borderRadius: ctaRadius, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: `0 10px 35px ${ctaColor}66`,
                }}>
                <span style={{ fontSize: 18 }}>🪄</span> Verlo sobre mi mesa
              </button>
            )}

            {cameraDenied && wantsCamera && (
              <p style={{
                fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12,
                color: 'rgba(255,255,255,0.85)', background: 'rgba(0,0,0,0.4)',
                padding: '8px 14px', borderRadius: 999, margin: 0, textAlign: 'center',
                backdropFilter: 'blur(8px)',
              }}>
                Activa la cámara para ver tu regalo en tu espacio · igual puedes explorarlo en 3D 👆
              </p>
            )}
            {!cameraDenied && (
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
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          14%       { transform: scale(1.15); }
          28%       { transform: scale(1); }
          42%       { transform: scale(1.1); }
          56%       { transform: scale(1); }
        }
        @keyframes cta-pulse  { 0%,100% { transform: scale(1); } 50% { transform: scale(1.035); } }
        @keyframes cta-bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes cta-glow   { 0%,100% { box-shadow: 0 10px 35px ${ctaColor}55; } 50% { box-shadow: 0 12px 50px ${ctaColor}aa; } }
        button:focus-visible { outline: 2px solid rgba(255,255,255,0.7); outline-offset: 3px; }
      `}</style>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 999,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.2)',
  color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
  backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
}
