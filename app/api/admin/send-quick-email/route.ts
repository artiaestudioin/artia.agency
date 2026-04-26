import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { to, asunto, cuerpo, nombre, folio } = await req.json()

  if (!to || !asunto || !cuerpo) {
    return NextResponse.json({ error: 'to, asunto y cuerpo son requeridos' }, { status: 400 })
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    })

    const htmlBody = cuerpo
      .split('\n')
      .map((line: string) => `<p style="margin:0 0 10px;color:#475569;font-size:14px;line-height:1.6;">${line || '&nbsp;'}</p>`)
      .join('')

    await transporter.sendMail({
      from: `"Artia Studio" <${process.env.GMAIL_USER}>`,
      to,
      subject: asunto,
      html: `
<!DOCTYPE html><html lang="es">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:32px 16px;background:#eef0f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;">
  <div style="background:#00113a;padding:24px 32px;">
    <img src="https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png" alt="ARTIA" width="120" style="height:auto;display:block;"/>
  </div>
  <div style="padding:32px;">
    ${htmlBody}
    ${folio ? `<div style="margin-top:24px;padding:12px 16px;background:#f8fafc;border-radius:8px;border-left:3px solid #2552ca;"><span style="font-size:11px;color:#94a3b8;font-family:monospace;letter-spacing:1px;">Ref: ${folio}</span></div>` : ''}
  </div>
  <div style="background:#00113a;padding:20px 32px;text-align:center;">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);">Artia Studio · artia.estudioin@gmail.com · +593 969 937 265</p>
  </div>
</div>
</body></html>`,
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('send-quick-email error:', err)
    return NextResponse.json({ error: err.message ?? 'Error al enviar email' }, { status: 500 })
  }
}
