// api/send-email.js
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function sanitize(str, maxLen = 300) {
  if (typeof str !== 'string') return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;').trim().slice(0, maxLen);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

module.exports = async function handler(req, res) {
  // Manejo de CORS y OPTIONS
  res.setHeader('Access-Control-Allow-Origin', 'https://artiaagency.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { name, emailFrom, service, message, type, phone, products } = req.body || {};

  try {
    // ── 1. Tipo: Papelería Premium / Entrega Express ──
    if (type === 'impresion') {
      return await handleImpresion({ name, emailFrom, phone, products }, res);
    }

    // ── 2. Flujo general (consultoría) ──
    const cleanName = sanitize(name, 100);
    const cleanEmailFrom = sanitize(emailFrom, 200);
    const cleanService = sanitize(service, 100);
    const cleanMessage = sanitize(message, 1000);

    const now = new Date();
    const fecha = now.toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Guayaquil' });
    const hora = now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil' });
    const year = now.getFullYear();

    const { data: insertData, error: dbError } = await supabase
      .from('leads')
      .insert([{ nombre: cleanName, email: cleanEmailFrom, servicio: cleanService, mensaje: cleanMessage }])
      .select('folio_num')
      .single();

    if (dbError) throw dbError;

    const folio = 'ASMKT-' + String(361 + insertData.folio_num).padStart(4, '0');
    await supabase.from('leads').update({ folio }).eq('folio_num', insertData.folio_num);

    // Tus plantillas HTML originales (Consultoría)
    const htmlEmail = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#eef0f5;font-family:sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef0f5;padding:32px 16px;"><tr><td align="center"><table width="100%" style="max-width:600px;"><tr><td style="background:#00113a;padding:32px;text-align:center;"><img src="https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png" width="150" alt="ARTIA"/><p style="color:#fff;font-size:10px;text-transform:uppercase;letter-spacing:2px;">Nueva Consulta: ${folio}</p></td></tr><tr><td style="background:#fff;padding:40px;"><p><strong>Nombre:</strong> ${cleanName}</p><p><strong>Email:</strong> ${cleanEmailFrom}</p><p><strong>Servicio:</strong> ${cleanService}</p><p><strong>Mensaje:</strong> ${cleanMessage}</p><p style="font-size:12px;color:#64748b;">Recibido el ${fecha} a las ${hora}</p></td></tr></table></td></tr></table></body></html>`;

    const htmlClientEmail = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#eef0f5;font-family:sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef0f5;padding:32px 16px;"><tr><td align="center"><table width="100%" style="max-width:600px;"><tr><td style="background:#2552ca;padding:32px;text-align:center;"><img src="https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png" width="130" alt="ARTIA"/></td></tr><tr><td style="background:#fff;padding:40px;"><h2>¡Hola, ${cleanName}!</h2><p>Confirmamos la recepción de tu solicitud <strong>${folio}</strong>. Uno de nuestros asesores te contactará pronto.</p><p><strong>Servicio:</strong> ${cleanService}</p><a href="https://wa.me/593969937265" style="background:#10b981;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">WhatsApp Directo</a></td></tr></table></td></tr></table></body></html>`;

    await Promise.all([
      transporter.sendMail({ from: `"Artia Studio" <${process.env.GMAIL_USER}>`, to: 'artia.estudioin@gmail.com', replyTo: cleanEmailFrom, subject: `[${folio}] Nueva consulta: ${cleanService}`, html: htmlEmail }),
      transporter.sendMail({ from: `"Artia Studio" <${process.env.GMAIL_USER}>`, to: cleanEmailFrom, subject: `Hemos recibido tu solicitud — Artia Studio [${folio}]`, html: htmlClientEmail })
    ]);

    return res.status(200).json({ ok: true, folio });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

async function handleImpresion({ name, emailFrom, phone, products }, res) {
  const cleanName = sanitize(name, 100);
  const cleanEmail = sanitize(emailFrom, 200);
  const cleanPhone = sanitize(phone || '', 50);

  const { data: insertData, error: dbError } = await supabase
    .from('leads')
    .insert([{ nombre: cleanName, email: cleanEmail, servicio: 'Papelería Premium – Entrega Express', mensaje: `Tel: ${cleanPhone}\nProductos: ${JSON.stringify(products)}` }])
    .select('folio_num')
    .single();

  if (dbError) throw dbError;
  const folio = 'ASIMP-' + String(100 + insertData.folio_num).padStart(4, '0');
  await supabase.from('leads').update({ folio }).eq('folio_num', insertData.folio_num);

  const productRows = products.map(p => `<p>• ${p.name}: ${p.quantity} uds.</p>`).join('');

  const htmlInternal = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;"><h2>Nueva Impresión: ${folio}</h2><p><strong>Cliente:</strong> ${cleanName}</p>${productRows}</body></html>`;
  const htmlClient = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:20px;"><h2>Pedido Recibido: ${folio}</h2><p>Gracias ${cleanName}, procesamos tu pedido de papelería.</p></body></html>`;

  await Promise.all([
    transporter.sendMail({ from: `"Artia Studio" <${process.env.GMAIL_USER}>`, to: 'artia.estudioin@gmail.com', replyTo: cleanEmail, subject: `[${folio}] Pedido Impresión: ${cleanName}`, html: htmlInternal }),
    transporter.sendMail({ from: `"Artia Studio" <${process.env.GMAIL_USER}>`, to: cleanEmail, subject: `Pedido recibido — Artia Studio [${folio}]`, html: htmlClient })
  ]);

  return res.status(200).json({ ok: true, folio });
}
