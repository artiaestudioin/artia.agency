// app/api/landing-orders/route.ts
// FIX: sin import de resend — usa fetch nativo para no romper el build
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function sendOrderEmail(order: any) {
  if (!order.email || !process.env.RESEND_API_KEY) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Artia Studio <pedidos@artiaagency.com>',
        to: [order.email],
        subject: `🎉 Pedido Confirmado — ${order.folio}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;">
            <h1 style="color:#667eea;">¡Gracias por tu pedido!</h1>
            <p>Tu número de seguimiento es: <strong>${order.folio}</strong></p>
            <a href="https://artiaagency.vercel.app/cliente/${order.folio}"
               style="background:#667eea;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">
              Seguir mi pedido →
            </a>
          </div>
        `,
      }),
    })
  } catch (e) {
    console.error('Email error:', e)
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const landing_id = searchParams.get('landing_id')
  const status     = searchParams.get('status')
  const folio      = searchParams.get('folio')

  const supabase = await createClient()

  let query = supabase
    .from('landing_orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (landing_id) query = query.eq('landing_id', landing_id)
  if (status)     query = query.eq('status', status)
  if (folio)      query = query.eq('folio', folio)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const { data: order, error } = await supabase
    .from('landing_orders')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.landing_id) {
    await supabase.rpc('increment_landing_conversion', {
      landing_uuid: body.landing_id,
      revenue_amount: body.total || 0,
    })
  }

  await sendOrderEmail(order)

  if (order.email && process.env.RESEND_API_KEY) {
    await supabase.from('landing_orders').update({ email_sent: true }).eq('id', order.id)
  }

  return NextResponse.json({ order }, { status: 201 })
}
