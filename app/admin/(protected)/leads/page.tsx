import { createClient } from '@/lib/supabase/server'
import LeadsClient from './LeadsClient'

export const metadata = { title: 'Leads — Artia Admin' }

export default async function LeadsPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('id, folio, nombre, email, telefono, servicio, estado, payment_status, estimated_value, created_at, notes')
    .order('created_at', { ascending: false })

  return <LeadsClient leads={leads ?? []} />
}