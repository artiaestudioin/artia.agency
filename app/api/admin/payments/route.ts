import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const {
    lead_id, amount, method = 'transferencia', status = 'pagado',
    description, fecha, comprobante_url,
    payment_month, payment_number, due_date,
  } = body

  if (!lead_id || amount === undefined) {
    return NextResponse.json({ error: 'lead_id y amount son requeridos' }, { status: 400 })
  }

  const insertData: Record<string, any> = {
    lead_id,
    amount: parseFloat(amount),
    method,
    status,
    description: description || null,
    fecha: fecha || new Date().toISOString(),
    comprobante_url: comprobante_url || null,
    payment_month: payment_month || null,
    payment_number: payment_number ? parseInt(payment_number) : null,
    due_date: due_date || null,
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .insert(insertData)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recalcular payment_status del lead
  const { data: allPays } = await supabase
    .from('payments')
    .select('amount, status')
    .eq('lead_id', lead_id)

  const { data: lead } = await supabase
    .from('leads')
    .select('estimated_value, contract_value')
    .eq('id', lead_id)
    .single()

  const pagado   = (allPays ?? []).filter(p => p.status === 'pagado').reduce((s, p) => s + p.amount, 0)
  const expected = lead?.contract_value ?? lead?.estimated_value ?? 0
  const newStatus = pagado > 0 && expected > 0 && pagado >= expected
    ? 'pagado'
    : pagado > 0 ? 'parcial' : 'pendiente'

  await supabase.from('leads').update({ payment_status: newStatus }).eq('id', lead_id)

  return NextResponse.json({ payment }, { status: 201 })
}
