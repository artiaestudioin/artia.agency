// api/send-email.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const ipStore = new Map();

function sanitize(str, maxLen = 300) {
  if (typeof str !== 'string') return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;').trim().slice(0, maxLen);
}

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

const ALLOWED_SERVICES = [
  'Páginas Webs',
  'Planes de Redes Sociales',
  'Impresión o Sublimados',
  'Branding Corporativo',
  'Fotografía o Video Profesionales',
  'Vuelos de Drone Profesional',
];

export default async function handler(req, res) {
  // CORS y Validaciones
  res.setHeader('Access-Control-Allow-Origin', 'https://artiaagency.vercel.app');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { name, emailFrom, service, message } = req.body || {};
  const cleanName = sanitize(name, 100);
  const cleanEmailFrom = sanitize(emailFrom, 200);
  const cleanService = sanitize(service, 100);
  const cleanMessage = sanitize(message, 1000);
  const folio = 'ART-' + Date.now().toString(36).toUpperCase();

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

    // 2. ENVIAR CORREO A ARTIA (USANDO RESEND)
    const responseArtia = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ARTIA Studio <onboarding@resend.dev>',
        to: ['artia.estudioin@gmail.com'],
        reply_to: cleanEmailFrom,
        subject: `[${folio}] Nueva consulta: ${cleanService}`,
        html: `<h1>Nueva consulta de ${cleanName}</h1><p>${cleanMessage}</p>`, // Simplificado para el ejemplo
      }),
    });

    if (responseArtia.ok) {
      return res.status(200).json({ ok: true, folio });
    } else {
      throw new Error('Error enviando el correo');
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  

  const now  = new Date();
  const fecha = now.toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/Guayaquil',
  });
  const hora = now.toLocaleTimeString('es-EC', {
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Guayaquil',
  });
  const year = now.getFullYear();

  // ==========================================
  // PLANTILLA 1: CORREO INTERNO (PARA ARTIA)
  // ==========================================
  const htmlEmail = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>Solicitud de Consultoría — ARTIA Studio</title>
