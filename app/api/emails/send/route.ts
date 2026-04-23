import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

// POST /api/emails/send — toma plantilla de Supabase, reemplaza variables y envía con Gmail/Nodemailer
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  // Solo admin autenticado puede enviar
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { templateId, to, asunto, variables = {} } = await req.json()

  if (!templateId || !to || !asunto) {
    return NextResponse.json({ error: 'Faltan campos: templateId, to, asunto' }, { status: 400 })
  }

  // 1. Obtener HTML de la plantilla
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
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
  }

  // 3. Enviar con Nodemailer + Gmail (mismo transporte que send-email)
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    })

    await transporter.sendMail({
      from: `"Artia Studio" <${process.env.GMAIL_USER}>`,
      to,
      subject: asunto,
      html,
    })

    // 4. Guardar registro de envío en Supabase
    await supabase.from('email_sends').insert([{
      template_id:   templateId,
      template_name: template.name,
      sent_to:       to,
      subject:       asunto,
    }]).maybeSingle()

    return NextResponse.json({ ok: true })

  } catch (err: any) {
    console.error('Nodemailer error:', err)
    return NextResponse.json({ error: err.message ?? 'Error al enviar' }, { status: 500 })
  }
}
