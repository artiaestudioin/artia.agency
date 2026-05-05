import { createClient } from '@/lib/supabase/server'
import ReportesClient from './ReportesClient'
import { PostHogWidget, SentryWidget } from '../AnalyticsWidgets'
export const metadata = { title: 'Reportes — Artia Admin' }

export default async function ReportesPage() {
  const supabase = await createClient();

  // 1. CARGA DE DATOS CON DETECTOR DE ERRORES
  // 1. CARGA DE DATOS (Sin la columna que falla)
  const [
    { data: rawPayments, error: errorP },
    { data: paymentMethodsData },
    { data: leads },
    { data: rawProjects },
    { data: emails },
    { data: landings },
    { data: orders },
  ] = await Promise.all([
    supabase.from('payment_parents').select(`
      id, lead_id, contract_value, description, payment_month, status, created_at,
      installments:payment_installments(id, amount, payment_date, status, payment_number,payment_method),
      lead:lead_id(nombre, folio, servicio)
    `).order('created_at', { ascending: false }),
    supabase.from('payments').select('method').order('created_at', { ascending: false }),
    supabase.from('leads').select('id, nombre, folio, servicio, estado, estimated_value, created_at,payment_status').order('created_at', { ascending: false }),
    supabase.from('projects').select('id, name, status, event_date, created_at, lead:lead_id(nombre, folio)').order('created_at', { ascending: false }),
    supabase.from('email_sends').select('id, to_email, template_name, sent_at, opened').order('sent_at', { ascending: false }).limit(1000),
    supabase.from('landing_pages')
      .select('id, title, status, created_at, views:landing_views(count)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('landing_orders')
      .select('id, landing_id, amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
  ]);

  if (errorP) console.error("❌ ERROR PAGOS:", errorP.message);
  // 3. Formateo seguro (evita el crash de la pantalla blanca)
 const payments = (rawPayments || []).map((p: any) => ({
  ...p,
  contract_value: parseFloat(p.contract_value ?? 0) || 0,
  // Esto es vital: asegura que el componente vea una lista de cuotas
  installments: (p.installments || []).map((i: any) => ({
    ...i,
    amount: parseFloat(i.amount ?? 0) || 0,
  })),
}));

  const projects = (rawProjects || []).map((p: any) => ({
    ...p,
    lead: Array.isArray(p.lead) ? (p.lead[0] ?? null) : (p.lead ?? null),
  }))

  // Fetch PostHog & Sentry data
  let posthog = null
  let sentry = null
  try {
    const [phRes, seRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/admin/posthog-stats`, { next: { revalidate: 300 } }),
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/admin/sentry-stats`, { next: { revalidate: 300 } }),
    ])
    if (phRes.ok) posthog = await phRes.json()
    if (seRes.ok) sentry = await seRes.json()
  } catch {
    // Silently fail analytics
  }
console.log("DATOS ENVIADOS AL CLIENTE:", JSON.stringify(payments[0], null, 2));
  return (
    <div className="space-y-8">
      {/* 1. Dashboard de Finanzas y Proyectos */}
      <ReportesClient
        initialPayments={payments}
        payments={payments}
        leads={leads || []}
        projects={projects}
        emails={emails || []}
        landings={landings ?? []}
        orders={orders ?? []}
        paymentMethods={paymentMethodsData || []}
        
        posthog={posthog}        // ← AGREGAR
        sentry={sentry}          // ← AGREGAR
      />

      {/* 2. Sección de Analítica s (Tus nuevos widgets) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <PostHogWidget />
        <SentryWidget />
      </div>
    </div>
  )
}