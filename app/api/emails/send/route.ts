import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

// POST /api/emails/send — envía plantilla con variables reemplazadas + adjuntos PDF
export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const {
    templateId,
    to,
    asunto,
    variables = {},
    pdfAttachments = [],   // Array de { name, url } — PDFs guardados en Supabase
  } = await req.json()

  if (!templateId || !to || !asunto) {
    return NextResponse.json({ error: 'Faltan campos: templateId, to, asunto' }, { status: 400 })
  }

  // 1. Obtener HTML de la plantilla (incluyendo PDF attachments guardados en la plantilla)
  const { data: template, error: dbError } = await supabase
    .from('email_templates')
    .select('html, name, pdf_attachments')
    .eq('id', templateId)
    .single()

  if (dbError || !template) {
    return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 })
  }

  // 2. Reemplazar variables {{nombre}}, {{folio}}, {{access_code}}, etc.
  let html = template.html
  for (const [key, value] of Object.entries(variables)) {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
  }

  // 3. Combinar adjuntos: los de la plantilla + los del envío actual
  const templatePdfs: Array<{ name: string; url: string }> = template.pdf_attachments ?? []
  const allPdfs = [...templatePdfs, ...pdfAttachments] as Array<{ name: string; url: string }>

  // 4. Descargar PDFs y preparar adjuntos de nodemailer
  const attachments: nodemailer.SendMailOptions['attachments'] = []

  for (const pdf of allPdfs) {
    try {
      const res = await fetch(pdf.url)
      if (!res.ok) continue
      const buffer = Buffer.from(await res.arrayBuffer())
      attachments.push({
        filename:    pdf.name,
        content:     buffer,
        contentType: 'application/pdf',
      })
    } catch (err) {
      console.error(`Error descargando PDF ${pdf.name}:`, err)
      // Continuamos — no bloqueamos el envío por un adjunto fallido
    }
  }

  // 5. Enviar con Nodemailer + Gmail
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
      attachments,
    })

    // 6. Guardar registro de envío
    await supabase.from('email_sends').insert([{
      template_id:    templateId,
      template_name:  template.name,
      sent_to:        to,
      subject:        asunto,
      has_attachment: attachments.length > 0,
    }]).maybeSingle()

    return NextResponse.json({ ok: true, attachmentCount: attachments.length })

  } catch (err: any) {
    console.error('Nodemailer error:', err)
    return NextResponse.json({ error: err.message ?? 'Error al enviar' }, { status: 500 })
  }
}
