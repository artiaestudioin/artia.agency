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

  return (
    <ReportesClient
      payments={payments || []}
      leads={leads || []}
      projects={projects || []}
      emails={emails || []}
      posthog={posthog}
      sentry={sentry}
    />
  )
}