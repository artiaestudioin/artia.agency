import { createClient } from '@/lib/supabase/server'
import FinanzasClient from './FinanzasClient'

export const metadata = { title: 'Finanzas — Artia Admin' }

export default async function FinanzasPage() {
  const supabase = await createClient()

  const [{ data: payments }, { data: leads }] = await Promise.all([
    supabase
      .from('payments')
      .select('id, lead_id, amount, status, method, description, fecha, comprobante_url')
      .order('fecha', { ascending: false }),
    supabase
      .from('leads')
      .select('id, nombre, folio, servicio, email, payment_status, estimated_value, final_value, estado')
      .order('nombre', { ascending: true }),
  ])

  // Unir datos del lead a cada pago
  const leadsMap = Object.fromEntries((leads ?? []).map(l => [l.id, l]))

  const paymentsWithLead = (payments ?? []).map(p => ({
    ...p,
    lead: leadsMap[p.lead_id] ? {
      nombre:          leadsMap[p.lead_id].nombre,
      folio:           leadsMap[p.lead_id].folio,
      servicio:        leadsMap[p.lead_id].servicio,
      estimated_value: leadsMap[p.lead_id].estimated_value,
    } : null,
  }))

  return <FinanzasClient payments={paymentsWithLead} leads={leads ?? []} />
}
