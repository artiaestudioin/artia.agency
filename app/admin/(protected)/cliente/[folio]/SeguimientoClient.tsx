'use client'

import { useEffect, useState, useRef } from 'react'

type Lead = {
  folio: string
  nombre: string
  servicio: string | null
  mensaje: string | null
  estado: string | null
  created_at: string
}

const STEPS = [
  { estado: 'nuevo',      label: 'Solicitud recibida',  sublabel: 'Tu solicitud llegó a nuestro equipo',    icon: '◎', code: 'RECV' },
  { estado: 'contactado', label: 'En revisión',         sublabel: 'Analizando los detalles de tu proyecto', icon: '◈', code: 'ANLZ' },
  { estado: 'en_proceso', label: 'En producción',       sublabel: 'Tu proyecto está siendo desarrollado',   icon: '⬡', code: 'PROD' },
  { estado: 'cerrado',    label: 'Entregado',           sublabel: '¡Tu proyecto fue completado con éxito!', icon: '★', code: 'FINAL' },
]

const ESTADO_IDX: Record<string, number> = {
  nuevo: 0, contactado: 1, en_proceso: 2, cerrado: 3, perdido: 3,
}

function getAccent(servicio: string | null) {
  const s = (servicio ?? '').toLowerCase()
  if (s.includes('impres') || s.includes('sublim') || s.includes('papel'))
    return { color: '#f59e0b', rgb: '245,158,11', soft: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.2)' }
  if (s.includes('foto') || s.includes('video') || s.includes('drone'))
    return { color: '#8b5cf6', rgb: '139,92,246', soft: 'rgba(139,92,246,.1)', border: 'rgba(139,92,246,.2)' }
  if (s.includes('market') || s.includes('redes') || s.includes('social'))
    return { color: '#10b981', rgb: '16,185,129', soft: 'rgba(16,185,129,.1)', border: 'rgba(16,185,129,.2)' }
  if (s.includes('brand') || s.includes('logo') || s.includes('identidad'))
    return { color: '#f43f5e', rgb: '244,63,94', soft: 'rgba(244,63,94,.1)', border: 'rgba(244,63,94,.2)' }
  return { color: '#6366f1', rgb: '99,102,241', soft: 'rgba(99,102,241,.1)', border: 'rgba(99,102,241,.2)' }
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    background: #f9fafb;
    min-height: 100vh;
    font-family: 'Inter', sans-serif;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }

  #sf-canvas { position: fixed; inset: 0; pointer-events: none; z-index: 0; }

  .sf-blobs { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
  .sf-blob {
    position: absolute; border-radius: 50%;
    filter: blur(80px); opacity: 0;
    animation: blobMove 16s ease-in-out infinite;
  }
  .sf-blob:nth-child(1) {
    width: 600px; height: 400px; top: -5%; left: -10%;
    background: radial-gradient(ellipse, rgba(var(--arc), .1) 0%, transparent 70%);
  }
  .sf-blob:nth-child(2) {
    width: 500px; height: 500px; bottom: 0; right: -10%;
    background: radial-gradient(ellipse, rgba(var(--arc), .07) 0%, transparent 70%);
    animation-delay: -8s;
  }
  .sf-blob:nth-child(3) {
    width: 400px; height: 300px; top: 40%; left: 30%;
    background: radial-gradient(ellipse, rgba(236,72,153,.04) 0%, transparent 70%);
    animation-delay: -4s; animation-duration: 20s;
  }
  @keyframes blobMove {
    0%   { opacity: 0; transform: translate(0,0) scale(1); }
    15%  { opacity: 1; }
    50%  { transform: translate(30px,-20px) scale(1.06); }
    85%  { opacity: 0.6; }
    100% { opacity: 0; transform: translate(0,0) scale(1); }
  }

  /* PAGE */
  .sf-page {
    position: relative; z-index: 10;
    min-height: 100vh;
    display: flex; flex-direction: column; align-items: center;
    padding: 52px 20px 100px;
  }

  /* LOGO */
  .sf-logo {
    margin-bottom: 40px;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    opacity: 0; transform: translateY(-16px);
    animation: sfSlideDown .9s cubic-bezier(.22,1,.36,1) .1s forwards;
  }
  @keyframes sfSlideDown { to { opacity: 1; transform: translateY(0); } }
  .sf-logo-text {
    font-family: 'Syne', sans-serif;
    font-size: 13px; font-weight: 800;
    letter-spacing: 6px; text-transform: uppercase;
    color: #9ca3af;
  }
  .sf-logo-dot {
    display: inline-block; width: 5px; height: 5px; border-radius: 50%;
    background: var(--accent); margin: 0 6px; vertical-align: middle;
    animation: sfBlink 2s ease-in-out infinite;
  }
  @keyframes sfBlink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.5)} }
  .sf-logo-line {
    width: 1px; height: 24px;
    background: linear-gradient(to bottom, rgba(var(--arc),.4), transparent);
  }

  /* CARD */
  .sf-card {
    width: 100%; max-width: 548px;
    background: #ffffff;
    border: 1px solid rgba(0,0,0,.07);
    border-radius: 22px; overflow: visible;
    box-shadow:
      0 0 0 1px rgba(var(--arc),.07),
      0 4px 6px rgba(0,0,0,.03),
      0 20px 60px rgba(var(--arc),.06),
      0 60px 100px rgba(0,0,0,.05);
    opacity: 0; transform: translateY(40px) scale(.97);
    animation: sfCardUp 1.1s cubic-bezier(.22,1,.36,1) .3s forwards;
    position: relative;
  }
  @keyframes sfCardUp { to { opacity: 1; transform: translateY(0) scale(1); } }

  /* Corner brackets */
  .sf-c { position: absolute; width: 12px; height: 12px; opacity: .4; }
  .sf-c-tl { top: 12px; left: 12px; border-top: 1.5px solid var(--accent); border-left: 1.5px solid var(--accent); border-radius: 3px 0 0 0; }
  .sf-c-tr { top: 12px; right: 12px; border-top: 1.5px solid var(--accent); border-right: 1.5px solid var(--accent); border-radius: 0 3px 0 0; }
  .sf-c-bl { bottom: 12px; left: 12px; border-bottom: 1.5px solid var(--accent); border-left: 1.5px solid var(--accent); border-radius: 0 0 0 3px; }
  .sf-c-br { bottom: 12px; right: 12px; border-bottom: 1.5px solid var(--accent); border-right: 1.5px solid var(--accent); border-radius: 0 0 3px 0; }

  /* HEADER */
  .sf-hdr {
    padding: 34px 34px 28px;
    position: relative; overflow: hidden;
    border-bottom: 1px solid rgba(0,0,0,.05);
    border-radius: 22px 22px 0 0;
  }
  .sf-hdr-glow {
    position: absolute; top: -80px; right: -80px;
    width: 280px; height: 280px; border-radius: 50%;
    background: radial-gradient(ellipse, rgba(var(--arc),.09) 0%, transparent 65%);
    pointer-events: none;
    animation: sfGlowPulse 5s ease-in-out infinite;
  }
  @keyframes sfGlowPulse { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.2);opacity:1} }
  .sf-hdr-top { display: flex; justify-content: space-between; align-items: flex-start; }

  .sf-folio-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px; letter-spacing: 4px; text-transform: uppercase;
    color: var(--accent); margin-bottom: 10px;
    display: flex; align-items: center; gap: 8px;
    opacity: 0; animation: sfFadeIn .6s ease .8s forwards;
  }
  .sf-fl-line { width: 16px; height: 1px; background: var(--accent); opacity: .5; }

  .sf-folio-id {
    font-family: 'Syne', sans-serif;
    font-size: 20px; font-weight: 400;
    color: #111827; letter-spacing: 1px; line-height: 1;
    position: relative;
  }
  .sf-folio-id::before, .sf-folio-id::after {
    content: attr(data-text);
    position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;
  }
  .sf-folio-id::before {
    color: var(--accent); opacity: .4;
    clip-path: polygon(0 15%, 100% 15%, 100% 40%, 0 40%);
    animation: sfGlitchA 9s infinite 2s;
  }
  .sf-folio-id::after {
    color: rgba(139,92,246,.45);
    clip-path: polygon(0 60%, 100% 60%, 100% 78%, 0 78%);
    animation: sfGlitchB 9s infinite 2s;
  }
  @keyframes sfGlitchA {
    0%,88%,100% { transform: translate(0); opacity: 0; }
    89% { transform: translate(-3px,0); opacity: .7; }
    90% { transform: translate(3px,0); opacity: .7; }
    91% { transform: translate(0); opacity: 0; }
  }
  @keyframes sfGlitchB {
    0%,88%,100% { transform: translate(0); opacity: 0; }
    89% { transform: translate(3px,0); opacity: .5; }
    91% { transform: translate(0); opacity: 0; }
  }

  .sf-ch {
    display: inline-block; opacity: 0; transform: translateY(10px);
    animation: sfCharIn .4s cubic-bezier(.22,1,.36,1) forwards;
  }
  @keyframes sfCharIn { to { opacity: 1; transform: translateY(0); } }

  .sf-svc {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--accent-soft); border: 1px solid var(--accent-border);
    border-radius: 100px; padding: 5px 13px; margin-top: 12px;
    font-size: 11px; font-weight: 500; color: var(--accent); letter-spacing: .3px;
    opacity: 0; animation: sfFadeIn .6s ease 1.5s forwards;
  }
  .sf-svc-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); animation: sfBlink 2s ease-in-out infinite; }

  .sf-client-blk { text-align: right; opacity: 0; animation: sfFadeIn .6s ease 1s forwards; }
  .sf-client-lbl {
    font-family: 'Space Mono', monospace;
    font-size: 7px; letter-spacing: 3px; text-transform: uppercase;
    color: #9ca3af; margin-bottom: 4px;
  }
  .sf-client-name {
    font-family: 'Syne', sans-serif;
    font-size: 15px; font-weight: 700; color: #111827; letter-spacing: .3px;
  }

  /* STATUS BAR */
  .sf-sbar {
    display: flex; align-items: center; gap: 12px;
    background: var(--accent-soft); border: 1px solid var(--accent-border);
    border-radius: 12px; padding: 12px 15px; margin-top: 20px;
    opacity: 0; animation: sfFadeIn .6s ease 1.6s forwards;
  }
  .sf-sbar-icon {
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(var(--arc),.12); border: 1.5px solid rgba(var(--arc),.25);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; color: var(--accent);
    position: relative; flex-shrink: 0;
    animation: sfIconPulse 3s ease-in-out infinite 2s;
  }
  @keyframes sfIconPulse {
    0%,100% { box-shadow: 0 0 0 4px rgba(var(--arc),.05), 0 0 12px rgba(var(--arc),.1); }
    50%      { box-shadow: 0 0 0 10px rgba(var(--arc),.03), 0 0 22px rgba(var(--arc),.18); }
  }
  .sf-sbar-icon::before {
    content: ''; position: absolute; inset: -8px; border-radius: 50%;
    border: 1.5px solid transparent; border-top-color: var(--accent);
    animation: sfSpin 3s linear infinite;
  }
  .sf-sbar-icon::after {
    content: ''; position: absolute; inset: -14px; border-radius: 50%;
    border: 1px solid transparent; border-bottom-color: rgba(var(--arc),.3);
    animation: sfSpin 5s linear infinite reverse;
  }
  @keyframes sfSpin { to { transform: rotate(360deg); } }

  .sf-sbar-text { flex: 1; }
  .sf-sbar-title { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: #111827; }
  .sf-sbar-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .sf-sbar-code {
    font-family: 'Space Mono', monospace; font-size: 9px; letter-spacing: 2px;
    color: var(--accent); padding: 3px 9px;
    background: rgba(var(--arc),.08); border-radius: 6px; border: 1px solid var(--accent-border);
  }

  /* METRICS */
  .sf-metrics { display: grid; grid-template-columns: repeat(3, 1fr); border-bottom: 1px solid rgba(0,0,0,.05); }
  .sf-met { padding: 16px 18px; border-right: 1px solid rgba(0,0,0,.04); opacity: 0; animation: sfFadeIn .6s ease 1.8s forwards; }
  .sf-met:last-child { border-right: none; }
  .sf-met-k { font-family: 'Space Mono', monospace; font-size: 7px; letter-spacing: 3px; text-transform: uppercase; color: #9ca3af; margin-bottom: 6px; }
  .sf-met-v { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 800; color: #111827; }
  .sf-met-v.hi { color: var(--accent); }
  .sf-met-v.sm { font-size: 11px; font-weight: 600; }

  /* TIMELINE */
  .sf-tl { padding: 30px 34px; border-bottom: 1px solid rgba(0,0,0,.05); }
  .sf-tl-head { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; opacity: 0; animation: sfFadeIn .6s ease 1.9s forwards; }
  .sf-tl-head-txt { font-family: 'Space Mono', monospace; font-size: 8px; letter-spacing: 4px; text-transform: uppercase; color: #9ca3af; }
  .sf-tl-head-line { flex: 1; height: 1px; background: linear-gradient(to right, rgba(var(--arc),.25), transparent); }

  .sf-timeline { position: relative; display: flex; flex-direction: column; }
  .sf-track { position: absolute; left: 17px; top: 20px; bottom: 20px; width: 2px; background: rgba(0,0,0,.07); border-radius: 2px; overflow: hidden; }
  .sf-track-fill {
    position: absolute; top: 0; left: 0; right: 0; border-radius: 2px;
    background: linear-gradient(to bottom, var(--accent), rgba(var(--arc),.35));
    box-shadow: 0 0 8px rgba(var(--arc),.2);
    transition: height 2.2s cubic-bezier(.22,1,.36,1);
  }
  .sf-track-p {
    position: absolute; left: 50%; transform: translateX(-50%);
    width: 2px; height: 10px;
    background: linear-gradient(to bottom, transparent, var(--accent), transparent);
    border-radius: 2px; animation: sfPflow 2.8s linear infinite; opacity: 0;
  }
  .sf-track-p:nth-child(3) { animation-delay: .9s; }
  .sf-track-p:nth-child(4) { animation-delay: 1.8s; }
  @keyframes sfPflow {
    0%   { top: 0; opacity: 0; }
    8%   { opacity: 1; }
    92%  { opacity: .5; }
    100% { top: 100%; opacity: 0; }
  }

  .sf-step { display: flex; gap: 22px; padding-bottom: 26px; position: relative; z-index: 1; opacity: 0; transform: translateX(-16px); }
  .sf-step:last-child { padding-bottom: 0; }
  .sf-step.on { animation: sfStepIn .75s cubic-bezier(.22,1,.36,1) forwards; }
  @keyframes sfStepIn { to { opacity: 1; transform: translateX(0); } }

  .sf-node { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative; font-size: 12px; }
  .sf-node.pending { background: #f3f4f6; border: 1.5px solid #e5e7eb; color: #d1d5db; }
  .sf-node.done { background: rgba(var(--arc),.1); border: 1.5px solid rgba(var(--arc),.3); color: var(--accent); }
  .sf-node.done::after { content: ''; position: absolute; inset: -6px; border-radius: 50%; border: 1px solid rgba(var(--arc),.12); animation: sfRingOut 3.5s ease-in-out infinite; }
  @keyframes sfRingOut { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(1.8);opacity:0} }
  .sf-node.active {
    background: rgba(var(--arc),.1); border: 2px solid var(--accent); color: var(--accent);
    animation: sfIconPulse 2.5s ease-in-out infinite;
    box-shadow: 0 0 0 5px rgba(var(--arc),.07), 0 0 16px rgba(var(--arc),.12);
  }
  .sf-node.active::before { content: ''; position: absolute; inset: -9px; border-radius: 50%; border: 1.5px solid transparent; border-top-color: var(--accent); animation: sfSpin 2.5s linear infinite; }
  .sf-node.active::after { content: ''; position: absolute; inset: -16px; border-radius: 50%; border: 1px solid transparent; border-bottom-color: rgba(var(--arc),.3); animation: sfSpin 4s linear infinite reverse; }

  .sf-step-body { padding-top: 7px; flex: 1; }
  .sf-step-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
  .sf-step-name { font-size: 14px; font-weight: 600; color: #111827; display: flex; align-items: center; gap: 8px; }
  .sf-step-name.dim { color: #d1d5db; font-weight: 400; }
  .sf-step-code { font-family: 'Space Mono', monospace; font-size: 8px; letter-spacing: 2px; color: rgba(var(--arc),.4); }
  .sf-step-sub { font-size: 12px; color: #9ca3af; line-height: 1.5; }
  .sf-step-sub.lit { color: #6b7280; }

  .sf-badge {
    font-family: 'Space Mono', monospace; font-size: 7px; letter-spacing: 2px;
    background: var(--accent); color: #fff; padding: 2px 8px; border-radius: 100px; font-weight: 700;
    animation: sfBadgePop 2s ease-in-out infinite;
  }
  @keyframes sfBadgePop { 0%,100%{opacity:1} 50%{opacity:.7} }

  /* DETAIL */
  .sf-detail { padding: 20px 34px; border-bottom: 1px solid rgba(0,0,0,.05); opacity: 0; animation: sfFadeIn .8s ease 2.4s forwards; }
  .sf-drow { display: grid; grid-template-columns: 88px 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(0,0,0,.04); }
  .sf-drow:last-child { border-bottom: none; }
  .sf-dk { font-family: 'Space Mono', monospace; font-size: 7px; letter-spacing: 2.5px; text-transform: uppercase; color: #9ca3af; padding-top: 1px; }
  .sf-dv { font-size: 12px; color: #6b7280; line-height: 1.6; }

  /* CTA */
  .sf-cta { padding: 20px 34px; opacity: 0; animation: sfFadeIn .8s ease 2.7s forwards; }
  .sf-wa {
    display: flex; align-items: center; justify-content: center; gap: 10px;
    background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff;
    padding: 15px; border-radius: 12px; font-size: 13px; font-weight: 600;
    text-decoration: none;
    box-shadow: 0 4px 20px rgba(34,197,94,.2), 0 1px 3px rgba(0,0,0,.08);
    transition: transform .2s, box-shadow .2s;
    position: relative; overflow: hidden;
  }
  .sf-wa::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg,rgba(255,255,255,.15) 0%,transparent 50%); pointer-events: none; }
  .sf-wa:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(34,197,94,.3),0 2px 6px rgba(0,0,0,.1); }

  /* FOOTER */
  .sf-footer { margin-top: 36px; text-align: center; opacity: 0; animation: sfFadeIn .8s ease 2.9s forwards; }
  .sf-footer p { font-family: 'Space Mono', monospace; font-size: 8px; letter-spacing: 4px; text-transform: uppercase; color: #1a1f27; }

  /* NOT FOUND */
  .sf-nf { text-align: center; padding: 100px 20px; opacity: 0; animation: sfFadeIn .8s ease .3s forwards; }
  .sf-nf-code { font-family: 'Syne', sans-serif; font-size: 72px; font-weight: 900; color: rgba(var(--arc),.12); line-height: 1; margin-bottom: 20px; }
  .sf-nf-title { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 8px; }
  .sf-nf-sub { font-size: 13px; color: #6b7280; margin-bottom: 30px; }
  .sf-nf-link {
    display: inline-flex; align-items: center; gap: 8px;
    background: #f3f4f6; border: 1px solid #e5e7eb; color: #374151;
    padding: 10px 24px; border-radius: 100px; font-size: 13px; text-decoration: none; transition: all .2s;
  }
  .sf-nf-link:hover { background: #e5e7eb; color: var(--accent); }

  @keyframes sfFadeIn { to { opacity: 1; } }

  @media (max-width: 480px) {
    .sf-page { padding: 32px 14px 80px; }
    .sf-hdr, .sf-tl { padding: 22px 20px; }
    .sf-detail, .sf-cta { padding: 16px 20px; }
    .sf-folio-id { font-size: 22px; }
    .sf-client-name { font-size: 12px; }
  }
`

export default function SeguimientoClient({ lead, folio }: { lead: Lead | null; folio: string }) {
  const [steps, setSteps] = useState<boolean[]>([false, false, false, false])
  const [lineH, setLineH] = useState('0%')
  const [ready, setReady] = useState(false)
  const canvasRef         = useRef<HTMLCanvasElement>(null)

  const estado = lead?.estado ?? 'nuevo'
  const idx    = ESTADO_IDX[estado] ?? 0
  const accent = getAccent(lead?.servicio ?? null)
  const step   = STEPS[idx]

  // Floating particles (soft, light-theme)
  useEffect(() => {
    setReady(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let W = (canvas.width = window.innerWidth)
    let H = (canvas.height = window.innerHeight)
    const onResize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    const COLORS = [
      `rgba(${accent.rgb},`,
      'rgba(139,92,246,',
      'rgba(168,85,247,',
    ]

    type Pt = { x: number; y: number; r: number; o: number; vx: number; vy: number; tw: number; spd: number; ci: number }
    const pts: Pt[] = Array.from({ length: 55 }, (_, i) => ({
      x:   Math.random() * 1600,
      y:   Math.random() * 900,
      r:   Math.random() * 2.5 + 0.8,
      o:   Math.random() * 0.12 + 0.04,
      vx:  (Math.random() - .5) * .25,
      vy:  (Math.random() - .5) * .25,
      tw:  Math.random() * Math.PI * 2,
      spd: Math.random() * .008 + .003,
      ci:  i % COLORS.length,
    }))

    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      pts.forEach(p => {
        p.tw += p.spd; p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        const a = p.o * (0.5 + 0.5 * Math.sin(p.tw))
        ctx.beginPath()
        ctx.arc((p.x / 1600) * W, (p.y / 900) * H, p.r, 0, Math.PI * 2)
        ctx.fillStyle = COLORS[p.ci] + a + ')'
        ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])

  // Staggered step reveals + timeline fill
  useEffect(() => {
    if (!ready || !lead) return
    const delays = [750, 1100, 1450, 1800]
    delays.forEach((d, i) =>
      setTimeout(() => setSteps(p => { const n = [...p]; n[i] = true; return n }), d)
    )
    const pct = idx > 0 ? Math.min((idx / 3) * 100, 100) : 0
    setTimeout(() => setLineH(`${pct}%`), 1000)
  }, [ready, lead, idx])

  const dateStr = lead
    ? new Date(lead.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --arc: ${accent.rgb};
          --accent: ${accent.color};
          --accent-soft: ${accent.soft};
          --accent-border: ${accent.border};
        }
      ` }} />

      <canvas ref={canvasRef} id="sf-canvas" />
      <div className="sf-blobs">
        <div className="sf-blob" /><div className="sf-blob" /><div className="sf-blob" />
      </div>

      <div className="sf-page">
        {/* Logo */}
        <div className="sf-logo">
          <div className="sf-logo-text">ARTIA<span className="sf-logo-dot" />STUDIO</div>
          <div className="sf-logo-line" />
        </div>

        {!lead ? (
          <div className="sf-nf">
            <div className="sf-nf-code">404</div>
            <div className="sf-nf-title">Folio no encontrado</div>
            <p className="sf-nf-sub">
              El folio <strong>{folio}</strong> no existe en el sistema.
            </p>
            <a href="https://artiaagency.vercel.app" className="sf-nf-link">← Volver al sitio</a>
          </div>
        ) : (
          <div className="sf-card">
            {/* Corner brackets */}
            <div className="sf-c sf-c-tl" />
            <div className="sf-c sf-c-tr" />
            <div className="sf-c sf-c-bl" />
            <div className="sf-c sf-c-br" />

            {/* Header */}
            <div className="sf-hdr">
              <div className="sf-hdr-glow" />
              <div className="sf-hdr-top">
                <div>
                  <div className="sf-folio-label">
                    <span className="sf-fl-line" />
                    Folio de seguimiento
                  </div>
                  <div className="sf-folio-id" data-text={folio}>
                    {folio.split('').map((ch, i) => (
                      <span key={i} className="sf-ch" style={{ animationDelay: `${0.55 + i * 0.05}s` }}>{ch}</span>
                    ))}
                  </div>
                  {lead.servicio && (
                    <div className="sf-svc">
                      <span className="sf-svc-dot" />
                      {lead.servicio}
                    </div>
                  )}
                </div>
                <div className="sf-client-blk">
                  <div className="sf-client-lbl">Cliente</div>
                  <div className="sf-client-name">{lead.nombre}</div>
                </div>
              </div>

              {/* Status bar */}
              <div className="sf-sbar">
                <div className="sf-sbar-icon">{step?.icon}</div>
                <div className="sf-sbar-text">
                  <div className="sf-sbar-title">{step?.label}</div>
                  <div className="sf-sbar-sub">{step?.sublabel}</div>
                </div>
                <div className="sf-sbar-code">{step?.code}</div>
              </div>
            </div>

            {/* Metrics */}
            <div className="sf-metrics">
              <div className="sf-met">
                <div className="sf-met-k">Progreso</div>
                <div className="sf-met-v hi">{idx + 1} / 4</div>
              </div>
              <div className="sf-met">
                <div className="sf-met-k">Fase</div>
                <div className="sf-met-v">{step?.code}</div>
              </div>
              <div className="sf-met">
                <div className="sf-met-k">Inicio</div>
                <div className="sf-met-v sm">{dateStr}</div>
              </div>
            </div>

            {/* Timeline */}
            <div className="sf-tl">
              <div className="sf-tl-head">
                <div className="sf-tl-head-txt">Línea de tiempo</div>
                <div className="sf-tl-head-line" />
              </div>
              <div className="sf-timeline">
                <div className="sf-track">
                  <div className="sf-track-fill" style={{ height: lineH }} />
                  {idx > 0 && (
                    <>
                      <div className="sf-track-p" />
                      <div className="sf-track-p" />
                      <div className="sf-track-p" />
                    </>
                  )}
                </div>

                {STEPS.map((s, i) => {
                  const done   = i < idx
                  const active = i === idx
                  const pend   = i > idx
                  return (
                    <div key={s.estado} className={`sf-step ${steps[i] ? 'on' : ''}`}>
                      <div className={`sf-node ${done ? 'done' : active ? 'active' : 'pending'}`}>
                        {done ? '✓' : s.icon}
                      </div>
                      <div className="sf-step-body">
                        <div className="sf-step-row">
                          <div className={`sf-step-name ${pend ? 'dim' : ''}`}>
                            {s.label}
                            {active && <span className="sf-badge">EN CURSO</span>}
                          </div>
                          <div className="sf-step-code">{s.code}</div>
                        </div>
                        <div className={`sf-step-sub ${!pend ? 'lit' : ''}`}>{s.sublabel}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Details */}
            <div className="sf-detail">
              {[
                { k: 'Servicio',  v: lead.servicio },
                { k: 'Solicitud', v: lead.mensaje },
                { k: 'Recibido',  v: dateStr },
              ].filter(r => r.v).map(r => (
                <div key={r.k} className="sf-drow">
                  <span className="sf-dk">{r.k}</span>
                  <span className="sf-dv">{r.v}</span>
                </div>
              ))}
            </div>

            {/* WhatsApp CTA */}
            <div className="sf-cta">
              <a
                href={`https://wa.me/593969937265?text=${encodeURIComponent(`Hola Artia, consulto sobre mi pedido con folio ${folio}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="sf-wa"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                Consultar por WhatsApp
              </a>
            </div>
          </div>
        )}

        <div className="sf-footer">
          <p>ARTIA STUDIO · ECUADOR · {new Date().getFullYear()}</p>
        </div>
      </div>
    </>
  )
}
