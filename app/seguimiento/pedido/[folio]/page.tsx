// app/seguimiento/pedido/[folio]/page.tsx
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

function getSupabasePublic() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ folio: string }>
}): Promise<Metadata> {
  const { folio } = await params
  return {
    title: `Seguimiento ${folio.toUpperCase()} — Artia Studio`,
    description: 'Consulta el estado de tu pedido',
  }
}

// ─── Timeline steps (horizontal) ───
const ORDER_STEPS = [
  { status: 'pending',       label: 'Pedido recibido',     sublabel: 'Hemos recibido tu orden',           icon: '◎', code: 'RECV' },
  { status: 'confirmed',     label: 'Confirmado',          sublabel: 'Pago verificado, preparando todo',  icon: '◈', code: 'CONF' },
  { status: 'in_production', label: 'En producción',       sublabel: 'Tu producto está siendo creado',   icon: '⬡', code: 'PROD' },
  { status: 'shipped',       label: 'Enviado',             sublabel: 'En camino a tu dirección',          icon: '✈', code: 'SHIP' },
  { status: 'delivered',     label: 'Entregado',           sublabel: '¡Producto recibido con éxito!',     icon: '★', code: 'DONE' },
]

const STATUS_IDX: Record<string, number> = {
  pending: 0, confirmed: 1, in_production: 2, shipped: 3, delivered: 4, cancelled: 4, refunded: 4,
}

const STATUS_LABELS: Record<string, { label: string; color: string; rgb: string }> = {
  pending:       { label: 'Pendiente',       color: '#92400e', rgb: '146,64,14' },
  confirmed:     { label: 'Confirmado',      color: '#1e40af', rgb: '30,64,175' },
  in_production: { label: 'En Producción',   color: '#6b21a8', rgb: '107,33,168' },
  shipped:       { label: 'Enviado',         color: '#0e7490', rgb: '14,116,144' },
  delivered:     { label: 'Entregado',       color: '#166534', rgb: '22,101,52' },
  cancelled:     { label: 'Cancelado',       color: '#991b1b', rgb: '153,27,27' },
  refunded:      { label: 'Reembolsado',     color: '#6b7280', rgb: '107,114,128' },
}

