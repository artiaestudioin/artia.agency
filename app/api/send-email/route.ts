import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

// ── Supabase (service role para operaciones de servidor) ──────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Rate limiting en memoria ──────────────────────────────────────────────────
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 min
const ipStore = new Map<string, { count: number; start: number }>()

setInterval(() => {
  const now = Date.now()
  for (const [ip, data] of ipStore.entries()) {
    if (now - data.start > RATE_LIMIT_WINDOW) ipStore.delete(ip)
  }
}, 60 * 60 * 1000)

// ── Nodemailer ────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
})

// ── Sanitización ──────────────────────────────────────────────────────────────
function sanitize(str: unknown, maxLen = 300): string {
  if (typeof str !== 'string') return ''
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .trim()
    .slice(0, maxLen)
}

// ── Handler principal ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // CORS para el dominio propio
  const origin = req.headers.get('origin') ?? ''
  const allowed = ['https://artiaagency.vercel.app', 'http://localhost:3000']
  if (origin && !allowed.includes(origin)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const { name, emailFrom, service, message, type, phone, products } = body ?? {}

  if (type === 'impresion') {
    return handleImpresion({ name, emailFrom, phone, products })
  }

  return handleConsultoria({ name, emailFrom, service, message })
}

// ── Flujo consultoría general ─────────────────────────────────────────────────
async function handleConsultoria({
  name, emailFrom, service, message,
}: Record<string, unknown>) {
  const cleanName      = sanitize(name, 100)
  const cleanEmailFrom = sanitize(emailFrom, 200)
  const cleanService   = sanitize(service, 100)
  const cleanMessage   = sanitize(message, 1000)

  const now   = new Date()
  const fecha = now.toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/Guayaquil',
  })
  const hora = now.toLocaleTimeString('es-EC', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Guayaquil',
  })
  const year = now.getFullYear()

  try {
    const { data: insertData, error: dbError } = await supabase
      .from('leads')
      .insert([{ nombre: cleanName, email: cleanEmailFrom, servicio: cleanService, mensaje: cleanMessage }])
      .select('folio_num')
      .single()

    if (dbError) throw new Error('Error guardando en base de datos')

    const folio = 'ASMKT-' + String(361 + insertData.folio_num).padStart(4, '0')

    await supabase
      .from('leads')
      .update({ folio })
      .eq('folio_num', insertData.folio_num)

    // Plantillas de email (igual que las originales — sin cambios)
    const htmlEmail = buildInternalEmail({ cleanName, cleanEmailFrom, cleanService, cleanMessage, folio, fecha, hora, year })
    const htmlClientEmail = buildClientEmail({ cleanName, cleanService, folio, fecha, hora })

    await transporter.sendMail({
      from: `"Artia Studio" <${process.env.GMAIL_USER}>`,
      to: 'artia.estudioin@gmail.com',
      replyTo: cleanEmailFrom,
      subject: `[${folio}] Nueva consulta: ${cleanService}`,
      html: htmlEmail,
    })

    await transporter.sendMail({
      from: `"Artia Studio" <${process.env.GMAIL_USER}>`,
      to: cleanEmailFrom,
      subject: `Hemos recibido tu solicitud — Artia Studio [${folio}]`,
      html: htmlClientEmail,
    })

    return NextResponse.json({ ok: true, folio })
  } catch (err) {
    console.error('Server error:', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}

// ── Flujo impresión ───────────────────────────────────────────────────────────
async function handleImpresion({
  name, emailFrom, phone, products,
}: Record<string, unknown>) {
  const cleanName  = sanitize(name, 100)
  const cleanEmail = sanitize(emailFrom, 200)
  const cleanPhone = sanitize(phone ?? '', 50)

  if (!cleanName || !cleanEmail) {
    return NextResponse.json({ error: 'Nombre y correo son obligatorios.' }, { status: 400 })
  }
  if (!Array.isArray(products) || products.length === 0) {
    return NextResponse.json({ error: 'Debe seleccionar al menos un producto.' }, { status: 400 })
  }

  const now   = new Date()
  const fecha = now.toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/Guayaquil',
  })
  const hora = now.toLocaleTimeString('es-EC', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil',
  })
  const year = now.getFullYear()

  const cleanProducts = (products as Array<{ name?: string; quantity?: string }>)
    .map(p => ({ name: sanitize(p.name ?? '', 100), quantity: sanitize(String(p.quantity ?? ''), 20) }))
    .filter(p => p.name)

  const mensajeResumen = cleanProducts.map(p => `• ${p.name}: ${p.quantity} unidades`).join('\n')

  try {
    const { data: insertData, error: dbError } = await supabase
      .from('leads')
      .insert([{
        nombre: cleanName,
        email: cleanEmail,
        servicio: 'Papelería Premium – Entrega Express',
        mensaje: (cleanPhone ? `Tel: ${cleanPhone}\n\n` : '') + mensajeResumen,
      }])
      .select('folio_num')
      .single()

    if (dbError) throw new Error('Error guardando en base de datos')

    const folio = 'ASIMP-' + String(100 + insertData.folio_num).padStart(4, '0')

    await supabase.from('leads').update({ folio }).eq('folio_num', insertData.folio_num)

    const htmlInternal = buildImpresionInternalEmail({ cleanName, cleanEmail, cleanPhone, cleanProducts, folio, year })
    const htmlClient   = buildImpresionClientEmail({ cleanName, cleanEmail, cleanProducts, folio, fecha, hora, year })

    await transporter.sendMail({
      from: `"Artia Studio" <${process.env.GMAIL_USER}>`,
      to: 'artia.estudioin@gmail.com',
      replyTo: cleanEmail,
      subject: `[${folio}] Nuevo pedido Papelería Express — ${cleanName}`,
      html: htmlInternal,
    })

    await transporter.sendMail({
      from: `"Artia Studio" <${process.env.GMAIL_USER}>`,
      to: cleanEmail,
      subject: `Tu solicitud de Papelería Premium fue recibida — Artia Studio [${folio}]`,
      html: htmlClient,
    })

    return NextResponse.json({ ok: true, folio })
  } catch (err) {
    console.error('Error impresión:', err)
    return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 })
  }
}

