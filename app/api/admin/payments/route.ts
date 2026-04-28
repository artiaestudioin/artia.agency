import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const {
    lead_id,
    contract_value,
    description,
    payment_month,
    installments, // Array de cuotas: [{ amount, payment_date, status, payment_number }]
  } = body

  if (!lead_id || !contract_value || !installments?.length) {
    return NextResponse.json({ error: 'lead_id, contract_value y cuotas son requeridos' }, { status: 400 })
  }

  // 1. Crear payment_parent
  const { data: parent, error: parentError } = await supabase
    .from('payment_parents')
    .insert({
      lead_id,
      contract_value: parseFloat(contract_value),
      description: description || null,
      payment_month: payment_month || null,
    })
    .select()
    .single()

  if (parentError) return NextResponse.json({ error: parentError.message }, { status: 500 })

  // 2. Crear cuotas
  const installmentsData = installments.map((inst: any) => ({
    payment_id: parent.id,
    amount: parseFloat(inst.amount),
    payment_date: inst.payment_date,
    status: inst.status || 'pendiente',
    payment_number: inst.payment_number,
    receipt_url: inst.receipt_url || null,
  }))

  const { data: createdInstallments, error: instError } = await supabase
    .from('payment_installments')
    .insert(installmentsData)
    .select()

  if (instError) return NextResponse.json({ error: instError.message }, { status: 500 })

  // 3. Actualizar estado del lead
  const pagado = installmentsData
    .filter((i: any) => i.status === 'pagado')
    .reduce((s: number, i: any) => s + i.amount, 0)
  
  const newStatus = pagado >= parseFloat(contract_value) ? 'pagado' : pagado > 0 ? 'parcial' : 'pendiente'
  await supabase.from('leads').update({ payment_status: newStatus }).eq('id', lead_id)

  return NextResponse.json({ 
    parent: { ...parent, installments: createdInstallments } 
  }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: parents, error } = await supabase
    .from('payment_parents')
    .select(`
      *,
      installments:payment_installments(*),
      lead:lead_id(nombre, folio, servicio, estimated_value, contract_value)
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ payments: parents || [] })
}