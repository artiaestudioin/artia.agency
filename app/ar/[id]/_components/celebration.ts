// ============================================================
// celebration.ts
// Motor de celebración: GSAP (animaciones) + canvas-confetti (confeti realista).
// Las librerías se cargan por CDN en runtime (sin dependencias de build).
// ============================================================

type AnyWin = typeof window & { gsap?: any; confetti?: any; AFRAME?: any; MINDAR?: any }

export type ConfettiStyle = 'classic' | 'hearts' | 'stars' | 'petals'

// ── Carga de scripts (deduplicada) ─────────────────────────
const loaded = new Map<string, Promise<void>>()

export function loadScript(src: string, ready?: () => boolean): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (ready?.()) return Promise.resolve()
  const cached = loaded.get(src)
  if (cached) return cached
  const p = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[data-src="${src}"]`) as HTMLScriptElement | null
    if (existing) { existing.addEventListener('load', () => resolve()); if (ready?.()) resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.setAttribute('data-src', src)
    s.onload = () => resolve()
    s.onerror = () => reject(new Error(`No se pudo cargar ${src}`))
    document.head.appendChild(s)
  })
  loaded.set(src, p)
  return p
}

// ── CDNs ───────────────────────────────────────────────────
export const CDN = {
  gsap:        'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js',
  confetti:    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js',
  aframe:      'https://cdn.jsdelivr.net/npm/aframe@1.5.0/dist/aframe.min.js',
  aframeExtras:'https://cdn.jsdelivr.net/npm/aframe-extras@7.5.4/dist/aframe-extras.min.js',
  mindarAframe:'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js',
  mindarCore:  'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js',
}

export async function ensureGsap(): Promise<any> {
  const w = window as AnyWin
  if (w.gsap) return w.gsap
  await loadScript(CDN.gsap, () => !!(window as AnyWin).gsap)
  return (window as AnyWin).gsap
}

export async function ensureConfetti(): Promise<any> {
  const w = window as AnyWin
  if (w.confetti) return w.confetti
  await loadScript(CDN.confetti, () => !!(window as AnyWin).confetti)
  return (window as AnyWin).confetti
}

// ── Confeti realista (fuegos artificiales + lluvia con formas) ──
export async function startCelebration(
  canvas: HTMLCanvasElement,
  opts: { colors: string[]; style: ConfettiStyle },
): Promise<() => void> {
  let confetti: any, gsap: any
  try { confetti = await ensureConfetti(); gsap = await ensureGsap() } catch { return () => {} }
  if (!confetti) return () => {}

  const colors = opts.colors.length ? opts.colors : ['#ff6b35', '#ffd166', '#ffffff']
  const emoji =
    opts.style === 'hearts' ? '❤️' :
    opts.style === 'stars'  ? '⭐' :
    opts.style === 'petals' ? '🌸' : null
  const shapes = emoji && confetti.shapeFromText
    ? [confetti.shapeFromText({ text: emoji, scalar: 2.2 })]
    : ['square', 'circle']
  const scalar = emoji ? 2.2 : 1

  const inst = confetti.create(canvas, { resize: true, useWorker: false })
  let stopped = false
  const fire = (o: any) => { if (!stopped) inst({ colors, shapes, scalar, disableForReducedMotion: true, ...o }) }

  // Estallido principal + dos cañones laterales
  fire({ particleCount: 130, spread: 95, startVelocity: 58, angle: 90,  origin: { x: 0.5, y: 1.0 }, gravity: 0.9, ticks: 240 })
  fire({ particleCount: 70,  spread: 70, startVelocity: 60, angle: 60,  origin: { x: 0.0, y: 1.0 } })
  fire({ particleCount: 70,  spread: 70, startVelocity: 60, angle: 120, origin: { x: 1.0, y: 1.0 } })

  // Fuegos artificiales encadenados ~2.6s (orquestados con GSAP si está disponible)
  const bursts: Array<() => void> = []
  for (let i = 0; i < 9; i++) {
    bursts.push(() => fire({
      particleCount: 34, spread: 360, startVelocity: 26, ticks: 180,
      origin: { x: Math.random() * 0.7 + 0.15, y: Math.random() * 0.4 + 0.12 },
    }))
  }
  let tl: any = null
  if (gsap?.timeline) {
    tl = gsap.timeline()
    bursts.forEach((b, i) => tl.call(b, [], 0.3 + i * 0.27))
  } else {
    bursts.forEach((b, i) => setTimeout(b, 300 + i * 270))
  }

  // Lluvia suave continua desde arriba
  const rain = setInterval(() => fire({
    particleCount: 6, spread: 130, startVelocity: 0, angle: 270,
    origin: { x: Math.random(), y: -0.05 }, gravity: 0.55, ticks: 280,
  }), 320)
  const rainStop = setTimeout(() => clearInterval(rain), 4800)

  return () => {
    stopped = true
    clearInterval(rain); clearTimeout(rainStop)
    try { tl?.kill() } catch {}
    try { inst.reset?.() } catch {}
  }
}

// ── Entrada del modelo 3D con GSAP (pop-in elástico + flotación) ──
export function animateModelEntrance(gsap: any, object3D: any, scale: number) {
  if (!gsap || !object3D) return
  const s = scale || 1
  gsap.fromTo(object3D.scale,
    { x: 0.001, y: 0.001, z: 0.001 },
    { x: s, y: s, z: s, duration: 1.0, ease: 'back.out(1.7)' })
  gsap.fromTo(object3D.rotation,
    { y: -Math.PI }, { y: 0, duration: 1.1, ease: 'power3.out' })
  const baseY = object3D.position.y
  gsap.to(object3D.position, {
    y: baseY + 0.07, duration: 1.8, ease: 'sine.inOut',
    yoyo: true, repeat: -1, delay: 1.0,
  })
}

// ── Pulso de celebración para un elemento DOM (fallback sin marcador) ──
export function popIn(gsap: any, el: Element | null) {
  if (!gsap || !el) return
  gsap.fromTo(el,
    { scale: 0.6, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.9, ease: 'back.out(1.6)' })
}
