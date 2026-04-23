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
  {
    estado: 'nuevo',
    label: 'Solicitud recibida',
    sublabel: 'Tu solicitud llegó a nuestro equipo',
    icon: '✦',
  },
  {
    estado: 'contactado',
    label: 'En revisión',
    sublabel: 'Analizamos los detalles de tu proyecto',
    icon: '◈',
  },
  {
    estado: 'en_proceso',
    label: 'En producción',
    sublabel: 'Tu proyecto está siendo desarrollado',
    icon: '⬡',
  },
  {
    estado: 'cerrado',
    label: 'Entregado',
    sublabel: '¡Tu proyecto fue completado con éxito!',
    icon: '★',
  },
]

const ESTADO_IDX: Record<string, number> = {
  nuevo: 0, contactado: 1, en_proceso: 2, cerrado: 3, perdido: 3,
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #000814;
    min-height: 100vh;
    font-family: 'DM Sans', sans-serif;
    overflow-x: hidden;
  }

  /* ── Particles canvas ── */
  #particles-canvas {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  /* ── Mesh gradient ── */
  .mesh-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    background:
      radial-gradient(ellipse 80% 50% at 20% 20%, rgba(0,17,58,0.9) 0%, transparent 60%),
      radial-gradient(ellipse 60% 60% at 80% 80%, rgba(37,82,202,0.15) 0%, transparent 55%),
      radial-gradient(ellipse 40% 40% at 50% 50%, rgba(59,130,246,0.05) 0%, transparent 70%);
    animation: meshPulse 8s ease-in-out infinite alternate;
  }
  @keyframes meshPulse {
    from { opacity: 0.8; }
    to   { opacity: 1; }
  }

  /* ── Grain overlay ── */
  .grain {
    position: fixed;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  }

  /* ── Main container ── */
  .container {
    position: relative;
    z-index: 10;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px 80px;
  }

  /* ── Header logo ── */
  .logo-wrap {
    margin-bottom: 48px;
    opacity: 0;
    transform: translateY(-20px);
    animation: fadeDown 0.8s cubic-bezier(0.22,1,0.36,1) 0.2s forwards;
  }
  .logo-text {
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 6px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
  }
  .logo-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    background: #3b82f6;
    border-radius: 50%;
    margin: 0 8px;
    vertical-align: middle;
    animation: dotPulse 2s ease-in-out infinite;
  }
  @keyframes dotPulse {
    0%,100% { opacity: 1; transform: scale(1); }
    50%      { opacity: 0.4; transform: scale(0.6); }
  }

  /* ── Card ── */
  .card {
    width: 100%;
    max-width: 520px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 24px;
    overflow: hidden;
    backdrop-filter: blur(20px);
    box-shadow:
      0 0 0 1px rgba(59,130,246,0.1),
      0 40px 80px rgba(0,0,0,0.6),
      inset 0 1px 0 rgba(255,255,255,0.06);
    opacity: 0;
    transform: translateY(30px) scale(0.98);
    animation: cardReveal 1s cubic-bezier(0.22,1,0.36,1) 0.4s forwards;
  }
  @keyframes cardReveal {
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* ── Card header ── */
  .card-header {
    padding: 32px 32px 28px;
    position: relative;
    overflow: hidden;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .card-header::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--accent-gradient);
    opacity: 0.12;
  }
  .card-header::after {
    content: '';
    position: absolute;
    top: -60px; right: -60px;
    width: 180px; height: 180px;
    border-radius: 50%;
    background: var(--accent-color);
    opacity: 0.06;
    filter: blur(40px);
  }

  .folio-label {
    font-family: 'DM Mono', monospace;
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
    margin-bottom: 10px;
  }

  .folio-number {
    font-family: 'Syne', sans-serif;
    font-size: 36px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -1px;
    line-height: 1;
    margin-bottom: 6px;
  }
  .folio-char {
    display: inline-block;
    opacity: 0;
    transform: translateY(10px);
    animation: charReveal 0.4s cubic-bezier(0.22,1,0.36,1) forwards;
  }
  @keyframes charReveal {
    to { opacity: 1; transform: translateY(0); }
  }

  .service-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 100px;
    padding: 5px 12px;
    font-size: 11px;
    color: rgba(255,255,255,0.7);
    font-weight: 500;
    margin-top: 10px;
  }
  .service-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--accent-color);
    animation: dotPulse 2s ease-in-out infinite;
  }

  .client-name {
    font-family: 'Syne', sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: rgba(255,255,255,0.9);
    text-align: right;
  }
  .client-label {
    font-size: 10px;
    color: rgba(255,255,255,0.3);
    text-align: right;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-bottom: 4px;
    font-family: 'DM Mono', monospace;
  }

  /* ── Timeline ── */
  .timeline-wrap {
    padding: 36px 32px 32px;
    position: relative;
  }

  .timeline-title {
    font-family: 'DM Mono', monospace;
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.25);
    margin-bottom: 32px;
  }

  .timeline {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* Vertical line */
  .timeline-line {
    position: absolute;
    left: 19px;
    top: 20px;
    bottom: 20px;
    width: 2px;
    background: rgba(255,255,255,0.06);
    border-radius: 2px;
    overflow: hidden;
  }
  .timeline-line-fill {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(to bottom, var(--accent-color), rgba(59,130,246,0.3));
    border-radius: 2px;
    transition: height 1.5s cubic-bezier(0.22,1,0.36,1);
    box-shadow: 0 0 8px var(--accent-color);
  }

  /* Step */
  .step {
    display: flex;
    gap: 20px;
    padding-bottom: 28px;
    position: relative;
    z-index: 1;
    opacity: 0;
    transform: translateX(-12px);
  }
  .step:last-child { padding-bottom: 0; }
  .step.visible {
    animation: stepIn 0.6s cubic-bezier(0.22,1,0.36,1) forwards;
  }
  @keyframes stepIn {
    to { opacity: 1; transform: translateX(0); }
  }

  /* Node */
  .node {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 14px;
    position: relative;
    transition: all 0.5s ease;
  }
  .node.pending {
    background: rgba(255,255,255,0.03);
    border: 1.5px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.2);
  }
  .node.completed {
    background: rgba(var(--accent-rgb), 0.15);
    border: 1.5px solid rgba(var(--accent-rgb), 0.4);
    color: var(--accent-color);
  }
  .node.current {
    background: rgba(var(--accent-rgb), 0.2);
    border: 2px solid var(--accent-color);
    color: var(--accent-color);
    box-shadow: 0 0 0 6px rgba(var(--accent-rgb), 0.08), 0 0 20px rgba(var(--accent-rgb), 0.3);
    animation: nodePulse 2s ease-in-out infinite;
  }
  @keyframes nodePulse {
    0%,100% { box-shadow: 0 0 0 6px rgba(var(--accent-rgb), 0.08), 0 0 20px rgba(var(--accent-rgb), 0.3); }
    50%      { box-shadow: 0 0 0 12px rgba(var(--accent-rgb), 0.04), 0 0 40px rgba(var(--accent-rgb), 0.5); }
  }

  /* Orbital ring for current */
  .node.current::before {
    content: '';
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    border: 1px solid rgba(var(--accent-rgb), 0.2);
    animation: orbitalSpin 4s linear infinite;
    border-top-color: var(--accent-color);
    border-right-color: transparent;
    border-bottom-color: transparent;
    border-left-color: transparent;
  }
  @keyframes orbitalSpin {
    to { transform: rotate(360deg); }
  }

  /* Checkmark for completed */
  .node.completed::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 1px solid rgba(var(--accent-rgb), 0.15);
    animation: ringExpand 3s ease-in-out infinite;
  }
  @keyframes ringExpand {
    0%   { transform: scale(1); opacity: 0.5; }
    100% { transform: scale(1.5); opacity: 0; }
  }

  .step-content {
    padding-top: 8px;
    flex: 1;
  }
  .step-label {
    font-family: 'Syne', sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: rgba(255,255,255,0.9);
    margin-bottom: 3px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .step-label.pending {
    color: rgba(255,255,255,0.25);
    font-weight: 500;
  }
  .step-sublabel {
    font-size: 12px;
    color: rgba(255,255,255,0.35);
    line-height: 1.4;
  }
  .step-sublabel.active {
    color: rgba(255,255,255,0.6);
  }

  .badge-current {
    font-family: 'DM Mono', monospace;
    font-size: 9px;
    font-weight: 500;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    background: var(--accent-color);
    color: #fff;
    padding: 2px 8px;
    border-radius: 100px;
    animation: badgeBlink 2s ease-in-out infinite;
  }
  @keyframes badgeBlink {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.7; }
  }

  /* ── Detail section ── */
  .detail-section {
    padding: 0 32px 32px;
    border-top: 1px solid rgba(255,255,255,0.05);
    margin-top: 4px;
    padding-top: 24px;
    opacity: 0;
    animation: fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 1.8s forwards;
  }
  @keyframes fadeUp {
    to { opacity: 1; }
  }

  .detail-row {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .detail-row:last-child { border-bottom: none; }
  .detail-key {
    font-family: 'DM Mono', monospace;
    font-size: 9px;
    font-weight: 400;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.25);
    padding-top: 1px;
  }
  .detail-val {
    font-size: 13px;
    color: rgba(255,255,255,0.7);
    line-height: 1.5;
  }

  /* ── WhatsApp CTA ── */
  .cta-wrap {
    padding: 0 32px 32px;
    opacity: 0;
    animation: fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 2s forwards;
  }
  .cta-wa {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: linear-gradient(135deg, #1a8a4a 0%, #25D366 100%);
    color: #fff;
    padding: 15px;
    border-radius: 14px;
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-decoration: none;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 4px 20px rgba(37,211,102,0.25);
  }
  .cta-wa:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(37,211,102,0.4);
  }

  /* ── Footer ── */
  .footer {
    margin-top: 32px;
    text-align: center;
    opacity: 0;
    animation: fadeUp 0.8s ease 2.2s forwards;
  }
  .footer p {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    color: rgba(255,255,255,0.15);
    text-transform: uppercase;
  }

  /* ── Not found ── */
  .not-found {
    text-align: center;
    padding: 80px 20px;
    opacity: 0;
    animation: fadeUp 0.8s ease 0.3s forwards;
  }
  .not-found h2 {
    font-family: 'Syne', sans-serif;
    font-size: 22px;
    font-weight: 800;
    color: rgba(255,255,255,0.8);
    margin: 16px 0 8px;
  }
  .not-found p {
    font-size: 14px;
    color: rgba(255,255,255,0.35);
    margin-bottom: 28px;
  }
  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.7);
    padding: 10px 20px;
    border-radius: 100px;
    font-size: 13px;
    text-decoration: none;
    transition: background 0.2s;
  }
  .back-btn:hover { background: rgba(255,255,255,0.1); }

  @keyframes fadeDown {
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 480px) {
    .card-header { padding: 24px 22px 20px; }
    .timeline-wrap { padding: 28px 22px 24px; }
    .detail-section { padding: 20px 22px 24px; }
    .cta-wrap { padding: 0 22px 24px; }
    .folio-number { font-size: 28px; }
  }
