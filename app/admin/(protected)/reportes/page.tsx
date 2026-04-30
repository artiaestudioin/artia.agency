import { createClient } from '@/lib/supabase/server'
import ReportesClient from './ReportesClient'

export const metadata = { title: 'Reportes — Artia Admin' }

export default async function ReportesPage() {
  const supabase = await createClient()

  const [
    { data: payments },
    { data: leads },
    { data: projects },
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

  // Supabase infiere `lead` como array en joins de FK 1-a-1.
  // Normalizamos aquí para que coincida con los tipos del cliente.
  const paymentsNorm = (payments || []).map((p) => ({
    ...p,
    lead: Array.isArray(p.lead) ? (p.lead[0] ?? null) : p.lead,
  }))

  const projectsNorm = (projects || []).map((p) => ({
    ...p,
    lead: Array.isArray(p.lead) ? (p.lead[0] ?? null) : p.lead,
  }))

  return (
    <ReportesClient
      payments={paymentsNorm as any}
      leads={leads || []}
      projects={projectsNorm as any}
      emails={emails || []}
      posthog={posthog}
      sentry={sentry}
    />
  )
}