function getAccent(status: string | null) {
  const s = status ?? 'pending'
  const mapped = STATUS_LABELS[s] || STATUS_LABELS.pending
  return {
    color: mapped.color,
    rgb: mapped.rgb,
    soft: `rgba(${mapped.rgb},.1)`,
    border: `rgba(${mapped.rgb},.2)`,
  }
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

export default async function SeguimientoPedidoPage({
  params,
}: {
  params: Promise<{ folio: string }>
}) {
  const { folio } = await params
  const supabase = getSupabasePublic()

  const { data: order } = await supabase
    .from('landing_orders')
    .select('*, landing:landing_id(name, slug)')
    .eq('folio', folio.toUpperCase())
    .maybeSingle()

  if (!order) return notFound()

  const accent = getAccent(order.status)
  const currentStepIdx = STATUS_IDX[order.status] ?? 0
  const currentStep = ORDER_STEPS[currentStepIdx] || ORDER_STEPS[0]
  const isFinished = ['delivered', 'cancelled', 'refunded'].includes(order.status)
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded'

  const currentStatus = STATUS_LABELS[order.status] || STATUS_LABELS.pending

  // Historial simulado basado en el estado actual
  const historyItems = [
    { icon: '◎', label: 'Pedido recibido', date: order.created_at, done: true },
    ...(currentStepIdx >= 1 ? [{ icon: '◈', label: 'Pedido confirmado', date: order.updated_at || order.created_at, done: true }] : []),
    ...(currentStepIdx >= 2 ? [{ icon: '⬡', label: 'En producción', date: order.updated_at || order.created_at, done: true }] : []),
    ...(currentStepIdx >= 3 ? [{ icon: '✈', label: 'Enviado', date: order.updated_at || order.created_at, done: true }] : []),
    ...(currentStepIdx >= 4 ? [{ icon: '★', label: 'Entregado', date: order.updated_at || order.created_at, done: true }] : []),
  ]

  return (
    <div className="order-track-page">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --arc: ${accent.rgb};
          --accent: ${accent.color};
          --accent-soft: ${accent.soft};
          --accent-border: ${accent.border};
        }
      ` }} />

      {/* Background blobs */}
      <div className="ot-blobs">
        <div className="ot-blob" />
        <div className="ot-blob" />
        <div className="ot-blob" />
      </div>

      <div className="ot-container">
        {/* Header / Brand */}
        <div className="ot-header">
          <div className="ot-brand">
            <span className="ot-brand-text">ARTIA<span className="ot-brand-dot" />STUDIO</span>
          </div>
          <div className="ot-track-label">Seguimiento de pedido</div>
        </div>

        {/* Main Card */}
        <div className="ot-card">
          {/* Corner brackets */}
          <div className="ot-c ot-c-tl" />
          <div className="ot-c ot-c-tr" />
          <div className="ot-c ot-c-bl" />
          <div className="ot-c ot-c-br" />

          {/* Card Header */}
          <div className="ot-card-hdr">
            <div className="ot-hdr-glow" />
            <div className="ot-hdr-top">
              <div>
                <div className="ot-folio-label">
                  <span className="ot-fl-line" />
                  Pedido
                </div>
                <div className="ot-folio-id" data-text={order.folio}>
                  {order.folio?.split('').map((ch: string, i: number) => (
                    <span key={i} className="ot-ch" style={{ animationDelay: `${0.55 + i * 0.05}s` }}>{ch}</span>
                  )) || '—'}
                </div>
                {order.product_name && (
                  <div className="ot-svc">
                    <span className="ot-svc-dot" />
                    {order.product_name}
                  </div>
                )}
              </div>
              <div className="ot-client-blk">
                <div className="ot-client-lbl">Cliente</div>
                <div className="ot-client-name">{order.name}</div>
                <div className="ot-client-phone">{order.phone}</div>
                {order.email && <div className="ot-client-phone">{order.email}</div>}
              </div>
            </div>

            {/* Status bar */}
            <div className="ot-sbar">
              <div className={`ot-sbar-icon ${isCancelled ? 'cancelled' : ''}`}>
                {isCancelled ? '✕' : currentStep?.icon}
              </div>
              <div className="ot-sbar-text">
                <div className="ot-sbar-title">
                  {isCancelled ? currentStatus.label : currentStep?.label}
                </div>
                <div className="ot-sbar-sub">
                  {isCancelled ? 'Este pedido ha sido cancelado' : currentStep?.sublabel}
                </div>
              </div>
              <div className="ot-sbar-code">{currentStep?.code}</div>
            </div>
          </div>

          {/* Metrics */}
          <div className="ot-metrics">
            <div className="ot-met">
              <div className="ot-met-k">Progreso</div>
              <div className="ot-met-v hi">{isCancelled ? '—' : `${currentStepIdx + 1} / ${ORDER_STEPS.length}`}</div>
            </div>
            <div className="ot-met">
              <div className="ot-met-k">Estado</div>
              <div className="ot-met-v">{currentStatus.label}</div>
            </div>
            <div className="ot-met">
              <div className="ot-met-k">Total</div>
              <div className="ot-met-v hi">{fmtMoney(order.total || 0)}</div>
            </div>
            <div className="ot-met">
              <div className="ot-met-k">Cantidad</div>
              <div className="ot-met-v">{order.quantity || 1}</div>
            </div>
            <div className="ot-met">
              <div className="ot-met-k">Fecha</div>
              <div className="ot-met-v sm">
                {new Date(order.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
              </div>
            </div>
          </div>

          {/* ─── HORIZONTAL TIMELINE ─── */}
          <div className="ot-timeline-section">
            <div className="ot-tl-head">
              <div className="ot-tl-head-txt">Seguimiento del pedido</div>
              <div className="ot-tl-head-line" />
            </div>
            
            <div className="ot-timeline-h">
              {/* Track line */}
              <div className="ot-track-h">
                <div 
                  className="ot-track-fill-h" 
                  style={{ 
                    width: isCancelled ? '100%' : `${Math.min((currentStepIdx / (ORDER_STEPS.length - 1)) * 100, 100)}%` 
                  }} 
                />
              </div>

              {/* Steps */}
              <div className="ot-steps-h">
                {ORDER_STEPS.map((step, i) => {
                  const done = i < currentStepIdx && !isCancelled
                  const active = i === currentStepIdx && !isCancelled
                  const pend = i > currentStepIdx && !isCancelled
                  const cancelledAt = isCancelled && i === 0

                  return (
                    <div key={step.status} className={`ot-step-h ${done ? 'done' : active ? 'active' : ''} ${cancelledAt ? 'cancelled-step' : ''}`}>
                      <div className={`ot-node-h ${done ? 'done' : active ? 'active' : pend ? 'pending' : cancelledAt ? 'cancelled' : ''}`}>
                        {done ? '✓' : cancelledAt ? '✕' : step.icon}
                      </div>
                      <div className="ot-step-info">
                        <div className={`ot-step-name ${pend && !cancelledAt ? 'dim' : ''}`}>
                          {step.label}
                          {active && <span className="ot-badge">EN CURSO</span>}
                        </div>
                        <div className={`ot-step-sub ${!pend || cancelledAt ? 'lit' : ''}`}>
                          {cancelledAt ? 'Pedido cancelado' : step.sublabel}
                        </div>
                        <div className="ot-step-code">{step.code}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ─── HISTORIAL CON ANIMACIONES ─── */}
          <div className="ot-history-section">
            <div className="ot-section-head">
              <div className="ot-section-line" />
              <span className="ot-section-title">Historial</span>
              <div className="ot-section-line" style={{ flex: 1 }} />
            </div>

            <div className="ot-history-list">
              {historyItems.map((item, i) => (
                <div key={i} className="ot-history-item" style={{ animationDelay: `${2.4 + i * 0.15}s` }}>
                  <div className="ot-history-node">{item.icon}</div>
                  <div className="ot-history-content">
                    <div className="ot-history-label">{item.label}</div>
                    <div className="ot-history-date">
                      {new Date(item.date).toLocaleDateString('es-EC', { 
                        day: '2-digit', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="ot-history-status">✓</div>
                </div>
              ))}
              {isCancelled && (
                <div className="ot-history-item cancelled" style={{ animationDelay: `${2.4 + historyItems.length * 0.15}s` }}>
                  <div className="ot-history-node" style={{ color: '#ef4444' }}>✕</div>
                  <div className="ot-history-content">
                    <div className="ot-history-label" style={{ color: '#ef4444' }}>Pedido cancelado</div>
                    <div className="ot-history-date">Este pedido ha sido cancelado o reembolsado</div>
                  </div>
                  <div className="ot-history-status" style={{ color: '#ef4444' }}>✕</div>
                </div>
              )}
            </div>
          </div>

          {/* ─── INFO DEL PEDIDO ─── */}
          <div className="ot-info-section">
            <div className="ot-section-head">
              <div className="ot-section-line" />
              <span className="ot-section-title">Detalles del pedido</span>
              <div className="ot-section-line" style={{ flex: 1 }} />
            </div>

            <div className="ot-info-grid">
              <div className="ot-info-card">
                <div className="ot-info-label">Producto</div>
                <div className="ot-info-value">{order.product_name || '—'}</div>
              </div>
              <div className="ot-info-card">
                <div className="ot-info-label">Landing</div>
                <div className="ot-info-value">{order.landing?.name || '—'}</div>
              </div>
              <div className="ot-info-card">
                <div className="ot-info-label">Cantidad</div>
                <div className="ot-info-value">{order.quantity || 1}</div>
              </div>
              <div className="ot-info-card">
                <div className="ot-info-label">Total</div>
                <div className="ot-info-value hi">{fmtMoney(order.total || 0)}</div>
              </div>
            </div>

            {order.tracking_number && (
              <div className="ot-tracking-box">
                <div className="ot-tracking-label">📦 Tracking</div>
                <div className="ot-tracking-number">{order.tracking_number}</div>
                {order.tracking_url && (
                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="ot-tracking-link">
                    Seguir envío →
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="ot-footer">
          <p>ARTIA STUDIO · ECUADOR · {new Date().getFullYear()}</p>
          <p style={{ marginTop: 8, fontSize: '9px', opacity: 0.6 }}>
            ¿Dudas? Escríbenos por{' '}
            <a href="https://wa.me/593969937265" style={{ color: 'inherit', textDecoration: 'underline' }}>
              WhatsApp
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── CSS COMPLETO (idéntico al admin + secciones nuevas) ───
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=Space+Mono:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .order-track-page {
    background: #f9fafb;
    min-height: 100vh;
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
    position: relative;
    overflow-x: hidden;
  }

  /* ─── Background blobs ─── */
  .ot-blobs { position: fixed; inset: 0; z-index: 0; pointer-events: none; overflow: hidden; }
  .ot-blob {
    position: absolute; border-radius: 50%;
    filter: blur(80px); opacity: 0;
    animation: otBlobMove 16s ease-in-out infinite;
  }
  .ot-blob:nth-child(1) {
    width: 600px; height: 400px; top: -5%; left: -10%;
    background: radial-gradient(ellipse, rgba(var(--arc), .1) 0%, transparent 70%);
  }
  .ot-blob:nth-child(2) {
    width: 500px; height: 500px; bottom: 0; right: -10%;
    background: radial-gradient(ellipse, rgba(var(--arc), .07) 0%, transparent 70%);
    animation-delay: -8s;
  }
  .ot-blob:nth-child(3) {
    width: 400px; height: 300px; top: 40%; left: 30%;
    background: radial-gradient(ellipse, rgba(236,72,153,.04) 0%, transparent 70%);
    animation-delay: -4s; animation-duration: 20s;
  }
  @keyframes otBlobMove {
    0%   { opacity: 0; transform: translate(0,0) scale(1); }
    15%  { opacity: 1; }
    50%  { transform: translate(30px,-20px) scale(1.06); }
    85%  { opacity: 0.6; }
    100% { opacity: 0; transform: translate(0,0) scale(1); }
  }

  /* ─── Container ─── */
  .ot-container {
    position: relative; z-index: 10;
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 20px 80px;
  }

  /* ─── Header ─── */
  .ot-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-bottom: 32px;
  }
  .ot-brand {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .ot-brand-text {
    font-family: 'Syne', sans-serif;
    font-size: 13px; font-weight: 800;
    letter-spacing: 6px; text-transform: uppercase;
    color: #9ca3af;
  }
  .ot-brand-dot {
    display: inline-block; width: 5px; height: 5px; border-radius: 50%;
    background: var(--accent); margin: 0 6px; vertical-align: middle;
    animation: otBlink 2s ease-in-out infinite;
  }
  @keyframes otBlink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.3;transform:scale(.5)} }
  .ot-track-label {
    font-family: 'Space Mono', monospace;
    font-size: 9px; letter-spacing: 4px; text-transform: uppercase;
    color: #cbd5e1;
  }

  /* ─── Card ─── */
  .ot-card {
    background: #ffffff;
    border: 1px solid rgba(0,0,0,.07);
    border-radius: 22px; overflow: visible;
    box-shadow:
      0 0 0 1px rgba(var(--arc),.07),
      0 4px 6px rgba(0,0,0,.03),
      0 20px 60px rgba(var(--arc),.06),
      0 60px 100px rgba(0,0,0,.05);
    position: relative;
    animation: otCardUp 1.1s cubic-bezier(.22,1,.36,1) .3s forwards;
    opacity: 0; transform: translateY(40px) scale(.97);
  }
  @keyframes otCardUp { to { opacity: 1; transform: translateY(0) scale(1); } }

  /* Corner brackets */
  .ot-c { position: absolute; width: 12px; height: 12px; opacity: .4; z-index: 5; }
  .ot-c-tl { top: 12px; left: 12px; border-top: 1.5px solid var(--accent); border-left: 1.5px solid var(--accent); border-radius: 3px 0 0 0; }
  .ot-c-tr { top: 12px; right: 12px; border-top: 1.5px solid var(--accent); border-right: 1.5px solid var(--accent); border-radius: 0 3px 0 0; }
  .ot-c-bl { bottom: 12px; left: 12px; border-bottom: 1.5px solid var(--accent); border-left: 1.5px solid var(--accent); border-radius: 0 0 0 3px; }
  .ot-c-br { bottom: 12px; right: 12px; border-bottom: 1.5px solid var(--accent); border-right: 1.5px solid var(--accent); border-radius: 0 0 3px 0; }

  /* ─── Card Header ─── */
  .ot-card-hdr {
    padding: 34px 34px 28px;
    position: relative; overflow: hidden;
    border-bottom: 1px solid rgba(0,0,0,.05);
    border-radius: 22px 22px 0 0;
  }
  .ot-hdr-glow {
    position: absolute; top: -80px; right: -80px;
    width: 280px; height: 280px; border-radius: 50%;
    background: radial-gradient(ellipse, rgba(var(--arc),.09) 0%, transparent 65%);
    pointer-events: none;
    animation: otGlowPulse 5s ease-in-out infinite;
  }
  @keyframes otGlowPulse { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.2);opacity:1} }
  .ot-hdr-top { display: flex; justify-content: space-between; align-items: flex-start; }

  .ot-folio-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px; letter-spacing: 4px; text-transform: uppercase;
    color: var(--accent); margin-bottom: 10px;
    display: flex; align-items: center; gap: 8px;
    opacity: 0; animation: otFadeIn .6s ease .8s forwards;
  }
  .ot-fl-line { width: 16px; height: 1px; background: var(--accent); opacity: .5; }

  .ot-folio-id {
    font-family: 'Syne', sans-serif;
    font-size: 28px; font-weight: 800;
    color: #111827; letter-spacing: 1px; line-height: 1;
    position: relative;
  }
  .ot-ch {
    display: inline-block; opacity: 0; transform: translateY(10px);
    animation: otCharIn .4s cubic-bezier(.22,1,.36,1) forwards;
  }
  @keyframes otCharIn { to { opacity: 1; transform: translateY(0); } }
  @keyframes otFadeIn { to { opacity: 1; } }

  .ot-svc {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--accent-soft); border: 1px solid var(--accent-border);
    border-radius: 100px; padding: 5px 13px; margin-top: 12px;
    font-size: 11px; font-weight: 500; color: var(--accent); letter-spacing: .3px;
    opacity: 0; animation: otFadeIn .6s ease 1.5s forwards;
  }
  .ot-svc-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); animation: otBlink 2s ease-in-out infinite; }

  .ot-client-blk { text-align: right; opacity: 0; animation: otFadeIn .6s ease 1s forwards; }
  .ot-client-lbl {
    font-family: 'Space Mono', monospace;
    font-size: 7px; letter-spacing: 3px; text-transform: uppercase;
    color: #9ca3af; margin-bottom: 4px;
  }
  .ot-client-name {
    font-family: 'Syne', sans-serif;
    font-size: 17px; font-weight: 700; color: #111827; letter-spacing: .3px;
  }
  .ot-client-phone {
    font-family: 'Space Mono', monospace;
    font-size: 11px; color: #6b7280; margin-top: 4px;
  }

  /* Status bar */
  .ot-sbar {
    display: flex; align-items: center; gap: 12px;
    background: var(--accent-soft); border: 1px solid var(--accent-border);
    border-radius: 12px; padding: 12px 15px; margin-top: 20px;
    opacity: 0; animation: otFadeIn .6s ease 1.6s forwards;
  }
  .ot-sbar-icon {
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(var(--arc),.12); border: 1.5px solid rgba(var(--arc),.25);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; color: var(--accent);
    position: relative; flex-shrink: 0;
    animation: otIconPulse 3s ease-in-out infinite 2s;
  }
  .ot-sbar-icon.cancelled {
    background: rgba(239,68,68,.1); border-color: rgba(239,68,68,.3); color: #ef4444;
    animation: none;
  }
  @keyframes otIconPulse {
    0%,100% { box-shadow: 0 0 0 4px rgba(var(--arc),.05), 0 0 12px rgba(var(--arc),.1); }
    50%      { box-shadow: 0 0 0 10px rgba(var(--arc),.03), 0 0 22px rgba(var(--arc),.18); }
  }
  .ot-sbar-text { flex: 1; }
  .ot-sbar-title { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: #111827; }
  .ot-sbar-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .ot-sbar-code {
    font-family: 'Space Mono', monospace; font-size: 9px; letter-spacing: 2px;
    color: var(--accent); padding: 3px 9px;
    background: rgba(var(--arc),.08); border-radius: 6px; border: 1px solid var(--accent-border);
  }

  /* ─── Metrics ─── */
  .ot-metrics { display: grid; grid-template-columns: repeat(5, 1fr); border-bottom: 1px solid rgba(0,0,0,.05); }
  .ot-met { padding: 16px 18px; border-right: 1px solid rgba(0,0,0,.04); opacity: 0; animation: otFadeIn .6s ease 1.8s forwards; }
  .ot-met:last-child { border-right: none; }
  .ot-met-k { font-family: 'Space Mono', monospace; font-size: 7px; letter-spacing: 3px; text-transform: uppercase; color: #9ca3af; margin-bottom: 6px; }
  .ot-met-v { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 800; color: #111827; }
  .ot-met-v.hi { color: var(--accent); }
  .ot-met-v.sm { font-size: 11px; font-weight: 600; }

  /* ─── Horizontal Timeline ─── */
  .ot-timeline-section { padding: 30px 34px; border-bottom: 1px solid rgba(0,0,0,.05); }
  .ot-tl-head { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; opacity: 0; animation: otFadeIn .6s ease 1.9s forwards; }
  .ot-tl-head-txt { font-family: 'Space Mono', monospace; font-size: 8px; letter-spacing: 4px; text-transform: uppercase; color: #9ca3af; }
  .ot-tl-head-line { flex: 1; height: 1px; background: linear-gradient(to right, rgba(var(--arc),.25), transparent); }

  .ot-timeline-h { position: relative; }
  .ot-track-h {
    position: absolute;
    top: 20px;
    left: 40px;
    right: 40px;
    height: 2px;
    background: rgba(0,0,0,.07);
    border-radius: 2px;
    overflow: hidden;
  }
  .ot-track-fill-h {
    position: absolute;
    top: 0; left: 0; bottom: 0;
    border-radius: 2px;
    background: linear-gradient(to right, var(--accent), rgba(var(--arc),.35));
    box-shadow: 0 0 8px rgba(var(--arc),.2);
    transition: width 2.2s cubic-bezier(.22,1,.36,1);
  }

  .ot-steps-h {
    display: flex;
    justify-content: space-between;
    position: relative;
    z-index: 1;
  }
  .ot-step-h {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    flex: 1;
    max-width: 140px;
    opacity: 0;
    transform: translateY(16px);
    animation: otStepIn .75s cubic-bezier(.22,1,.36,1) forwards;
  }
  .ot-step-h:nth-child(1) { animation-delay: 2.0s; }
  .ot-step-h:nth-child(2) { animation-delay: 2.15s; }
  .ot-step-h:nth-child(3) { animation-delay: 2.3s; }
  .ot-step-h:nth-child(4) { animation-delay: 2.45s; }
  .ot-step-h:nth-child(5) { animation-delay: 2.6s; }
  @keyframes otStepIn { to { opacity: 1; transform: translateY(0); } }

  .ot-node-h {
    width: 40px; height: 40px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; margin-bottom: 12px;
    position: relative; z-index: 2;
    transition: all .3s ease;
  }
  .ot-node-h.pending { background: #f3f4f6; border: 1.5px solid #e5e7eb; color: #d1d5db; }
  .ot-node-h.done {
    background: rgba(var(--arc),.1); border: 1.5px solid rgba(var(--arc),.3); color: var(--accent);
  }
  .ot-node-h.done::after {
    content: ''; position: absolute; inset: -6px; border-radius: 50%;
    border: 1px solid rgba(var(--arc),.12); animation: otRingOut 3.5s ease-in-out infinite;
  }
  .ot-node-h.active {
    background: rgba(var(--arc),.1); border: 2px solid var(--accent); color: var(--accent);
    animation: otIconPulse 2.5s ease-in-out infinite;
    box-shadow: 0 0 0 5px rgba(var(--arc),.07), 0 0 16px rgba(var(--arc),.12);
  }
  .ot-node-h.active::before {
    content: ''; position: absolute; inset: -9px; border-radius: 50%;
    border: 1.5px solid transparent; border-top-color: var(--accent);
    animation: otSpin 2.5s linear infinite;
  }
  .ot-node-h.cancelled {
    background: rgba(239,68,68,.1); border: 2px solid rgba(239,68,68,.4); color: #ef4444;
  }
  @keyframes otRingOut { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(1.8);opacity:0} }
  @keyframes otSpin { to { transform: rotate(360deg); } }

  .ot-step-info { text-align: center; }
  .ot-step-name {
    font-size: 12px; font-weight: 600; color: #111827;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    margin-bottom: 4px;
  }
  .ot-step-name.dim { color: #d1d5db; font-weight: 400; }
  .ot-step-sub { font-size: 10px; color: #9ca3af; line-height: 1.4; max-width: 120px; }
  .ot-step-sub.lit { color: #6b7280; }
  .ot-step-code {
    font-family: 'Space Mono', monospace; font-size: 8px; letter-spacing: 1.5px;
    color: rgba(var(--arc),.4); margin-top: 4px;
  }

  .ot-badge {
    font-family: 'Space Mono', monospace; font-size: 7px; letter-spacing: 1px;
    background: var(--accent); color: #fff; padding: 2px 8px;
    border-radius: 100px; font-weight: 700;
    animation: otBadgePop 2s ease-in-out infinite;
  }
  @keyframes otBadgePop { 0%,100%{opacity:1} 50%{opacity:.7} }

  /* ─── History Section ─── */
  .ot-history-section { padding: 30px 34px; border-bottom: 1px solid rgba(0,0,0,.05); }
  
  .ot-section-head {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 24px; opacity: 0; animation: otFadeIn .6s ease 2.2s forwards;
  }
  .ot-section-line { width: 4px; height: 20px; border-radius: 2px; background: linear-gradient(to bottom, var(--accent), rgba(var(--arc),.3)); flex-shrink: 0; }
  .ot-section-title {
    font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; color: #0f172a;
  }

  .ot-history-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .ot-history-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 0;
    border-bottom: 1px solid rgba(0,0,0,.04);
    opacity: 0;
    transform: translateX(-20px);
    animation: otHistoryIn .6s cubic-bezier(.22,1,.36,1) forwards;
  }
  .ot-history-item:last-child { border-bottom: none; }
  .ot-history-item.cancelled { background: rgba(239,68,68,.03); border-radius: 8px; padding: 16px; margin: 4px 0; }
  @keyframes otHistoryIn { to { opacity: 1; transform: translateX(0); } }

  .ot-history-node {
    width: 36px; height: 36px; border-radius: 50%;
    background: rgba(var(--arc),.1); border: 1.5px solid rgba(var(--arc),.25);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; color: var(--accent);
    flex-shrink: 0;
  }
  .ot-history-content { flex: 1; }
  .ot-history-label {
    font-size: 13px; font-weight: 700; color: #0f172a;
    margin-bottom: 2px;
  }
  .ot-history-date {
    font-size: 11px; color: #94a3b8;
    font-family: 'Space Mono', monospace;
  }
  .ot-history-status {
    font-size: 14px; color: #10b981;
    font-weight: 800;
  }

  /* ─── Info Section ─── */
  .ot-info-section { padding: 30px 34px; }
  .ot-info-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }
  .ot-info-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
    opacity: 0;
    animation: otFadeIn .6s ease forwards;
  }
  .ot-info-card:nth-child(1) { animation-delay: 2.6s; }
  .ot-info-card:nth-child(2) { animation-delay: 2.7s; }
  .ot-info-card:nth-child(3) { animation-delay: 2.8s; }
  .ot-info-card:nth-child(4) { animation-delay: 2.9s; }
  .ot-info-label {
    font-family: 'Space Mono', monospace;
    font-size: 7px; letter-spacing: 3px; text-transform: uppercase;
    color: #9ca3af; margin-bottom: 6px;
  }
  .ot-info-value {
    font-family: 'Syne', sans-serif;
    font-size: 15px; font-weight: 700; color: #0f172a;
  }
  .ot-info-value.hi { color: var(--accent); }

  .ot-tracking-box {
    background: linear-gradient(135deg, rgba(var(--arc),.08), rgba(var(--arc),.03));
    border: 1px solid var(--accent-border);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    opacity: 0;
    animation: otFadeIn .6s ease 3.0s forwards;
  }
  .ot-tracking-label {
    font-size: 11px; font-weight: 800; color: var(--accent);
    text-transform: uppercase; letter-spacing: 1px;
  }
  .ot-tracking-number {
    font-family: 'Space Mono', monospace;
    font-size: 16px; font-weight: 700; color: #0f172a;
    flex: 1;
  }
  .ot-tracking-link {
    font-size: 12px; font-weight: 700; color: var(--accent);
    text-decoration: none;
    padding: 8px 16px;
    background: rgba(var(--arc),.1);
    border-radius: 8;
    border: 1px solid var(--accent-border);
    transition: all .2s;
  }
  .ot-tracking-link:hover {
    background: rgba(var(--arc),.15);
    transform: translateY(-1px);
  }

  /* Footer */
  .ot-footer { margin-top: 36px; text-align: center; }
  .ot-footer p {
    font-family: 'Space Mono', monospace; font-size: 8px;
    letter-spacing: 4px; text-transform: uppercase; color: #9ca3af;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .ot-container { padding: 20px 14px 60px; }
    .ot-card-hdr, .ot-timeline-section, .ot-history-section, .ot-info-section { padding: 22px 20px; }
    .ot-metrics { grid-template-columns: repeat(3, 1fr); }
    .ot-met:nth-child(4), .ot-met:nth-child(5) { border-top: 1px solid rgba(0,0,0,.04); }
    .ot-folio-id { font-size: 22px; }
    .ot-steps-h { overflow-x: auto; gap: 16px; padding-bottom: 8px; }
    .ot-step-h { min-width: 100px; }
    .ot-track-h { left: 20px; right: 20px; }
    .ot-info-grid { grid-template-columns: repeat(2, 1fr); }
    .ot-history-item { gap: 12px; }
    .ot-history-node { width: 32px; height: 32px; font-size: 11px; }
  }
`