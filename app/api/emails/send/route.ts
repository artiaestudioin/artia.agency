import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/emails/send — toma una plantilla de Supabase, reemplaza variables y envía con Resend
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Solo el admin puede enviar
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { templateId, to, asunto, variables = {} } = await req.json()

  if (!templateId || !to || !asunto) {
    return NextResponse.json({ error: 'Faltan campos obligatorios: templateId, to, asunto' }, { status: 400 })
  }

  // 1. Obtener el HTML de la plantilla desde Supabase
  const { data: template, error: dbError } = await supabase
    .from('email_templates')
    .select('html, name')
    .eq('id', templateId)
    .single()

  if (dbError || !template) {
    return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
  }

  // 2. Reemplazar variables {{nombre}}, {{folio}}, etc.
  let html = template.html
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    html = html.replace(regex, String(value))
  }

  // 3. Enviar con Resend
  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Artia Studio <noreply@artiaagency.vercel.app>',
        to: [to],
        subject: asunto,
        html,
      }),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      console.error('Resend error:', resendData)
      return NextResponse.json({ error: resendData.message ?? 'Error al enviar' }, { status: 500 })
    }

    // 4. Guardar registro de envío en Supabase (opcional pero recomendado)
    await supabase.from('email_sends').insert([{
      template_id:   templateId,
      template_name: template.name,
      sent_to:       to,
      subject:       asunto,
      resend_id:     resendData.id,
    }]).maybeSingle()

    return NextResponse.json({ ok: true, resendId: resendData.id })

  } catch (err) {
    console.error('Send error:', err)
    return NextResponse.json({ error: 'Error de conexión con Resend' }, { status: 500 })
  }
}
