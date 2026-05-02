// app/cliente/[folio]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClienteTracker from './ClienteTracker'

export async function generateMetadata({ params }: { params: { folio: string } }) {
  return {
    title: `Seguimiento ${params.folio} — Artia Studio`,
  }
}

export default async function ClientePage({ params }: { params: { folio: string } }) {
  const supabase = await createClient()

  const { data: order, error } = await supabase
    .from('landing_orders')
    .select('*')
    .eq('folio', params.folio)
    .single()

  if (error || !order) {
    notFound()
  }

  // Get landing info
  const { data: landing } = await supabase
    .from('landings')
    .select('config')
    .eq('id', order.landing_id)
    .single()

  return (
    <ClienteTracker 
      order={order} 
      landingConfig={landing?.config || null}
    />
  )
}
