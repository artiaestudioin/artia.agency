import { createClient } from '@/lib/supabase/server'
import NuevoLeadModal from './NuevoLeadModal'
import Link from 'next/link'

export const metadata = { title: 'Leads — Artia Admin' }

const COLS = 'id, folio, nombre, email, telefono, servicio, mensaje, estado, created_at'

type Lead = {
  id: string; folio: string | null; nombre: string; email: string | null
  telefono: string | null; servicio: string | null; mensaje: string | null
  estado: string | null; created_at: string
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ servicio?: string; q?: string; estado?: string }>
}) {
  const { servicio, q, estado } = await searchParams
  const supabase = await createClient()

  const filtroServicio = servicio && servicio !== 'todos' ? servicio : null
  const filtroQ        = q?.trim() || null
  const filtroEstado   = estado && estado !== 'todos' ? estado : null
  const hayFiltro      = !!(filtroServicio || filtroQ || filtroEstado)

  async function queryLeads(extraFilter?: (q: any) => any) {
    let base = supabase.from('leads').select(COLS).order('created_at', { ascending: false })
    if (filtroServicio) base = base.ilike('servicio', `%${filtroServicio}%`)
    if (filtroEstado)   base = base.eq('estado', filtroEstado)
    if (extraFilter)    base = extraFilter(base)
    const { data, error } = await base
    if (error) {
      const { data: d2 } = await supabase
        .from('leads')
        .select('id, folio, nombre, email, servicio, mensaje, created_at')
        .order('created_at', { ascending: false })
      return d2 ?? []
    }
    return data ?? []
  }

  let leads: Lead[] = []

  if (filtroQ) {
    const [byNombre, byEmail, byFolio] = await Promise.all([
      queryLeads(q => q.ilike('nombre', `%${filtroQ}%`)),
      queryLeads(q => q.ilike('email',  `%${filtroQ}%`)),
      queryLeads(q => q.ilike('folio',  `%${filtroQ}%`)),
    ])
    const merged = [
      ...byNombre,
      ...byEmail.filter((e: any) => !byNombre.some((n: any) => n.id === e.id)),
      ...byFolio.filter((e: any) => !byNombre.some((n: any) => n.id === e.id) && !byEmail.some((n: any) => n.id === e.id)),
    ]
    leads = merged as Lead[]
  } else {
    leads = (await queryLeads()) as Lead[]
  }

  const { count: total }    = await supabase.from('leads').select('*', { count: 'exact', head: true })
  const sevenDaysAgo        = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count: thisWeek } = await supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo)

  const { data: svcRaw } = await supabase.from('leads').select('servicio')
  const servicios = [...new Set((svcRaw ?? []).map((r: any) => r.servicio).filter(Boolean))] as string[]

  const ESTADOS = ['nuevo', 'contactado', 'en_proceso', 'cerrado', 'perdido']

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#00113a', margin: '0 0 4px' }}>Leads</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Contactos del sitio web y clientes de WhatsApp
          </p>
        </div>
        {/* Botón para abrir el modal de nuevo lead */}
        <NuevoLeadModal />
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total',       value: total ?? 0,    accent: false },
          { label: 'Esta semana', value: thisWeek ?? 0, accent: true  },
          { label: 'Mostrando',   value: leads.length,  accent: false },
        ].map(s => (
          <div key={s.label} style={{
            background: s.accent ? '#00113a' : '#f8fafc',
            border: `0.5px solid ${s.accent ? 'transparent' : '#e2e8f0'}`,
            borderRadius: 10, padding: '14px 18px',
          }}>
            <p style={{ margin: '0 0 2px', fontSize: 9, fontWeight: 700, color: s.accent ? '#b3c5ff' : '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              {s.label}
            </p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: s.accent ? '#fff' : '#0f172a' }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <form method="GET" style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <input name="q" defaultValue={filtroQ ?? ''} placeholder="Buscar nombre, email o folio…"
          style={{ flex: '1 1 200px', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1e293b', background: '#fff', outline: 'none' }} />

        <select name="servicio" defaultValue={filtroServicio ?? 'todos'}
          style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1e293b', background: '#fff', cursor: 'pointer', maxWidth: 240 }}>
          <option value="todos">Todos los servicios</option>
          {servicios.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select name="estado" defaultValue={filtroEstado ?? 'todos'}
          style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1e293b', background: '#fff', cursor: 'pointer' }}>
          <option value="todos">Todos los estados</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
        </select>

        <button type="submit" style={{ background: '#00113a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          Filtrar
        </button>
        {hayFiltro && (
          <a href="/admin/leads" style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', fontSize: 13, color: '#64748b', textDecoration: 'none', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff' }}>
            ✕ Limpiar
          </a>
        )}
      </form>

      {/* Tabla */}
      <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e2e8f0', overflow: 'auto' }}>
        {leads.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Folio', 'Nombre', 'Contacto', 'Servicio', 'Estado', 'Mensaje', 'Fecha', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: '0.5px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => (
                <tr key={lead.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                  {/* Folio */}
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    {lead.folio ? (
                      <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999 }}>
                        {lead.folio}
                      </span>
                    ) : (
                      <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                    )}
                  </td>

                  {/* Nombre */}
                  <td style={{ padding: '11px 14px', fontWeight: 600, color: '#0f172a', borderBottom: '0.5px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                    {lead.nombre}
                  </td>

                  {/* Email + Teléfono */}
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {lead.email ? (
                        <a href={`mailto:${lead.email}`} style={{ color: '#2552ca', textDecoration: 'none', fontSize: 12 }}>
                          {lead.email}
                        </a>
                      ) : null}
                      {lead.telefono ? (
                        <a href={`https://wa.me/${lead.telefono.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#16a34a', textDecoration: 'none', fontSize: 12 }}>
                          📱 {lead.telefono}
                        </a>
                      ) : null}
                      {!lead.email && !lead.telefono && (
                        <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                      )}
                    </div>
                  </td>

                  {/* Servicio */}
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <ServicioBadge servicio={lead.servicio} />
                  </td>

                  {/* Estado */}
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9' }}>
                    <EstadoBadge estado={lead.estado} />
                  </td>

                  {/* Mensaje */}
                  <td style={{ padding: '11px 14px', color: '#64748b', borderBottom: '0.5px solid #f1f5f9', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lead.mensaje ?? <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>

                  {/* Fecha */}
                  <td style={{ padding: '11px 14px', color: '#94a3b8', borderBottom: '0.5px solid #f1f5f9', whiteSpace: 'nowrap', fontSize: 12 }}>
                    {new Date(lead.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>

                  {/* Acciones */}
                  <td style={{ padding: '11px 14px', borderBottom: '0.5px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {lead.folio && (
                        <>
                          {/* Ver / editar en el admin */}
                          <Link
                            href={`/admin/cliente/${lead.folio}`}
                            style={{
                              fontSize: 11, fontWeight: 700, padding: '5px 10px',
                              borderRadius: 6, background: '#00113a', color: '#fff',
                              textDecoration: 'none',
                            }}
                          >
                            Gestionar
                          </Link>
                          {/* Link público para copiar y enviar al cliente */}
                          <a
                            href={`/seguimiento/${lead.folio}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 11, fontWeight: 700, padding: '5px 10px',
                              borderRadius: 6, background: '#f0fdf4', color: '#16a34a',
                              border: '0.5px solid #bbf7d0', textDecoration: 'none',
                            }}
                            title="Abrir página pública del cliente"
                          >
                            🔗
                          </a>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '60px 32px', textAlign: 'center' }}>
            <p style={{ fontSize: 32, margin: '0 0 10px' }}>📭</p>
            <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
              {hayFiltro ? 'Sin resultados para ese filtro' : 'Aún no hay leads'}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
              {hayFiltro ? 'Prueba con otro término o limpia los filtros.' : 'Los contactos del sitio web aparecerán aquí.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function ServicioBadge({ servicio }: { servicio: string | null }) {
  if (!servicio) return <span style={{ color: '#cbd5e1' }}>—</span>
  const s = servicio.toLowerCase()
  let bg = '#f1f5f9', color = '#475569'
  if (s.includes('market') || s.includes('redes'))       { bg = '#f0fdf4'; color = '#16a34a' }
  else if (s.includes('impres') || s.includes('sublim')) { bg = '#fef3c7'; color = '#d97706' }
  else if (s.includes('foto') || s.includes('drone'))    { bg = '#fdf4ff'; color = '#9333ea' }
  else if (s.includes('chat') || s.includes('ia'))       { bg = '#eff6ff'; color = '#2563eb' }
  else if (s.includes('brand') || s.includes('web'))     { bg = '#fff1f2'; color = '#e11d48' }
  return <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{servicio}</span>
}

function EstadoBadge({ estado }: { estado: string | null }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    nuevo:      { bg: '#eff6ff', color: '#2563eb', label: 'Nuevo' },
    contactado: { bg: '#fefce8', color: '#ca8a04', label: 'Contactado' },
    en_proceso: { bg: '#f0fdf4', color: '#16a34a', label: 'En proceso' },
    cerrado:    { bg: '#f0fdf4', color: '#15803d', label: 'Cerrado ✓' },
    perdido:    { bg: '#fef2f2', color: '#dc2626', label: 'Perdido' },
  }
  const e = map[estado ?? 'nuevo'] ?? map.nuevo
  return <span style={{ background: e.bg, color: e.color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 999 }}>{e.label}</span>
}
