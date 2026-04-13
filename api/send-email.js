// api/send-email.js
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const ipStore = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipStore.entries()) {
    if (now - data.start > RATE_LIMIT_WINDOW) ipStore.delete(ip);
  }
}, 60 * 60 * 1000);

function sanitize(str, maxLen = 300) {
  if (typeof str !== 'string') return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;').trim().slice(0, maxLen);
}

// Transporter Gmail via Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://artiaagency.vercel.app');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { name, emailFrom, service, message } = req.body || {};
  const cleanName      = sanitize(name, 100);
  const cleanEmailFrom = sanitize(emailFrom, 200);
  const cleanService   = sanitize(service, 100);
  const cleanMessage   = sanitize(message, 1000);
  const folio = 'ART-' + Date.now().toString(36).toUpperCase();

  const now   = new Date();
  const fecha = now.toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/Guayaquil',
  });
  const hora = now.toLocaleTimeString('es-EC', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Guayaquil',
  });
  const year = now.getFullYear();

  const htmlEmail = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#eef0f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef0f5;padding:32px 16px 48px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
  <tr><td style="background:linear-gradient(135deg,#00113a 0%,#001f6b 100%);border-radius:12px 12px 0 0;padding:0;overflow:hidden;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background:#2552ca;height:4px;font-size:0;">&nbsp;</td><td style="background:#1a3fa0;height:4px;font-size:0;">&nbsp;</td><td style="background:#0f2870;height:4px;font-size:0;">&nbsp;</td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:32px 40px 24px;text-align:center;">
        <img src="https://i.postimg.cc/fR4wJgg5/LOGO-ARTIA-blanco.png" alt="ARTIA Studio" width="150" style="display:block;margin:0 auto 12px;height:auto;"/>
        <p style="margin:0;color:rgba(179,197,255,0.9);font-size:9px;letter-spacing:5px;text-transform:uppercase;font-weight:700;">Marketing &amp; Publicidad Integral</p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:0 40px 32px;text-align:center;">
        <p style="margin:0 0 6px;color:#fff;font-size:20px;font-weight:800;">Solicitud de Consultoría</p>
        <p style="margin:0;color:rgba(179,197,255,0.6);font-size:11px;">Documento generado automáticamente por el sistema web</p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#2552ca;padding:10px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="color:#b3c5ff;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">📋 &nbsp;Nueva Consulta Entrante</td>
        <td align="right" style="color:#fff;font-size:10px;font-weight:900;">Folio: ${folio}</td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="background:#ffffff;padding:36px 40px 32px;">
    <p style="margin:0 0 28px;font-size:15px;color:#1e293b;line-height:1.7;">A través del portal web de <strong>ARTIA Studio</strong> se ha recibido una nueva solicitud de consultoría:</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:28px;border-collapse:separate;">
      <tr><td colspan="2" style="background:#f1f5f9;padding:10px 20px;border-bottom:1px solid #e2e8f0;">
        <p style="margin:0;font-size:9px;font-weight:900;color:#64748b;letter-spacing:2px;text-transform:uppercase;">Información del Prospecto</p>
      </td></tr>
      <tr>
        <td style="padding:14px 20px;border-bottom:1px solid #f1f5f9;width:36%;vertical-align:top;"><p style="margin:0;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Nombre completo</p></td>
        <td style="padding:14px 20px;border-bottom:1px solid #f1f5f9;vertical-align:top;"><p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">${cleanName}</p></td>
      </tr>
      <tr style="background:#fafbfc;">
        <td style="padding:14px 20px;border-bottom:1px solid #f1f5f9;vertical-align:top;"><p style="margin:0;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Correo electrónico</p></td>
        <td style="padding:14px 20px;border-bottom:1px solid #f1f5f9;vertical-align:top;"><a href="mailto:${cleanEmailFrom}" style="font-size:14px;font-weight:700;color:#2552ca;text-decoration:none;">${cleanEmailFrom}</a></td>
      </tr>
      <tr>
        <td style="padding:14px 20px;border-bottom:1px solid #f1f5f9;vertical-align:top;"><p style="margin:0;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Servicio de interés</p></td>
        <td style="padding:14px 20px;border-bottom:1px solid #f1f5f9;vertical-align:top;"><span style="display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:12px;font-weight:800;padding:5px 16px;border-radius:999px;">${cleanService}</span></td>
      </tr>
      <tr style="background:#fafbfc;">
        <td style="padding:14px 20px;vertical-align:top;"><p style="margin:0;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Mensaje / Consulta</p></td>
        <td style="padding:14px 20px;vertical-align:top;"><p style="margin:0;font-size:14px;color:#334155;line-height:1.75;">${cleanMessage || 'El prospecto no dejó mensaje adicional.'}</p></td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:32px;">
      <tr>
        <td style="padding:12px 20px;border-right:1px solid #e2e8f0;width:50%;">
          <p style="margin:0 0 2px;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Fecha de recepción</p>
          <p style="margin:0;font-size:12px;font-weight:700;color:#334155;">${fecha}</p>
        </td>
        <td style="padding:12px 20px;">
          <p style="margin:0 0 2px;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Hora (ECU)</p>
          <p style="margin:0;font-size:12px;font-weight:700;color:#334155;">${hora}</p>
        </td>
      </tr>
    </table>
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
      <tr><td style="background:#00113a;border-radius:8px;">
        <a href="mailto:${cleanEmailFrom}?subject=Re: Consulta ${folio} — ${cleanName}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;text-decoration:none;">Responder a este prospecto →</a>
      </td></tr>
    </table>
    <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">Tiempo recomendado de respuesta: <strong style="color:#64748b;">menos de 24 horas hábiles.</strong></p>
  </td></tr>
  <tr><td style="background:#00113a;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
    <p style="margin:0 0 6px;font-size:10px;color:rgba(179,197,255,0.5);line-height:1.6;">Este mensaje es confidencial y está destinado exclusivamente al equipo de <strong style="color:rgba(179,197,255,0.7);">ARTIA Studio</strong>.<br/>Fue generado automáticamente desde el portal web.</p>
    <p style="margin:8px 0 0;font-size:10px;color:rgba(179,197,255,0.3);">© ${year} ARTIA Studio · Todos los derechos reservados · Ecuador</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const htmlClientEmail = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#eef0f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef0f5;padding:32px 16px 48px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
  <tr><td style="background:linear-gradient(135deg,#00113a 0%,#001f6b 100%);border-radius:12px 12px 0 0;padding:0;overflow:hidden;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="background:#2552ca;height:4px;font-size:0;">&nbsp;</td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:32px 40px;text-align:center;">
        <img src="https://i.postimg.cc/fR4wJgg5/LOGO-ARTIA-blanco.png" alt="ARTIA Studio" width="130" style="display:block;margin:0 auto;height:auto;"/>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#2552ca;padding:12px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="color:#fff;font-size:12px;font-weight:800;letter-spacing:1px;text-align:center;text-transform:uppercase;">✅ &nbsp;Confirmación de Recepción</td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#ffffff;padding:36px 40px 32px;">
    <p style="margin:0 0 16px;font-size:16px;color:#0f172a;font-weight:700;">Estimado/a ${cleanName},</p>
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">Gracias por contactar a <strong>ARTIA Studio</strong>. Hemos recibido exitosamente tu solicitud de consultoría a través de nuestro portal web.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 8px;font-size:10px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Detalles de tu solicitud</p>
        <p style="margin:0 0 4px;font-size:14px;color:#1e293b;"><strong>Servicio:</strong> ${cleanService}</p>
        <p style="margin:0 0 4px;font-size:14px;color:#1e293b;"><strong>Número de Folio:</strong> <span style="color:#2552ca;font-weight:700;">${folio}</span></p>
        <p style="margin:0;font-size:14px;color:#1e293b;"><strong>Fecha:</strong> ${fecha} — ${hora}</p>
      </td></tr>
    </table>
    <p style="margin:0 0 28px;font-size:15px;color:#334155;line-height:1.7;">Uno de nuestros asesores revisará tu requerimiento y se pondrá en contacto en un plazo máximo de <strong>24 horas hábiles</strong>.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td align="center">
        <p style="margin:0 0 12px;font-size:13px;color:#64748b;">¿Tienes una consulta urgente? Escríbenos por WhatsApp:</p>
        <a href="https://wa.me/593969937265" style="display:inline-block;background:#10b981;color:#fff;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">Contactar por WhatsApp</a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#f8fafc;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.7;">
      🌐 <a href="https://artiaagency.vercel.app" style="color:#2552ca;text-decoration:none;font-weight:600;">artiaagency.vercel.app</a>
      &nbsp;·&nbsp;
      ✉️ <a href="mailto:artia.estudioin@gmail.com" style="color:#2552ca;text-decoration:none;font-weight:600;">artia.estudioin@gmail.com</a>
      &nbsp;·&nbsp;
      📱 <a href="https://wa.me/593969937265" style="color:#2552ca;text-decoration:none;font-weight:600;">+593 969 937 265</a>
    </p>
  </td></tr>
  <tr><td style="background:#00113a;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
    <p style="margin:0 0 6px;font-size:12px;color:#fff;font-weight:700;letter-spacing:1px;">ARTIA Studio</p>
    <p style="margin:0 0 8px;font-size:11px;color:rgba(255,255,255,0.6);">Marketing &amp; Publicidad Integral · Ecuador</p>
    <p style="margin:0;font-size:9px;color:rgba(255,255,255,0.3);">© ${year} ARTIA Studio · Por favor no respondas a este correo generado automáticamente.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  try {
    // 1. GUARDAR EN SUPABASE
    const { error: dbError } = await supabase
      .from('leads')
      .insert([{
        nombre: cleanName,
        email: cleanEmailFrom,
        servicio: cleanService,
        mensaje: cleanMessage,
        folio: folio
      }]);

    if (dbError) console.error('Error DB:', dbError.message);

    // 2. CORREO INTERNO → ARTIA
    await transporter.sendMail({
      from: `"ARTIA Studio" <${process.env.GMAIL_USER}>`,
      to: 'artia.estudioin@gmail.com',
      replyTo: cleanEmailFrom,
      subject: `[${folio}] Nueva consulta: ${cleanService}`,
      html: htmlEmail,
    });

    // 3. CORREO DE CONFIRMACIÓN → CLIENTE
    await transporter.sendMail({
      from: `"ARTIA Studio" <${process.env.GMAIL_USER}>`,
      to: cleanEmailFrom,
      subject: `Hemos recibido tu solicitud — ARTIA Studio [${folio}]`,
      html: htmlClientEmail,
    });

    return res.status(200).json({ ok: true, folio });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
