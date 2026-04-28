import { createClient } from '@/lib/supabase/server'
import FinanzasClient from './FinanzasClient'

export const metadata = { title: 'Finanzas — Sistema Contable' }

export default async function FinanzasPage() {
  const supabase = await createClient()

  const [{ data: payments }, { data: leads }] = await Promise.all([
    supabase
      .from('payments')
      .select(`
        id, lead_id, amount, status, method, description, fecha,
        comprobante_url, payment_month, payment_number, due_date,
        leads:lead_id ( nombre, folio, servicio, estimated_value, contract_value )
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('leads')
      .select('id, nombre, folio, servicio, estimated_value, contract_value, payment_status, estado')
      .order('created_at', { ascending: false }),
  ])

  // Normalizar datos para el cliente
  const normalizedPayments = (payments || []).map((p: any) => ({
    id: p.id,
    lead_id: p.lead_id,
    amount: p.amount,
    status: p.status,
    method: p.method,
    description: p.description,
    fecha: p.fecha,
    comprobante_url: p.comprobante_url,
    payment_month: p.payment_month,
    payment_number: p.payment_number,
    due_date: p.due_date,
    lead: p.leads ? {
      nombre: p.leads.nombre,
      folio: p.leads.folio,
      servicio: p.leads.servicio,
      estimated_value: p.leads.estimated_value,
      contract_value: p.leads.contract_value,
    } : null,
  }))

  return <FinanzasClient payments={normalizedPayments} leads={leads || []} />
}