`

// Accent colors per service
function getAccent(servicio: string | null): { color: string; rgb: string; gradient: string } {
  const s = (servicio ?? '').toLowerCase()
  if (s.includes('impres') || s.includes('sublim') || s.includes('papel'))
    return { color: '#f59e0b', rgb: '245,158,11', gradient: 'linear-gradient(135deg,#92400e,#f59e0b)' }
  if (s.includes('foto') || s.includes('video') || s.includes('drone'))
    return { color: '#a855f7', rgb: '168,85,247', gradient: 'linear-gradient(135deg,#581c87,#a855f7)' }
  if (s.includes('market') || s.includes('redes') || s.includes('social'))
    return { color: '#10b981', rgb: '16,185,129', gradient: 'linear-gradient(135deg,#065f46,#10b981)' }
  if (s.includes('brand') || s.includes('logo') || s.includes('identidad'))
    return { color: '#f43f5e', rgb: '244,63,94', gradient: 'linear-gradient(135deg,#881337,#f43f5e)' }
  return { color: '#3b82f6', rgb: '59,130,246', gradient: 'linear-gradient(135deg,#1e3a8a,#3b82f6)' }
}

export default function SeguimientoClient({ lead, folio }: { lead: Lead | null; folio: string }) {
  const [stepsVisible, setStepsVisible]   = useState<boolean[]>([false, false, false, false])
  const [lineHeight, setLineHeight]       = useState('0%')
  const [mounted, setMounted]             = useState(false)
  const canvasRef                         = useRef<HTMLCanvasElement>(null)

  const estadoActual = lead?.estado ?? 'nuevo'
  const currentIdx   = ESTADO_IDX[estadoActual] ?? 0
  const accent       = getAccent(lead?.servicio ?? null)

  // Particles animation
  useEffect(() => {
    setMounted(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = canvas.width  = window.innerWidth
    let H = canvas.height = window.innerHeight
    window.addEventListener('resize', () => {
      W = canvas.width  = window.innerWidth
      H = canvas.height = window.innerHeight
    })

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      o: Math.random() * 0.4 + 0.1,
    }))

    let raf: number
    function draw() {
      ctx!.clearRect(0, 0, W, H)
      particles.forEach(p => {
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(59,130,246,${p.o})`
        ctx!.fill()
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = W
        if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H
        if (p.y > H) p.y = 0
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])

  // Staggered step reveal + line fill
  useEffect(() => {
    if (!mounted || !lead) return
    const delays = [600, 900, 1200, 1500]
    delays.forEach((delay, i) => {
      setTimeout(() => {
        setStepsVisible(prev => {
          const next = [...prev]
          next[i] = true
          return next
        })
      }, delay)
    })
    // Line fill
    const totalSteps   = 3  // gaps between 4 nodes
    const filledSteps  = Math.min(currentIdx, totalSteps)
    const fillPct      = totalSteps > 0 ? (filledSteps / totalSteps) * 100 : 0
    setTimeout(() => setLineHeight(`${fillPct}%`), 800)
  }, [mounted, lead, currentIdx])

  const folioChars = folio.split('')

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --accent-color: ${accent.color};
          --accent-rgb: ${accent.rgb};
          --accent-gradient: ${accent.gradient};
        }
      `}} />

      <canvas ref={canvasRef} id="particles-canvas" />
      <div className="mesh-bg" />
      <div className="grain" />

      <div className="container">
        {/* Logo */}
        <div className="logo-wrap">
          <span className="logo-text">
            ARTIA<span className="logo-dot" />STUDIO
          </span>
        </div>

        {!lead ? (
          <div className="not-found">
            <div style={{ fontSize: 48, marginBottom: 8 }}>◎</div>
            <h2>Folio no encontrado</h2>
            <p>El folio <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{folio}</strong> no existe en nuestro sistema.</p>
            <a href="https://artiaagency.vercel.app" className="back-btn">
              ← Volver al sitio
            </a>
          </div>
        ) : (
          <div className="card">
            {/* Header */}
            <div className="card-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="folio-label">Folio de seguimiento</div>
                  <div className="folio-number" aria-label={folio}>
                    {folioChars.map((ch, i) => (
                      <span key={i} className="folio-char" style={{ animationDelay: `${0.5 + i * 0.05}s` }}>
                        {ch}
                      </span>
                    ))}
                  </div>
                  {lead.servicio && (
                    <div className="service-tag">
                      <span className="service-dot" />
                      {lead.servicio}
                    </div>
                  )}
                </div>
                <div>
                  <div className="client-label">Cliente</div>
                  <div className="client-name">{lead.nombre}</div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="timeline-wrap">
              <div className="timeline-title">Estado del pedido</div>
              <div className="timeline">
                {/* Vertical line */}
                <div className="timeline-line">
                  <div className="timeline-line-fill" style={{ height: lineHeight }} />
                </div>

                {STEPS.map((step, idx) => {
                  const isCompleted = idx < currentIdx
                  const isCurrent   = idx === currentIdx
                  const isPending   = idx > currentIdx
                  const nodeClass   = isCurrent ? 'current' : isCompleted ? 'completed' : 'pending'
                  const labelClass  = isPending ? 'pending' : ''
                  const subClass    = (isCurrent || isCompleted) ? 'active' : ''

                  return (
                    <div key={step.estado} className={`step ${stepsVisible[idx] ? 'visible' : ''}`}
                      style={{ animationDelay: `${0.05 * idx}s` }}>
                      <div className={`node ${nodeClass}`}>
                        {step.icon}
                      </div>
                      <div className="step-content">
                        <div className={`step-label ${labelClass}`}>
                          {step.label}
                          {isCurrent && <span className="badge-current">Actual</span>}
                        </div>
                        <div className={`step-sublabel ${subClass}`}>{step.sublabel}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Detail */}
            <div className="detail-section">
              {[
                { key: 'Servicio',  val: lead.servicio },
                { key: 'Solicitud', val: lead.mensaje },
                { key: 'Recibido',  val: new Date(lead.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' }) },
              ].filter(r => r.val).map(row => (
                <div key={row.key} className="detail-row">
                  <span className="detail-key">{row.key}</span>
                  <span className="detail-val">{row.val}</span>
                </div>
              ))}
            </div>

            {/* WhatsApp CTA */}
            <div className="cta-wrap">
              <a
                href={`https://wa.me/593969937265?text=${encodeURIComponent(`Hola Artia, consulto sobre mi pedido con folio ${folio}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cta-wa"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Consultar por WhatsApp
              </a>
            </div>
          </div>
        )}

        <div className="footer">
          <p>Artia Studio · Ecuador · {new Date().getFullYear()}</p>
        </div>
      </div>
    </>
  )
}
