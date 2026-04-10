// api/send-email.js — Vercel Serverless Function
// Versión segura: rate limiting, sanitización, validación estricta

// ── Rate limiting en memoria (por IP) ──────────────────────────────────────
const RATE_LIMIT_MAX    = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const ipStore = new Map();

function checkRateLimit(ip) {
  const now  = Date.now();
  const data = ipStore.get(ip) || { count: 0, start: now };
  if (now - data.start > RATE_LIMIT_WINDOW) { data.count = 0; data.start = now; }
  data.count++;
  ipStore.set(ip, data);
  return data.count <= RATE_LIMIT_MAX;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipStore.entries()) {
    if (now - data.start > RATE_LIMIT_WINDOW) ipStore.delete(ip);
  }
}, 60 * 60 * 1000);

// ── Sanitizar texto ────────────────────────────────────────────────────────
function sanitize(str, maxLen = 300) {
  if (typeof str !== 'string') return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;').trim().slice(0, maxLen);
}

// ── Servicios permitidos (whitelist) ───────────────────────────────────────
const ALLOWED_SERVICES = [
  'Páginas Webs',
  'Planes de Redes Sociales',
  'Impresión o Sublimados',
  'Branding Corporativo',
  'Fotografía o Video Profesionales',
  'Vuelos de Drone Profesional',
];

// ──────────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', 'https://artiaagency.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Método no permitido.' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Intenta en 15 minutos.' });
  }

  const { name, service, message } = req.body || {};
  const cleanName    = sanitize(name, 100);
  const cleanService = sanitize(service, 100);
  const cleanMessage = sanitize(message, 1000);

  if (!cleanName)                             return res.status(400).json({ error: 'El nombre es requerido.' });
  if (!ALLOWED_SERVICES.includes(cleanService)) return res.status(400).json({ error: 'Servicio no válido.' });

  if (!process.env.RESEND_API_KEY) {
    console.error('Falta RESEND_API_KEY');
    return res.status(500).json({ error: 'Error de configuración del servidor.' });
  }

  const fecha = new Date().toLocaleDateString('es-EC', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'America/Guayaquil',
  });

  const year = new Date().getFullYear();

  const htmlEmail = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f0f2f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f2f7;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

        <tr><td style="background:#00113a;border-radius:12px 12px 0 0;padding:36px 40px 28px;text-align:center;">
          <img src="https://i.ibb.co/3mf5qLTc/LOGO-ARTIA-blanco.png" alt="ARTIA Studio" width="160" style="display:block;margin:0 auto 16px;height:auto;"/>
          <p style="margin:0;color:rgba(179,197,255,0.7);font-size:10px;letter-spacing:4px;text-transform:uppercase;font-weight:600;">Marketing &amp; Publicidad Integral</p>
        </td></tr>

        <tr><td style="background:#2552ca;padding:14px 40px;">
          <p style="margin:0;color:#fff;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">📩 &nbsp;Nueva Solicitud de Consultoría</p>
        </td></tr>

        <tr><td style="background:#ffffff;padding:40px 40px 32px;">
          <p style="margin:0 0 24px;font-size:15px;color:#1e293b;line-height:1.6;">Hola equipo <strong>ARTIA</strong>, han recibido una nueva consulta a través del sitio web.</p>

          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:28px;">
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;">
              <p style="margin:0 0 2px;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Nombre del cliente</p>
              <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">${cleanName}</p>
            </td></tr>
            <tr><td style="padding:14px 20px;border-bottom:1px solid #e2e8f0;background:#fff;">
              <p style="margin:0 0 2px;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Servicio requerido</p>
              <p style="margin:0;"><span style="display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:13px;font-weight:700;padding:4px 14px;border-radius:999px;">${cleanService}</span></p>
            </td></tr>
            <tr><td style="padding:14px 20px;">
              <p style="margin:0 0 6px;font-size:9px;font-weight:800;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">Mensaje</p>
              <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;">${cleanMessage || '<em>El cliente no dejó mensaje adicional.</em>'}</p>
            </td></tr>
          </table>

          <p style="margin:0 0 28px;font-size:12px;color:#94a3b8;">🗓 &nbsp;Recibido el <strong style="color:#64748b;">${fecha}</strong></p>

          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="background:#2552ca;border-radius:8px;">
              <a href="mailto:artia.estudioin@gmail.com" style="display:inline-block;padding:14px 28px;color:#fff;font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;">Responder →</a>
            </td>
          </tr></table>
        </td></tr>

        <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#00113a;letter-spacing:1px;text-transform:uppercase;">ARTIA Studio</p>
          <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;">Marketing &amp; Publicidad Integral</p>
          <p style="margin:0;font-size:11px;color:#94a3b8;">
            <a href="https://artiaagency.vercel.app" style="color:#2552ca;text-decoration:none;">artiaagency.vercel.app</a>
            &nbsp;·&nbsp;
            <a href="mailto:artia.estudioin@gmail.com" style="color:#2552ca;text-decoration:none;">artia.estudioin@gmail.com</a>
          </p>
        </td></tr>

        <tr><td style="padding:20px 0 0;text-align:center;">
          <p style="margin:0;font-size:10px;color:#cbd5e1;">
            Este correo fue generado automáticamente desde el sitio web de ARTIA Studio.<br/>
            © ${year} ARTIA Studio. Todos los derechos reservados.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    'ARTIA Studio <onboarding@resend.dev>',
        to:      ['artia.estudioin@gmail.com'],
        subject: `Nueva consulta: ${cleanService} — ${cleanName}`,
        html:    htmlEmail,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Resend error:', err);
      return res.status(500).json({ error: 'Error al enviar el correo.' });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
}
