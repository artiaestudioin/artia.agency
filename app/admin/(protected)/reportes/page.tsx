import { createClient } from '@/lib/supabase/server'
import ReportesClient from './ReportesClient'

export const metadata = { title: 'Reportes — Artia Admin' }

export default async function ReportesPage() {
  const supabase = await createClient()

  const [
    { data: rawPayments },
    { data: leads },
    { data: rawProjects },
    { data: emails },
  ] = await Promise.all([
    supabase.from('payment_parents').select(`
      id, lead_id, contract_value, description, payment_month, status, created_at,
      installments:payment_installments(id, amount, payment_date, status, payment_method, payment_number),
      lead:lead_id(nombre, folio, servicio)
    `).order('created_at', { ascending: false }),
    supabase.from('leads').select('id, nombre, folio, servicio, estado, estimated_value, created_at').order('created_at', { ascending: false }),
    supabase.from('projects').select('id, name, status, event_date, created_at, lead:lead_id(nombre, folio)').order('created_at', { ascending: false }),
    supabase.from('email_sends').select('id, to_email, template_name, sent_at, opened').order('sent_at', { ascending: false }).limit(1000),
  ])

  // Supabase devuelve `lead` como array en joins de FK 1-a-1.
  // Normalizamos a objeto singular Y casteamos números que llegan como strings.
  const payments = (rawPayments || []).map((p: any) => ({
    ...p,
    contract_value: parseFloat(p.contract_value ?? 0) || 0,
    lead: Array.isArray(p.lead) ? (p.lead[0] ?? null) : (p.lead ?? null),
    installments: (p.installments || []).map((i: any) => ({
      ...i,
      amount: parseFloat(i.amount ?? 0) || 0,
    })),
  }))

  const projects = (rawProjects || []).map((p: any) => ({
    ...p,
    lead: Array.isArray(p.lead) ? (p.lead[0] ?? null) : (p.lead ?? null),
  }))

  // PostHog y Sentry — usar URL absoluta correcta en SSR
  let posthog = null
  let sentry  = null
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    const [phRes, seRes] = await Promise.all([
      fetch(`${baseUrl}/api/admin/posthog-stats`, { next: { revalidate: 300 } }),
      fetch(`${baseUrl}/api/admin/sentry-stats`,  { next: { revalidate: 300 } }),
    ])
    if (phRes.ok) posthog = await phRes.json()
    if (seRes.ok) sentry  = await seRes.json()
  } catch {
    // Analytics opcional — falla silenciosa
  }

  return (
    <ReportesClient
      payments={payments}
      leads={leads || []}
      projects={projects}
      emails={emails || []}
      posthog={posthog}
      sentry={sentry}
    />
  )
}