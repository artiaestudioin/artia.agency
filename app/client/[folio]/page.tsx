import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ClienteTracker from './ClienteTracker'

// 1. Corregimos los tipos y extraemos params con await en generateMetadata
export async function generateMetadata({ params }: { params: Promise<{ folio: string }> }) {
  const { folio } = await params
  return {
    title: `Seguimiento ${folio} — Artia Studio`,
  }
}

// 2. Aplicamos la misma Promise y await en la función principal
export default async function ClientePage({ params }: { params: Promise<{ folio: string }> }) {
  const { folio } = await params
  const supabase = await createClient()

  const { data: order, error } = await supabase
    .from('landing_orders')
    .select('*')
    .eq('folio', folio)
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