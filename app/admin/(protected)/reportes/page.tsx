// app/admin/(protected)/reportes/page.tsx
import { createClient } from '@/lib/supabase/server'
import ReportesClient from './ReportesClient'

export const metadata = { title: 'Reportes — Artia Admin' }

// Force fresh server render — financial data must always be current after mutations.
export const dynamic = 'force-dynamic'

export default async function ReportesPage() {
  const supabase = await createClient()

  // ─── FINANZAS ───
  const [
    { data: rawPayments, error: errorP },
    { data: paymentMethodsData },
    { data: leads },
    { data: rawProjects },
    { data: emails },
  ] = await Promise.all([
    supabase.from('payment_parents').select(`
      id, lead_id, contract_value, description, payment_month, status, created_at,
      installments:payment_installments(id, amount, payment_date, status, payment_number, payment_method),
      lead:lead_id(nombre, folio, servicio)
    `).order('created_at', { ascending: false }),
    supabase
      .from('payment_installments')
      .select('payment_method')
      .not('payment_method', 'is', null)
      .order('created_at', { ascending: false }),
    supabase.from('leads').select('id, nombre, folio, servicio, estado, estimated_value, created_at, payment_status').order('created_at', { ascending: false }),
    supabase.from('projects').select('id, name, status, event_date, created_at, lead:lead_id(nombre, folio)').order('created_at', { ascending: false }),
    supabase.from('email_sends').select('id, to_email, template_name, sent_at, opened').order('sent_at', { ascending: false }).limit(1000),
  ])

  if (errorP) console.error("❌ ERROR PAGOS:", errorP.message)

  const payments = (rawPayments || []).map((p: any) => ({
    ...p,
    contract_value: parseFloat(p.contract_value ?? 0) || 0,
    installments: (p.installments || []).map((i: any) => ({
      ...i,
      amount: parseFloat(i.amount ?? 0) || 0,
    })),
  }))

  const projects = (rawProjects || []).map((p: any) => ({
    ...p,
    lead: Array.isArray(p.lead) ? (p.lead[0] ?? null) : (p.lead ?? null),
  }))

  // ─── VENTAS / LANDINGS ───
  const [
    { data: landingsData },
    { data: landingOrders },
    { data: utmStats },
  ] = await Promise.all([
    supabase
      .from('landing_stats')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('landing_orders')
      .select('id, landing_id, total, status, payment_status, created_at, utm_source, utm_medium, utm_campaign, product_name')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('landing_orders')
      .select('utm_source, utm_medium, utm_campaign, total, status, payment_status')
      .not('utm_source', 'is', null)
      .order('created_at', { ascending: false }),
  ])

  // ─── COHORT: Lead → Proyecto → Pago ───
  const { data: leadCohort } = await supabase
    .from('leads')
    .select(`
      id,
      nombre,
      created_at,
      estimated_value,
      final_value,
      projects:projects(id, name, status, created_at),
      payments:payment_parents(id, contract_value, status, created_at)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  // ─── ANALYTICS ───
  let posthog = null
  let sentry = null
  let analyticsFresh = false
  let analyticsError = null

  try {
    const [phRes, seRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/admin/posthog-stats`, { next: { revalidate: 300 } }),
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/admin/sentry-stats`, { next: { revalidate: 300 } }),
    ])
    
    if (phRes.ok) {
      posthog = await phRes.json()
      analyticsFresh = true
    } else {
      analyticsError = 'PostHog unavailable'
    }
    
    if (seRes.ok) {
      sentry = await seRes.json()
    } else {
      analyticsError = analyticsError ? `${analyticsError}, Sentry unavailable` : 'Sentry unavailable'
    }
  } catch (err) {
    analyticsError = err instanceof Error ? err.message : 'Analytics connection failed'
  }

  return (
    <ReportesClient
      initialPayments={payments}
      payments={payments}
      leads={leads || []}
      projects={projects}
      emails={emails || []}
      landings={landingsData ?? []}
      orders={landingOrders ?? []}
      utmStats={utmStats ?? []}
      paymentMethods={paymentMethodsData || []}
      posthog={posthog}
      sentry={sentry}
      analyticsFresh={analyticsFresh}
      analyticsError={analyticsError}
      leadCohort={leadCohort ?? []}
    />
  )
}