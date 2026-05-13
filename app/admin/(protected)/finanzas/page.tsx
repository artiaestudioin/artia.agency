import { createClient } from '@/lib/supabase/server'
import FinanzasClient from './FinanzasClient'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Finanzas — Sistema Contable' }

export default async function FinanzasPage() {
  const supabase = await createClient()

  const [{ data: parents }, { data: leads }] = await Promise.all([
    supabase
      .from('payment_parents')
      .select(`
        *,
        installments:payment_installments(*),
        lead:lead_id(nombre, folio, servicio, estimated_value, contract_value)
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('leads')
      .select('id, nombre, folio, servicio, estimated_value, contract_value, payment_status, estado')
      .order('created_at', { ascending: false }),
  ])

  return <FinanzasClient payments={parents || []} leads={leads || []} />
}