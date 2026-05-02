'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ClienteTrackerProps {
  order: {
    id: string
    folio: string
    name: string
    email: string | null
    phone: string
    address: string | null
    city: string | null
    product_name: string | null
    quantity: number
    total: number | null
    currency: string
    status: string
    payment_status: string
    timeline: Array<{
      status: string
      date: string
      note: string | null
      updated_by: string | null
    }>
    tracking_number: string | null
    tracking_url: string | null
    design_description: string | null
    design_files: string[]
    created_at: string
    updated_at: string
  }
  landingConfig: any
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string; description: string }> = {
  pending: { 
    label: 'Pendiente', 
    color: '#f59e0b', 
    bg: '#fefce8', 
    icon: '⏳',
    description: 'Tu pedido ha sido recibido y está siendo procesado.'
  },
  confirmed: { 
    label: 'Confirmado', 
    color: '#3b82f6', 
    bg: '#eff6ff', 
    icon: '✓',
    description: 'Hemos confirmado tu pedido y estamos preparando todo.'
  },
  in_production: { 
    label: 'En Producción', 
    color: '#8b5cf6', 
    bg: '#f5f3ff', 
    icon: '🎨',
    description: 'Tu producto está siendo personalizado con tu diseño.'
  },
  shipped: { 
    label: 'Enviado', 
    color: '#06b6d4', 
    bg: '#ecfeff', 
    icon: '🚚',
    description: 'Tu pedido está en camino. ¡Pronto llegará!'
  },
  delivered: { 
    label: 'Entregado', 
    color: '#10b981', 
    bg: '#f0fdf4', 
    icon: '🎉',
    description: '¡Pedido entregado! Gracias por confiar en nosotros.'
  },
  cancelled: { 
    label: 'Cancelado', 
    color: '#ef4444', 
    bg: '#fef2f2', 
    icon: '✕',
    description: 'Este pedido ha sido cancelado.'
  },
  refunded: { 
    label: 'Reembolsado', 
    color: '#6b7280', 
    bg: '#f3f4f6', 
    icon: '↩',
    description: 'Se ha procesado el reembolso.'
  },
}

const STATUS_ORDER = ['pending', 'confirmed', 'in_production', 'shipped', 'delivered']

export default function ClienteTracker({ order, landingConfig }: ClienteTrackerProps) {
  const [copied, setCopied] = useState(false)
  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const currentStep = STATUS_ORDER.indexOf(order.status)

  const fmtMoney = (n: number | null) => {
    if (n == null) return '—'
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: order.currency }).format(n)
  }

  const fmtDate = (d: string) => {
    return new Date(d).toLocaleDateString('es-EC', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  const copyFolio = () => {
    navigator.clipboard.writeText(order.folio)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const whatsappMessage = encodeURIComponent(
    `Hola Artia! Tengo una consulta sobre mi pedido ${order.folio}`
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '40px 20px 60px', textAlign: 'center', color: '#fff' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 8px' }}>Seguimiento de Pedido</h1>
          <p style={{ fontSize: 15, opacity: 0.9, margin: 0 }}>Artia Studio — Productos personalizados</p>
        </div>
      </div>

      {/* Main Card */}
      <div style={{ maxWidth: 600, margin: '-40px auto 40px', padding: '0 16px' }}>
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

          {/* Folio & Status */}
          <div style={{ padding: '24px 24px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                  Número de seguimiento
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', letterSpacing: '1px' }}>
                    {order.folio}
                  </code>
                  <button onClick={copyFolio}
                    style={{
                      background: copied ? '#dcfce7' : '#f1f5f9',
                      color: copied ? '#166534' : '#64748b',
                      border: 'none', borderRadius: 6, padding: '4px 10px',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}>
                    {copied ? '✓ Copiado' : '📋 Copiar'}
                  </button>
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 20,
                background: statusCfg.bg, color: statusCfg.color,
                fontSize: 13, fontWeight: 800,
                border: `1.5px solid ${statusCfg.color}30`,
              }}>
                <span style={{ fontSize: 16 }}>{statusCfg.icon}</span>
                {statusCfg.label}
              </div>
            </div>

            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>
              {statusCfg.description}
            </p>
          </div>

          {/* Progress Steps */}
          <div style={{ padding: '0 24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, position: 'relative' }}>
              {STATUS_ORDER.map((status, idx) => {
                const cfg = STATUS_CONFIG[status]
                const isActive = idx <= currentStep
                const isCurrent = idx === currentStep

                return (
                  <div key={status} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: isActive ? cfg.color : '#e2e8f0',
                      color: isActive ? '#fff' : '#94a3b8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 900,
                      border: isCurrent ? `3px solid ${cfg.color}` : '3px solid transparent',
                      boxShadow: isCurrent ? `0 0 0 4px ${cfg.bg}` : 'none',
                      transition: 'all 0.3s',
                    }}>
                      {isActive ? (idx < currentStep ? '✓' : cfg.icon) : idx + 1}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, marginTop: 6,
                      color: isActive ? cfg.color : '#94a3b8',
                      textAlign: 'center', lineHeight: 1.3,
                    }}>
                      {cfg.label}
                    </span>
                    {idx < STATUS_ORDER.length - 1 && (
                      <div style={{
                        position: 'absolute', top: 18, left: '60%', right: '-40%',
                        height: 3, background: idx < currentStep ? cfg.color : '#e2e8f0',
                        zIndex: -1, transition: 'all 0.3s',
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Order Details */}
          <div style={{ borderTop: '1px solid #f1f5f9', padding: '20px 24px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 14px' }}>📋 Detalles del Pedido</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
              <div>
                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Producto</span>
                <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>{order.product_name || '—'}</span>
              </div>
              <div>
                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Cantidad</span>
                <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>{order.quantity} unidad(es)</span>
              </div>
              <div>
                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Total</span>
                <span style={{ fontSize: 16, color: '#0f172a', fontWeight: 900 }}>{fmtMoney(order.total)}</span>
              </div>
              <div>
                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Pago</span>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: order.payment_status === 'paid' ? '#10b981' : order.payment_status === 'partial' ? '#f59e0b' : '#64748b',
                  textTransform: 'uppercase',
                }}>
                  {order.payment_status}
                </span>
              </div>
            </div>

            {order.design_description && (
              <div style={{ marginTop: 14, padding: 12, background: '#f8fafc', borderRadius: 10 }}>
                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Diseño solicitado</span>
                <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.6 }}>{order.design_description}</p>
              </div>
            )}

            {order.design_files && order.design_files.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Archivos adjuntos</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {order.design_files.map((file, i) => (
                    <a key={i} href={file} target="_blank" rel="noopener noreferrer"
                      style={{
                        display: 'block', width: 80, height: 80, borderRadius: 8,
                        overflow: 'hidden', border: '1px solid #e2e8f0',
                      }}>
                      <img src={file} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          {order.timeline && order.timeline.length > 0 && (
            <div style={{ borderTop: '1px solid #f1f5f9', padding: '20px 24px' }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 14px' }}>🕐 Historial</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[...order.timeline].reverse().map((entry, idx) => {
                  const cfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.pending
                  return (
                    <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: cfg.bg, color: cfg.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, flexShrink: 0,
                      }}>
                        {cfg.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{cfg.label}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{fmtDate(entry.date)}</div>
                        {entry.note && <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{entry.note}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tracking Info */}
          {(order.tracking_number || order.tracking_url) && (
            <div style={{ borderTop: '1px solid #f1f5f9', padding: '20px 24px', background: '#eff6ff' }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1e40af', margin: '0 0 10px' }}>🚚 Información de Envío</h3>
              {order.tracking_number && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700 }}>Número de guía: </span>
                  <code style={{ fontSize: 13, color: '#1e40af', fontWeight: 700 }}>{order.tracking_number}</code>
                </div>
              )}
              {order.tracking_url && (
                <a href={order.tracking_url} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'inline-block', background: '#2563eb', color: '#fff',
                    padding: '8px 16px', borderRadius: 8, textDecoration: 'none',
                    fontSize: 13, fontWeight: 700, marginTop: 4,
                  }}>
                  Rastrear envío →
                </a>
              )}
            </div>
          )}

          {/* Contact */}
          <div style={{ borderTop: '1px solid #f1f5f9', padding: '20px 24px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 12px' }}>💬 ¿Necesitas ayuda?</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a href={`https://wa.me/593969937265?text=${whatsappMessage}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#22c55e', color: '#fff',
                  padding: '10px 18px', borderRadius: 10,
                  textDecoration: 'none', fontSize: 13, fontWeight: 700,
                }}>
                <span>💬</span> WhatsApp
              </a>
              <a href="mailto:pedidos@artiaagency.com"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#f1f5f9', color: '#475569',
                  padding: '10px 18px', borderRadius: 10,
                  textDecoration: 'none', fontSize: 13, fontWeight: 700,
                }}>
                <span>✉️</span> Email
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 12 }}>
          <p>Artia Studio © 2026 — Productos personalizados de calidad</p>
          <Link href="/" style={{ color: '#667eea', textDecoration: 'none', fontWeight: 600 }}>
            Visitar tienda →
          </Link>
        </div>
      </div>
    </div>
  )
}