// ── Plantillas HTML (idénticas a las originales) ──────────────────────────────
function buildInternalEmail({ cleanName, cleanEmailFrom, cleanService, cleanMessage, folio, fecha, hora, year }: {
  cleanName: string; cleanEmailFrom: string; cleanService: string; cleanMessage: string
  folio: string; fecha: string; hora: string; year: number
}) {
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Solicitud de Consultoría — Artia Studio</title></head>
<body style="margin:0;padding:0;background:#eef0f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef0f5;padding:32px 16px 48px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
  <tr><td style="background:linear-gradient(135deg,#00113a 0%,#001f6b 100%);border-radius:12px 12px 0 0;padding:32px 40px 24px;text-align:center;">
    <img src="https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png" alt="ARTIA Studio" width="150" style="display:block;margin:0 auto 12px;height:auto;"/>
    <p style="margin:0;color:#fff;font-size:20px;font-weight:800;">Solicitud de Consultoría</p>
  </td></tr>
  <tr><td style="background:#2552ca;padding:10px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="color:#b3c5ff;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">📋 Nueva Consulta</td>
      <td align="right" style="color:#fff;font-size:10px;font-weight:900;">Folio: ${folio}</td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#ffffff;padding:36px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;border-collapse:separate;">
      <tr><td colspan="2" style="background:#f1f5f9;padding:10px 20px;border-bottom:1px solid #e2e8f0;"><p style="margin:0;font-size:9px;font-weight:900;color:#64748b;letter-spacing:2px;text-transform:uppercase;">Información del Prospecto</p></td></tr>
      <tr><td style="padding:14px 20px;width:36%;"><p style="margin:0;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Nombre</p></td><td style="padding:14px 20px;"><p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">${cleanName}</p></td></tr>
      <tr style="background:#fafbfc;"><td style="padding:14px 20px;"><p style="margin:0;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Correo</p></td><td style="padding:14px 20px;"><a href="mailto:${cleanEmailFrom}" style="font-size:14px;font-weight:700;color:#2552ca;text-decoration:none;">${cleanEmailFrom}</a></td></tr>
      <tr><td style="padding:14px 20px;"><p style="margin:0;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Servicio</p></td><td style="padding:14px 20px;"><span style="display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:12px;font-weight:800;padding:5px 16px;border-radius:999px;">${cleanService}</span></td></tr>
      <tr style="background:#fafbfc;"><td style="padding:14px 20px;vertical-align:top;"><p style="margin:0;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Mensaje</p></td><td style="padding:14px 20px;"><p style="margin:0;font-size:14px;color:#334155;line-height:1.75;">${cleanMessage || 'Sin mensaje adicional.'}</p></td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin:20px 0;">
      <tr>
        <td style="padding:12px 20px;border-right:1px solid #e2e8f0;width:50%;"><p style="margin:0 0 2px;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Fecha</p><p style="margin:0;font-size:12px;font-weight:700;color:#334155;">${fecha}</p></td>
        <td style="padding:12px 20px;"><p style="margin:0 0 2px;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Hora (ECU)</p><p style="margin:0;font-size:12px;font-weight:700;color:#334155;">${hora}</p></td>
      </tr>
    </table>
    <a href="mailto:${cleanEmailFrom}?subject=Re: Consulta ${folio} — ${cleanName}" style="display:inline-block;background:#00113a;color:#fff;padding:14px 32px;border-radius:8px;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;text-decoration:none;">Responder a este prospecto →</a>
  </td></tr>
  <tr><td style="background:#00113a;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
    <p style="margin:0;font-size:10px;color:rgba(179,197,255,0.3);">© ${year} Artia Studio · Ecuador · Generado automáticamente</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function buildClientEmail({ cleanName, cleanService, folio, fecha, hora }: {
  cleanName: string; cleanService: string; folio: string; fecha: string; hora: string
}) {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><title>Recepción de Solicitud — Artia Studio</title></head>
<body style="margin:0;padding:0;background:#eef0f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f5;padding:32px 16px 48px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
  <tr><td style="background:linear-gradient(135deg,#00113a 0%,#001f6b 100%);border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
    <img src="https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png" alt="ARTIA" width="130" style="display:block;margin:0 auto;height:auto;"/>
  </td></tr>
  <tr><td style="background:#2552ca;padding:12px 40px;text-align:center;">
    <p style="margin:0;color:#fff;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">✅ Confirmación de Recepción</p>
  </td></tr>
  <tr><td style="background:#ffffff;padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#0f172a;font-weight:700;">Estimado/a ${cleanName},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">Gracias por contactar a <strong>Artia Studio</strong>. Hemos recibido exitosamente tu solicitud.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 8px;font-size:10px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Detalles de tu solicitud</p>
        <p style="margin:0 0 4px;font-size:14px;color:#1e293b;"><strong>Servicio:</strong> ${cleanService}</p>
        <p style="margin:0 0 4px;font-size:14px;color:#1e293b;"><strong>Folio:</strong> <span style="color:#2552ca;font-weight:700;">${folio}</span></p>
        <p style="margin:0;font-size:14px;color:#1e293b;"><strong>Fecha:</strong> ${fecha} — ${hora}</p>
      </td></tr>
    </table>
    <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.7;">Nuestro equipo se pondrá en contacto en un máximo de <strong>24 horas hábiles</strong>.</p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="https://wa.me/593969937265" style="display:inline-block;background:#10b981;color:#fff;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">Contactar por WhatsApp</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="background:#00113a;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
    <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.3);">Por favor no respondas a este correo generado automáticamente.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function buildImpresionInternalEmail({ cleanName, cleanEmail, cleanPhone, cleanProducts, folio, year }: {
  cleanName: string; cleanEmail: string; cleanPhone: string
  cleanProducts: Array<{ name: string; quantity: string }>
  folio: string; year: number
}) {
  const rows = cleanProducts.map(p => `
    <tr>
      <td style="padding:12px 20px;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:700;color:#0f172a;">${p.name}</td>
      <td style="padding:12px 20px;border-bottom:1px solid #f1f5f9;text-align:center;"><span style="background:#dbeafe;color:#1e40af;font-size:12px;font-weight:800;padding:3px 10px;border-radius:20px;">${p.quantity} uds.</span></td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#eef0f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f5;padding:32px 16px 48px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
  <tr><td style="background:linear-gradient(135deg,#00113a 0%,#001f6b 100%);border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
    <img src="https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png" alt="ARTIA" width="140" style="display:block;margin:0 auto 10px;height:auto;"/>
    <p style="margin:0;color:rgba(179,197,255,0.85);font-size:9px;letter-spacing:5px;text-transform:uppercase;font-weight:700;">Papelería Premium — Entrega Express</p>
  </td></tr>
  <tr><td style="background:#2552ca;padding:10px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="color:#b3c5ff;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">🖨️ Nueva Solicitud de Impresión</td>
      <td align="right" style="color:#fff;font-size:10px;font-weight:900;">Folio: ${folio}</td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#fff;padding:36px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:24px;border-collapse:separate;">
      <tr><td colspan="2" style="background:#f1f5f9;padding:10px 20px;border-bottom:1px solid #e2e8f0;"><p style="margin:0;font-size:9px;font-weight:900;color:#64748b;letter-spacing:2px;text-transform:uppercase;">Datos del Cliente</p></td></tr>
      <tr><td style="padding:12px 20px;width:36%;"><p style="margin:0;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Nombre</p></td><td style="padding:12px 20px;"><p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">${cleanName}</p></td></tr>
      <tr style="background:#fafbfc;"><td style="padding:12px 20px;"><p style="margin:0;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Correo</p></td><td style="padding:12px 20px;"><a href="mailto:${cleanEmail}" style="color:#2552ca;font-size:14px;text-decoration:none;">${cleanEmail}</a></td></tr>
      ${cleanPhone ? `<tr><td style="padding:12px 20px;"><p style="margin:0;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Teléfono</p></td><td style="padding:12px 20px;"><p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">${cleanPhone}</p></td></tr>` : ''}
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:24px;border-collapse:separate;">
      <tr><td colspan="2" style="background:#f1f5f9;padding:10px 20px;border-bottom:1px solid #e2e8f0;"><p style="margin:0;font-size:9px;font-weight:900;color:#64748b;letter-spacing:2px;text-transform:uppercase;">Productos Solicitados</p></td></tr>
      ${rows}
    </table>
    <a href="mailto:${cleanEmail}?subject=Re: Solicitud Papelería ${folio} — ${cleanName}" style="display:inline-block;background:#00113a;color:#fff;padding:14px 32px;border-radius:8px;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;text-decoration:none;">Responder al cliente →</a>
  </td></tr>
  <tr><td style="background:#00113a;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
    <p style="margin:0;font-size:10px;color:rgba(179,197,255,0.3);">© ${year} Artia Studio · Ecuador</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function buildImpresionClientEmail({ cleanName, cleanProducts, folio, fecha, hora, year }: {
  cleanName: string; cleanEmail: string
  cleanProducts: Array<{ name: string; quantity: string }>
  folio: string; fecha: string; hora: string; year: number
}) {
  const productRows = cleanProducts.map(p =>
    `<p style="margin:0 0 6px;font-size:14px;color:#1e293b;"><strong>${p.name}:</strong> <span style="color:#2552ca;font-weight:700;">${p.quantity} unidades</span></p>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#eef0f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f5;padding:32px 16px 48px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
  <tr><td style="background:linear-gradient(135deg,#00113a 0%,#001f6b 100%);border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
    <img src="https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png" alt="ARTIA" width="130" style="display:block;margin:0 auto;height:auto;"/>
  </td></tr>
  <tr><td style="background:#2552ca;padding:12px 40px;text-align:center;">
    <p style="margin:0;color:#fff;font-size:12px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">✅ Hemos recibido tu pedido de Papelería Premium</p>
  </td></tr>
  <tr><td style="background:#fff;padding:36px 40px;">
    <p style="margin:0 0 16px;font-size:16px;color:#0f172a;font-weight:700;">¡Hola, ${cleanName}!</p>
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">Gracias por confiar en <strong>Artia Studio</strong>. Hemos recibido tu solicitud de <strong>Papelería Premium Express</strong>.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;"><p style="margin:0;font-size:9px;font-weight:900;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Resumen de tu solicitud</p></td></tr>
      <tr><td style="padding:16px 20px;">
        ${productRows}
        <p style="margin:12px 0 4px;font-size:13px;color:#1e293b;"><strong>Folio:</strong> <span style="color:#2552ca;font-weight:800;">${folio}</span></p>
        <p style="margin:0;font-size:13px;color:#1e293b;"><strong>Fecha:</strong> ${fecha} — ${hora}</p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="https://wa.me/593969937265?text=Hola%20Artia,%20acabo%20de%20enviar%20una%20solicitud%20con%20folio%20${folio}" style="display:inline-block;background:#10b981;color:#fff;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;">Contactar por WhatsApp</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="background:#00113a;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
    <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.3);">© ${year} Artia Studio · Ecuador</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
