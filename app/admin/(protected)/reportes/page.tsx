// app/admin/(protected)/reportes/page.tsx
import { createClient } from '@/lib/supabase/server'
import ReportesClient from './ReportesClient'

export const metadata = { title: 'Reportes — Artia Admin' }

export default async function ReportesPage() {
  const supabase = await createClient()

  // ─── FINANZAS (módulo existente, sin cambios) ───
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
    supabase.from('payments').select('method').order('created_at', { ascending: false }),
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

  // ─── VENTAS / LANDINGS (CORREGIDO) ───
  // FIX: Usar tabla 'landings' (no 'landing_pages') y campos correctos
  const [
    { data: landingsData },
    { data: landingOrders },
    { data: utmStats },
  ] = await Promise.all([
    // Landings con métricas reales desde la view landing_stats
    supabase
      .from('landing_stats')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100),
    
    // Orders con campo 'total' (no 'amount')
    supabase
      .from('landing_orders')
      .select('id, landing_id, total, status, created_at, utm_source, utm_medium, utm_campaign, product_name')
      .order('created_at', { ascending: false })
      .limit(500),
    
    // UTM Stats: agrupación por source/medium/campaign
    supabase
      .from('landing_orders')
      .select('utm_source, utm_medium, utm_campaign, total, status')
      .not('utm_source', 'is', null)
      .order('created_at', { ascending: false }),
  ])

  // ─── ANALYTICS (PostHog / Sentry) ───
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
    />
  )
}