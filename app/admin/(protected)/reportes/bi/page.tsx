import BiDashboard from './BiDashboard'

// ── Datos del reporte (Mayo 2026) ─────────────────────────────────────────
// En producción, estos datos vendrían de tu Supabase/API igual que en /admin/reportes
// Por ahora, importamos el JSON directamente. Puedes reemplazar con fetch a tu API.
const REPORT_DATA = {
  month: "Mayo 2026",
  period: "all",
  summary: {
    health_score: 78,
    total_leads: 45,
    total_projects: 12,
    total_orders: 23,
    total_revenue: 15000,
    total_facturado: 25000,
    total_cobrado: 18000,
  },
  finanzas: {
    total_facturado: 25000,
    total_cobrado: 18000,
    pendiente_al_dia: 5000,
    vencido: 2000,
    total_pendiente: 7000,
    cartera_sana_pct: 71,
    cobranza_rate: 72.0,
    contratos: { pagados: 5, en_progreso: 8, con_vencidas: 2, total: 15 },
  },
  ventas: {
    total_orders: 23,
    ingresos: 15000,
    ticket_promedio: 652.17,
    conversion_rate: 3.2,
    ctr_promedio: 1.8,
    landings: { total: 5, activas: 3, inactivas: 2 },
  },
  leads: {
    nuevos: 45,
    convertidos: 12,
    conversion_rate: 26.7,
    valor_estimado_total: 50000,
    cohorte: {
      total_leads: 100,
      con_proyecto: 40,
      con_pago: 25,
      conversion_lead_a_proyecto_pct: 40,
      conversion_proyecto_a_pago_pct: 62,
      dias_promedio_lead_a_proyecto: 14,
      funnel_drop_pct: 15.2,
    },
  },
  proyectos: {
    total: 12,
    activos: 5,
    completados: 4,
    en_curso: 3,
    lead_time_promedio_dias: 21,
  },
}

export default function BiPage() {
  return (
    <div style={{ padding: '32px 28px', maxWidth: 1400, margin: '0 auto' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28, fontSize: 13, color: '#64748b' }}>
        <a href="/admin/reportes" style={{ color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>
          Reportes
        </a>
        <span>›</span>
        <span style={{ fontWeight: 600, color: '#0f172a' }}>Business Intelligence</span>
      </div>

      {/* Módulo BI */}
      <BiDashboard reportData={REPORT_DATA} />

      {/* Nota de integración */}
      <div style={{
        marginTop: 20, padding: '14px 18px',
        background: 'rgba(124,58,237,0.05)',
        border: '1px solid rgba(124,58,237,0.15)',
        borderRadius: 12, fontSize: 13, color: '#64748b',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <span>💬</span>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: '#5b21b6' }}>Próxima iteración:</strong> Conectar este módulo directamente
          a Supabase para usar datos en tiempo real en lugar del JSON estático.
          El clustering se recalculará automáticamente cada mes con el histórico acumulado.
        </p>
      </div>
    </div>
  )
}
