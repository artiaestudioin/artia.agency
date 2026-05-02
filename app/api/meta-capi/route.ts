// app/api/meta-capi/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'

function hashData(data: string): string {
  return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex')
}

export async function POST(request: Request) {
  const body = await request.json()
  const { pixel_id, access_token, event_name, event_data, user_data } = body

  if (!pixel_id || !access_token) {
    return NextResponse.json({ error: 'Missing pixel credentials' }, { status: 400 })
  }

  const payload = {
    data: [{
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: event_data.event_id || crypto.randomUUID(),
      event_source_url: event_data.source_url,
      action_source: 'website',
      user_data: {
        em: user_data.email ? hashData(user_data.email) : undefined,
        ph: user_data.phone ? hashData(user_data.phone.replace(/\D/g, '')) : undefined,
        client_ip_address: user_data.ip,
        client_user_agent: user_data.user_agent,
        fbp: user_data.fbp,
        fbc: user_data.fbc,
      },
      custom_data: {
        value: event_data.value,
        currency: event_data.currency || 'USD',
        content_name: event_data.content_name,
        content_type: 'product',
        content_ids: [event_data.content_id],
      },
    }],
    access_token,
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixel_id}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )

    const result = await response.json()

    return NextResponse.json({ success: true, result })
  } catch (error) {
    return NextResponse.json(
      { error: 'CAPI request failed', details: error },
      { status: 500 }
    )
  }
}