</head>
<body style="margin:0;padding:0;background:#eef0f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef0f5;padding:32px 16px 48px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

  <tr><td style="font-size:0;max-height:0;overflow:hidden;mso-hide:all;">
    Nueva solicitud de consultoría recibida — ${cleanService} — Folio ${folio}
  </td></tr>

  <tr><td style="background:linear-gradient(135deg,#00113a 0%,#001f6b 100%);border-radius:12px 12px 0 0;padding:0;overflow:hidden;">

    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background:#2552ca;height:4px;font-size:0;">&nbsp;</td>
        <td style="background:#1a3fa0;height:4px;font-size:0;">&nbsp;</td>
        <td style="background:#0f2870;height:4px;font-size:0;">&nbsp;</td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:32px 40px 24px;text-align:center;">
          <img src="https://i.postimg.cc/fR4wJgg5/LOGO-ARTIA-blanco.png"
            alt="ARTIA Studio" width="150"
            style="display:block;margin:0 auto 12px;height:auto;"/>
          <p style="margin:0 0 4px;color:rgba(179,197,255,0.9);font-size:9px;letter-spacing:5px;text-transform:uppercase;font-weight:700;">
            Marketing &amp; Publicidad Integral
          </p>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.2);font-size:9px;letter-spacing:1px;">
            ─────────────────────────────────
          </p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:0 40px 32px;text-align:center;">
          <p style="margin:0 0 6px;color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.3px;">
            Solicitud de Consultoría
          </p>
          <p style="margin:0;color:rgba(179,197,255,0.6);font-size:11px;letter-spacing:1px;">
            Documento generado automáticamente por el sistema web
          </p>
        </td>
      </tr>
    </table>

  </td></tr>

  <tr><td style="background:#2552ca;padding:10px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="color:#b3c5ff;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
          📋 &nbsp;Nueva Consulta Entrante
        </td>
        <td align="right" style="color:#fff;font-size:10px;font-weight:900;letter-spacing:1px;">
          Folio: ${folio}
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="background:#ffffff;padding:36px 40px 32px;">

    <p style="margin:0 0 8px;font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:1px;">
      Estimado equipo ARTIA,
    </p>
    <p style="margin:0 0 28px;font-size:15px;color:#1e293b;line-height:1.7;">
      A través del portal web de <strong>ARTIA Studio</strong> se ha recibido una nueva solicitud
      de consultoría. A continuación se detallan los datos del prospecto:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:28px;border-collapse:separate;">

      <tr>
        <td colspan="2" style="background:#f1f5f9;padding:10px 20px;border-bottom:1px solid #e2e8f0;">
          <p style="margin:0;font-size:9px;font-weight:900;color:#64748b;letter-spacing:2px;text-transform:uppercase;">
            Información del Prospecto
          </p>
        </td>
      </tr>

      <tr>
        <td style="padding:14px 20px;border-bottom:1px solid #f1f5f9;width:36%;vertical-align:top;">
          <p style="margin:0;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Nombre completo</p>
        </td>
        <td style="padding:14px 20px;border-bottom:1px solid #f1f5f9;vertical-align:top;">
          <p style="margin:0;font-size:14px;font-weight:700;color:#0f172a;">${cleanName}</p>
        </td>
      </tr>

      <tr style="background:#fafbfc;">
        <td style="padding:14px 20px;border-bottom:1px solid #f1f5f9;vertical-align:top;">
          <p style="margin:0;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Correo electrónico</p>
        </td>
        <td style="padding:14px 20px;border-bottom:1px solid #f1f5f9;vertical-align:top;">
          <a href="mailto:${cleanEmailFrom}" style="font-size:14px;font-weight:700;color:#2552ca;text-decoration:none;">${cleanEmailFrom}</a>
        </td>
      </tr>

      <tr style="background:#fafbfc;">
        <td style="padding:14px 20px;border-bottom:1px solid #f1f5f9;vertical-align:top;">
          <p style="margin:0;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Servicio de interés</p>
        </td>
        <td style="padding:14px 20px;border-bottom:1px solid #f1f5f9;vertical-align:top;">
          <span style="display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:12px;font-weight:800;padding:5px 16px;border-radius:999px;letter-spacing:0.3px;">
            ${cleanService}
          </span>
        </td>
      </tr>

      <tr>
        <td style="padding:14px 20px;vertical-align:top;">
          <p style="margin:0;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Mensaje / Consulta</p>
        </td>
        <td style="padding:14px 20px;vertical-align:top;">
          <p style="margin:0;font-size:14px;color:#334155;line-height:1.75;font-style:${cleanMessage ? 'normal' : 'italic'};">
            ${cleanMessage || 'El prospecto no dejó mensaje adicional.'}
          </p>
        </td>
      </tr>

    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:32px;">
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
      <tr>
        <td style="background:#00113a;border-radius:8px;">
          <a href="mailto:${cleanEmailFrom}?subject=Re: Consulta ${folio} — ${cleanName}"
            style="display:inline-block;padding:14px 32px;color:#fff;font-size:11px;font-weight:900;letter-spacing:2px;text-transform:uppercase;text-decoration:none;">
            Responder a este prospecto →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;">
      Tiempo recomendado de respuesta: <strong style="color:#64748b;">menos de 24 horas hábiles.</strong>
    </p>

  </td></tr>

  <tr><td style="background:#f8fafc;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;padding:28px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="width:48px;vertical-align:top;padding-right:16px;">
          <img src="https://i.postimg.cc/fR4wJgg5/LOGO-ARTIA-blanco.png"
            alt="ARTIA" width="40" style="display:block;height:auto;"/>
        </td>
        <td style="vertical-align:top;">
          <p style="margin:0 0 2px;font-size:12px;font-weight:900;color:#00113a;letter-spacing:0.5px;">ARTIA Studio</p>
          <p style="margin:0 0 6px;font-size:10px;color:#64748b;font-style:italic;">Marketing &amp; Publicidad Integral</p>
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right:20px;">
                <p style="margin:0;font-size:10px;color:#94a3b8;">🌐 &nbsp;<a href="https://artiaagency.vercel.app" style="color:#2552ca;text-decoration:none;font-weight:600;">artiaagency.vercel.app</a></p>
              </td>
              <td>
                <p style="margin:0;font-size:10px;color:#94a3b8;">✉️ &nbsp;<a href="mailto:artia.estudioin@gmail.com" style="color:#2552ca;text-decoration:none;font-weight:600;">artia.estudioin@gmail.com</a></p>
              </td>
            </tr>
            <tr><td colspan="2" style="padding-top:4px;">
              <p style="margin:0;font-size:10px;color:#94a3b8;">📱 &nbsp;<a href="https://wa.me/593969937265" style="color:#2552ca;text-decoration:none;font-weight:600;">+593 969 937 265</a></p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="background:#00113a;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
    <p style="margin:0 0 6px;font-size:10px;color:rgba(179,197,255,0.5);line-height:1.6;">
      Este mensaje es confidencial y está destinado exclusivamente al equipo de <strong style="color:rgba(179,197,255,0.7);">ARTIA Studio</strong>.<br/>
      Fue generado automáticamente desde el portal web — no responder directamente a este correo.
    </p>
    <p style="margin:8px 0 0;font-size:10px;color:rgba(179,197,255,0.3);">
      © ${year} ARTIA Studio · Todos los derechos reservados · Ecuador
    </p>
  </td></tr>

