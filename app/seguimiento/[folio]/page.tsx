// Página PÚBLICA — no requiere autenticación
// URL: artiaagency.vercel.app/seguimiento/ASMKT-0362
import { createClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

// Cliente anon (solo lectura pública) — NO usar service role aquí
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
    description: 'Consulta el estado de tu pedido en Artia Studio',
  }
}

const TIMELINE = [
  { estado: 'nuevo',      label: 'Solicitud recibida', icon: '📩', desc: 'Tu solicitud llegó a nuestro equipo.' },
  { estado: 'contactado', label: 'En revisión',         icon: '🔍', desc: 'Estamos analizando tu solicitud.' },
  { estado: 'en_proceso', label: 'En proceso',          icon: '⚙️', desc: 'Tu proyecto está en desarrollo activo.' },
  { estado: 'cerrado',    label: 'Completado',          icon: '✅', desc: '¡Tu proyecto fue entregado con éxito!' },
]

const COLORES: Record<string, string> = {
  marketing: '#16a34a',
  impres:    '#d97706',
  foto:      '#9333ea',
  brand:     '#e11d48',
  web:       '#2563eb',
  chat:      '#0891b2',
}

export default async function SeguimientoPage({
  params,
}: {
  params: Promise<{ folio: string }>
}) {
  const { folio } = await params
  const supabase  = getSupabasePublic()

  const { data: lead } = await supabase
    .from('leads')
    // Solo columnas públicas — NO exponemos notas_internas ni datos sensibles
    .select('folio, nombre, servicio, estado, mensaje, created_at, email')
    .eq('folio', folio.toUpperCase())
    .maybeSingle()

  // ── Folio no encontrado ──────────────────────────────────────────────────────
  if (!lead) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #00113a 0%, #001f6b 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: '48px 40px',
          textAlign: 'center', maxWidth: 420, width: '100%',
        }}>
          <p style={{ fontSize: 48, margin: '0 0 16px' }}>🔍</p>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#00113a', margin: '0 0 8px' }}>
            Folio no encontrado
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 8px' }}>
            No encontramos ningún pedido con el folio:
          </p>
          <code style={{
            display: 'inline-block', background: '#f1f5f9', color: '#dc2626',
            padding: '6px 16px', borderRadius: 8, fontSize: 15, fontWeight: 700,
            margin: '0 0 24px',
          }}>
            {folio.toUpperCase()}
          </code>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
            Verifica que el folio sea correcto. Si el problema persiste,
            contáctanos por WhatsApp.
          </p>
          <a
            href="https://wa.me/593969937265"
            style={{
              display: 'inline-block', marginTop: 20,
              background: '#25D366', color: '#fff',
              padding: '11px 28px', borderRadius: 10,
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}
          >
            Contactar por WhatsApp
          </a>
        </div>
      </div>
    )
  }

  const estadoActual = lead.estado ?? 'nuevo'
  const idxActual    = TIMELINE.findIndex(t => t.estado === estadoActual)
  const servicio     = lead.servicio?.toLowerCase() ?? ''
  const accentColor  = Object.entries(COLORES).find(([k]) => servicio.includes(k))?.[1] ?? '#2552ca'

  // Porcentaje de progreso para la barra
  const progreso = Math.round(((idxActual + 1) / TIMELINE.length) * 100)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f4f8',
      padding: '24px 16px 48px',
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>

        {/* Logo + branding */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png"
            alt="Artia Studio"
            style={{ height: 32, filter: 'invert(1) brightness(0.2)', marginBottom: 4 }}
          />
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', letterSpacing: '2px', textTransform: 'uppercase' }}>
            Seguimiento de pedido
          </p>
        </div>

        {/* Tarjeta principal */}
        <div style={{
          background: `linear-gradient(135deg, #00113a 0%, ${accentColor} 100%)`,
          borderRadius: 20, padding: '28px 28px 24px', marginBottom: 16, color: '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '2px', textTransform: 'uppercase' }}>
                Folio de seguimiento
              </p>
              <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px' }}>
                {lead.folio}
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                {lead.servicio}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 2px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Cliente</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{lead.nombre}</p>
            </div>
          </div>

          {/* Barra de progreso */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Progreso general</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{progreso}%</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, height: 6 }}>
              <div style={{
                width: `${progreso}%`, height: '100%',
                background: '#fff', borderRadius: 99,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div style={{
          background: '#fff', borderRadius: 20,
          border: '0.5px solid #e2e8f0', padding: '24px 28px', marginBottom: 16,
        }}>
          <h2 style={{ margin: '0 0 24px', fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            Estado del pedido
          </h2>
          <div style={{ position: 'relative' }}>
            {/* Línea vertical */}
            <div style={{
              position: 'absolute', left: 18, top: 20, bottom: 20,
              width: 2, background: '#e2e8f0', zIndex: 0,
            }} />
            {TIMELINE.map((step, idx) => {
              const isCompleted = idx <= idxActual
              const isCurrent   = idx === idxActual
              return (
                <div
                  key={step.estado}
                  style={{
                    display: 'flex', gap: 18,
                    marginBottom: idx < TIMELINE.length - 1 ? 28 : 0,
                    position: 'relative', zIndex: 1,
                  }}
                >
                  {/* Círculo del paso */}
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    background: isCompleted ? accentColor : '#f1f5f9',
                    border: isCurrent ? `3px solid ${accentColor}` : '2px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15,
                    boxShadow: isCurrent ? `0 0 0 5px ${accentColor}20` : 'none',
                    transition: 'all 0.3s',
                  }}>
                    {isCompleted && !isCurrent ? '✓' : step.icon}
                  </div>

                  {/* Texto del paso */}
                  <div style={{ paddingTop: 7 }}>
                    <p style={{
                      margin: '0 0 3px', fontSize: 14,
                      fontWeight: isCurrent ? 700 : 500,
                      color: isCompleted ? '#0f172a' : '#94a3b8',
                    }}>
                      {step.label}
                      {isCurrent && (
                        <span style={{
                          marginLeft: 8, fontSize: 10, fontWeight: 700,
                          background: accentColor, color: '#fff',
                          padding: '2px 8px', borderRadius: 999,
                        }}>
                          Estado actual
                        </span>
                      )}
                    </p>
                    <p style={{
                      margin: 0, fontSize: 12,
                      color: isCompleted ? '#64748b' : '#cbd5e1',
                    }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Detalle del pedido */}
        <div style={{
          background: '#fff', borderRadius: 20,
          border: '0.5px solid #e2e8f0', padding: '20px 28px', marginBottom: 16,
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
            Detalle de la solicitud
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { label: 'Servicio',       value: lead.servicio },
              { label: 'Descripción',    value: lead.mensaje },
              { label: 'Fecha',          value: new Date(lead.created_at).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
            ].filter(r => r.value).map((row, i, arr) => (
              <div key={row.label} style={{
                display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12,
                padding: '12px 0',
                borderBottom: i < arr.length - 1 ? '0.5px solid #f1f5f9' : 'none',
              }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {row.label}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: '#1e293b', lineHeight: 1.6 }}>
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA WhatsApp */}
        <a
          href={`https://wa.me/593969937265?text=${encodeURIComponent(`Hola Artia, te escribo sobre mi pedido con folio ${lead.folio}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: '#25D366', color: '#fff', padding: '15px',
            borderRadius: 14, fontSize: 14, fontWeight: 700, textDecoration: 'none',
            marginBottom: 20,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          Consultar por WhatsApp
        </a>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', margin: 0 }}>
          Artia Studio · Marketing &amp; Publicidad Integral · Ecuador
        </p>

      </div>
    </div>
  )
}
