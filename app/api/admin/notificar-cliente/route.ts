import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { folio, mensaje_personalizado } = await req.json()
  if (!folio) return NextResponse.json({ error: 'Falta el folio' }, { status: 400 })

  const { data: lead, error } = await supabase
    .from('leads')
    .select('nombre, email, servicio, estado')
    .eq('folio', folio)
    .single()

  if (error || !lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })
  if (!lead.email) return NextResponse.json({ error: 'Este lead no tiene email registrado' }, { status: 400 })

  const ESTADO_LABELS: Record<string, string> = {
    nuevo:      '📩 Solicitud recibida',
    contactado: '🔍 En revisión',
    en_proceso: '⚙️ En proceso',
    cerrado:    '✅ Completado',
    perdido:    '❌ Cerrado',
  }

  const estadoLabel = ESTADO_LABELS[lead.estado ?? 'nuevo'] ?? lead.estado

  // ── URL PÚBLICA — el cliente no necesita contraseña ────────────────────────
  const trackingUrl = `https://artiaagency.vercel.app/seguimiento/${folio}`

  const mensajeFinal = mensaje_personalizado?.trim()
    ? `<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">${mensaje_personalizado}</p>`
    : `<p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.7;">Queremos informarte que el estado de tu solicitud ha sido actualizado a: <strong>${estadoLabel}</strong></p>`

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#eef0f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f5;padding:32px 16px 48px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
  <tr><td style="background:linear-gradient(135deg,#00113a 0%,#1e3a7a 100%);border-radius:12px 12px 0 0;padding:28px 40px;text-align:center;">
    <img src="https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png" alt="ARTIA" width="120" style="display:block;margin:0 auto;height:auto;"/>
  </td></tr>
  <tr><td style="background:#2552ca;padding:10px 40px;text-align:center;">
    <p style="margin:0;color:#fff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Actualización de tu pedido · ${folio}</p>
  </td></tr>
  <tr><td style="background:#fff;padding:32px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#0f172a;font-weight:700;">Hola, ${lead.nombre} 👋</p>
    ${mensajeFinal}
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:20px 0;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Estado actual</p>
        <p style="margin:0;font-size:16px;font-weight:800;color:#00113a;">${estadoLabel}</p>
      </td></tr>
    </table>
    <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6;">
      Puedes ver el estado completo de tu pedido haciendo clic en el botón. No necesitas contraseña.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${trackingUrl}" style="display:inline-block;background:#00113a;color:#fff;padding:14px 32px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
        Ver seguimiento de mi pedido →
      </a>
    </td></tr></table>
    <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
      O copia este enlace: <a href="${trackingUrl}" style="color:#2552ca;">${trackingUrl}</a>
    </p>
  </td></tr>
  <tr><td style="background:#00113a;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
    <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.3);">© ${new Date().getFullYear()} Artia Studio · Ecuador</p>
  </td></tr>
</table></td></tr></table></body></html>`

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
    })

    await transporter.sendMail({
      from: `"Artia Studio" <${process.env.GMAIL_USER}>`,
      to: lead.email,
      subject: `[${folio}] Actualización de tu pedido — Artia Studio`,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al enviar'
    console.error('Email error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