</table>
</td></tr>
</table>

</body>
</html>`;

  // ==========================================
  // PLANTILLA 2: CONFIRMACIÓN AL CLIENTE
  // ==========================================
  const htmlClientEmail = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Recepción de Solicitud — ARTIA Studio</title>
</head>
<body style="margin:0;padding:0;background:#eef0f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef0f5;padding:32px 16px 48px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

  <tr><td style="font-size:0;max-height:0;overflow:hidden;mso-hide:all;">
    Hemos recibido tu solicitud de consultoría. Nuestro equipo se pondrá en contacto pronto.
  </td></tr>

  <tr><td style="background:linear-gradient(135deg,#00113a 0%,#001f6b 100%);border-radius:12px 12px 0 0;padding:0;overflow:hidden;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="background:#2552ca;height:4px;font-size:0;">&nbsp;</td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:32px 40px;text-align:center;">
          <img src="https://i.postimg.cc/fR4wJgg5/LOGO-ARTIA-blanco.png"
            alt="ARTIA Studio" width="130"
            style="display:block;margin:0 auto;height:auto;"/>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="background:#2552ca;padding:12px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="color:#fff;font-size:12px;font-weight:800;letter-spacing:1px;text-align:center;text-transform:uppercase;">
          Confirmación de Recepción
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td style="background:#ffffff;padding:36px 40px 32px;">

    <p style="margin:0 0 16px;font-size:16px;color:#0f172a;font-weight:700;">
      Estimado/a ${cleanName},
    </p>
    <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.7;">
      Gracias por contactar a <strong>ARTIA Studio</strong>. Te confirmamos que hemos recibido exitosamente tu solicitud de consultoría a través de nuestro portal web.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 8px;font-size:10px;font-weight:800;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Detalles de tu solicitud</p>
        <p style="margin:0 0 4px;font-size:14px;color:#1e293b;"><strong>Servicio:</strong> ${cleanService}</p>
        <p style="margin:0;font-size:14px;color:#1e293b;"><strong>Número de Folio:</strong> <span style="color:#2552ca;font-weight:700;">${folio}</span></p>
      </td></tr>
    </table>

    <p style="margin:0 0 28px;font-size:15px;color:#334155;line-height:1.7;">
      Uno de nuestros asesores especializados está revisando tu requerimiento y se pondrá en contacto contigo en un plazo máximo de <strong>24 horas hábiles</strong>.
    </p>

    <table cellpadding="0" cellspacing="0" border="0" style="margin:bottom:16px; width:100%;">
      <tr>
        <td align="center">
          <p style="margin:0 0 12px;font-size:13px;color:#64748b;">Si tienes una consulta urgente, puedes escribirnos por WhatsApp:</p>
          <a href="https://wa.me/593969937265" style="display:inline-block;background:#10b981;color:#fff;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:0.5px;">
            Contactar por WhatsApp
          </a>
        </td>
      </tr>
    </table>

  </td></tr>

  <tr><td style="background:#00113a;border-radius:0 0 12px 12px;padding:28px 40px;text-align:center;">
    <img src="https://i.ibb.co/SX5N8fSC/logo-artia-azul.png" alt="ARTIA" width="30" style="display:block;margin:0 auto 12px;opacity:0.8;"/>
    <p style="margin:0 0 6px;font-size:12px;color:#fff;font-weight:700;letter-spacing:1px;">ARTIA Studio</p>
    <p style="margin:0 0 12px;font-size:11px;color:rgba(255,255,255,0.6);">Marketing &amp; Publicidad Integral</p>
    <p style="margin:0 0 6px;font-size:10px;color:rgba(255,255,255,0.4);">
      Ecuador<br/>
      <a href="mailto:artia.estudioin@gmail.com" style="color:rgba(255,255,255,0.7);text-decoration:none;">artia.estudioin@gmail.com</a> | +593 969 937 265
    </p>
    <p style="margin:16px 0 0;font-size:9px;color:rgba(255,255,255,0.3);">
      Por favor no respondas a este correo generado automáticamente.
    </p>
  </td></tr>

</table>
</td></tr>
</table>

</body>
</html>`;
await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ARTIA Studio <onboarding@resend.dev>',
        to: [cleanEmailFrom],
        subject: `Hemos recibido tu solicitud — ARTIA Studio`,
        html: htmlCliente,
      }),
    });

    return res.status(200).json({ ok: true, folio });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }



