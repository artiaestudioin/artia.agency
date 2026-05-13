/**
 * fab-artia.js — Artia Studio Floating Action Button
 * ─────────────────────────────────────────────────
 * Minimal SaaS aesthetic. Draggable on mobile.
 * Email form POSTs to /api/send-email (same backend as artia-modal.js):
 *   → Server inserts Supabase lead + generates folio
 *   → Sends internal email to artia.estudioin@gmail.com
 *   → Sends confirmation email to the client
 *
 * Usage: <script src="fab-artia.js"></script> before </body>
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────
     SHARED EMAIL UTILITY  (exposed as window.artiaSendConsultation)
     Used by both fab-artia.js and artia-modal.js so both components
     share identical API call, error handling, and delivery behavior.
  ───────────────────────────────────────────────────────── */
  window.artiaSendConsultation = async function (payload) {
    // payload: { name, emailFrom, service, message }
    const res  = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Error del servidor');
    return data; // { ok: true, folio: 'ASMKT-XXXX' }
  };

  /* ─────────────────────────────────────────────────────────
     CSS
  ───────────────────────────────────────────────────────── */
  const CSS = `
    #artia-fab-root *, #artia-email-modal * { box-sizing: border-box; }

    /* ── Trigger button ───────────────────────────────── */
    #artia-fab-btn {
      width: 48px; height: 48px;
      border-radius: 50%;
      background: #1a3fb5;
      border: none; cursor: pointer;
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 14px rgba(26,63,181,.38);
      transition: box-shadow .2s, transform .18s;
      -webkit-tap-highlight-color: transparent;
      touch-action: none; user-select: none;
      position: relative; z-index: 2; outline: none;
    }
    #artia-fab-btn:hover  { box-shadow: 0 6px 20px rgba(26,63,181,.48); transform: scale(1.06); }
    #artia-fab-btn:active { transform: scale(.96); }
    #artia-fab-btn.open   { background: #0f2245; animation: none !important; }
    #artia-fab-btn svg    { transition: transform .22s cubic-bezier(.4,0,.2,1); }
    #artia-fab-btn.open svg { transform: rotate(45deg); }

    @keyframes afbPulse {
      0%  { box-shadow: 0 4px 14px rgba(26,63,181,.38), 0 0 0 0 rgba(26,63,181,.22); }
      65% { box-shadow: 0 4px 14px rgba(26,63,181,.38), 0 0 0 10px rgba(26,63,181,0); }
      100%{ box-shadow: 0 4px 14px rgba(26,63,181,.38), 0 0 0 0 rgba(26,63,181,0); }
    }
    #artia-fab-btn:not(.open):not(:hover) { animation: afbPulse 3s ease infinite; }

    /* ── Root wrapper ─────────────────────────────────── */
    #artia-fab-root {
      position: fixed;
      bottom: 24px; right: 20px;
      z-index: 9000;
      display: flex; flex-direction: column; align-items: flex-end;
      user-select: none; touch-action: none;
    }

    /* ── Menu panel ───────────────────────────────────── */
    #artia-fab-panel {
      position: absolute;
      bottom: calc(100% + 10px);
      right: 0;
      width: 208px;
      background: #fff;
      border: 1px solid rgba(0,0,0,.08);
      border-radius: 14px;
      box-shadow: 0 8px 28px rgba(0,0,0,.10), 0 2px 8px rgba(0,0,0,.05);
      padding: 6px;
      opacity: 0; pointer-events: none;
      transform: translateY(6px) scale(.97);
      transform-origin: bottom right;
      transition: opacity .16s ease, transform .18s cubic-bezier(.4,0,.2,1);
    }
    #artia-fab-panel.open {
      opacity: 1; pointer-events: auto;
      transform: translateY(0) scale(1);
    }

    .afp-head {
      padding: 10px 12px 9px;
      border-bottom: 1px solid #f1f5f9;
      margin-bottom: 4px;
    }
    .afp-head-eyebrow {
      font-size: 9px; font-weight: 700; letter-spacing: .1em;
      text-transform: uppercase; color: #94a3b8;
      font-family: system-ui, sans-serif;
    }
    .afp-head-title {
      font-size: 12px; font-weight: 700; color: #0f172a;
      font-family: system-ui, sans-serif; margin-top: 1px;
    }

    .afp-item {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px; border-radius: 9px;
      text-decoration: none; border: none; background: none;
      cursor: pointer; width: 100%; text-align: left;
      transition: background .1s;
      font-family: system-ui, sans-serif;
    }
    .afp-item:hover  { background: #f8fafc; }
    .afp-item:active { background: #f1f5f9; }

    .afp-icon {
      width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .afp-icon--wa    { background: #dcfce7; }
    .afp-icon--phone { background: #ede9fe; }
    .afp-icon--email { background: #fef3c7; }

    .afp-label { font-size: 12.5px; font-weight: 600; color: #0f172a; display: block; line-height: 1.25; }
    .afp-sub   { font-size: 10px; color: #94a3b8; }

    /* ── Email modal overlay ──────────────────────────── */
    #artia-email-modal {
      position: fixed; inset: 0; z-index: 9500;
      display: flex; align-items: center; justify-content: center; padding: 16px;
      background: rgba(2,6,23,.45);
      backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
      opacity: 0; pointer-events: none;
      transition: opacity .2s ease;
    }
    #artia-email-modal.open { opacity: 1; pointer-events: auto; }

    .aem-card {
      background: #fff;
      border-radius: 18px;
      width: 100%; max-width: 376px;
      box-shadow: 0 20px 50px rgba(0,0,0,.14), 0 4px 12px rgba(0,0,0,.06);
      overflow: hidden;
      transform: translateY(10px) scale(.98);
      transition: transform .22s cubic-bezier(.34,1.56,.64,1);
    }
    #artia-email-modal.open .aem-card { transform: translateY(0) scale(1); }

    .aem-header {
      background: #0a1628;
      padding: 18px 20px 16px;
      display: flex; align-items: flex-start; justify-content: space-between;
    }
    .aem-brand-name {
      font-size: 11px; font-weight: 800; letter-spacing: .14em;
      text-transform: uppercase; color: rgba(255,255,255,.88);
      font-family: system-ui, sans-serif; display: block;
    }
    .aem-brand-sub {
      font-size: 10px; color: rgba(255,255,255,.35);
      font-family: system-ui, sans-serif; margin-top: 2px; display: block;
    }
    .aem-close {
      background: rgba(255,255,255,.08); border: none; color: rgba(255,255,255,.55);
      border-radius: 50%; width: 26px; height: 26px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background .15s, color .15s; flex-shrink: 0;
      font-family: system-ui, sans-serif;
    }
    .aem-close:hover { background: rgba(255,255,255,.16); color: #fff; }

    .aem-body { padding: 18px 20px 20px; display: flex; flex-direction: column; gap: 12px; }

    .aem-field label {
      display: block;
      font-size: 10px; font-weight: 700; letter-spacing: .08em;
      text-transform: uppercase; color: #94a3b8; margin-bottom: 5px;
      font-family: system-ui, sans-serif;
    }
    .aem-field input,
    .aem-field select,
    .aem-field textarea {
      width: 100%;
      background: #f8fafc; border: 1.5px solid #e8edf2;
      border-radius: 9px; padding: 9px 12px;
      font-size: 13.5px; font-weight: 500; color: #0f172a;
      font-family: system-ui, sans-serif;
      outline: none; transition: border-color .15s, background .15s;
      -webkit-appearance: none; appearance: none;
    }
    .aem-field input:focus,
    .aem-field select:focus,
    .aem-field textarea:focus { border-color: #1a3fb5; background: #f0f4ff; }
    .aem-field input::placeholder,
    .aem-field textarea::placeholder { color: #c0c8d8; }
    .aem-field textarea { resize: none; line-height: 1.5; }

    .aem-field.has-err input,
    .aem-field.has-err select,
    .aem-field.has-err textarea { border-color: #fca5a5; background: #fff9f9; }
    .aem-field .aem-err { display: none; font-size: 10.5px; color: #ef4444; margin-top: 4px; font-family: system-ui, sans-serif; }
    .aem-field.has-err .aem-err { display: block; }

    @keyframes aemShake {
      0%,100%{ transform: translateX(0); }
      30%    { transform: translateX(-4px); }
      70%    { transform: translateX(4px); }
    }
    .aem-field.has-err input,
    .aem-field.has-err select { animation: aemShake .25s ease; }

    .aem-submit {
      background: #1a3fb5; color: #fff; border: none; border-radius: 10px;
      padding: 12px 16px; font-size: 12px; font-weight: 700; letter-spacing: .06em;
      text-transform: uppercase; cursor: pointer; width: 100%;
      display: flex; align-items: center; justify-content: center; gap: 7px;
      font-family: system-ui, sans-serif;
      transition: background .15s, transform .15s, box-shadow .15s;
      box-shadow: 0 2px 8px rgba(26,63,181,.22);
    }
    .aem-submit:hover   { background: #1535a0; box-shadow: 0 4px 14px rgba(26,63,181,.3); }
    .aem-submit:active  { transform: scale(.98); }
    .aem-submit:disabled{ opacity: .65; cursor: not-allowed; transform: none !important; }
    .aem-submit.success { background: #059669; box-shadow: 0 2px 8px rgba(5,150,105,.28); }
    .aem-submit.error   { background: #dc2626; box-shadow: 0 2px 8px rgba(220,38,38,.28); }

    @keyframes aemSpin { to { transform: rotate(360deg); } }
    .aem-spinner {
      width: 14px; height: 14px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,.28); border-top-color: #fff;
      animation: aemSpin .6s linear infinite; flex-shrink: 0;
    }

    .aem-footer-note {
      font-size: 10px; color: #94a3b8; text-align: center;
      font-family: system-ui, sans-serif; margin: 0;
    }
  `;

  const sEl = document.createElement('style');
  sEl.textContent = CSS;
  document.head.appendChild(sEl);

  /* ─────────────────────────────────────────────────────────
     SVG ICONS
  ───────────────────────────────────────────────────────── */
  const ICON_WA    = `<svg width="16" height="16" viewBox="0 0 24 24" fill="#16a34a"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`;
  const ICON_PHONE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="#7c3aed"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`;
  const ICON_EMAIL = `<svg width="16" height="16" viewBox="0 0 24 24" fill="#d97706"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`;
  const ICON_CHAT  = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>`;
  const ICON_CLOSE = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
  const ICON_SEND  = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;
  const ICON_CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;

  /* ─────────────────────────────────────────────────────────
     HTML
  ───────────────────────────────────────────────────────── */
  document.body.insertAdjacentHTML('beforeend', `
    <div id="artia-fab-root">
      <!-- Menu panel -->
      <div id="artia-fab-panel" role="menu">
        <div class="afp-head">
          <div class="afp-head-eyebrow">Artia Studio</div>
          <div class="afp-head-title">¿En qué podemos ayudarte?</div>
        </div>
        <a class="afp-item" href="https://wa.me/593969937265" target="_blank" rel="noopener noreferrer" role="menuitem">
          <div class="afp-icon afp-icon--wa">${ICON_WA}</div>
          <div>
            <span class="afp-label">WhatsApp</span>
            <span class="afp-sub">Respuesta inmediata</span>
          </div>
        </a>
        <a class="afp-item" href="tel:+593969937265" role="menuitem">
          <div class="afp-icon afp-icon--phone">${ICON_PHONE}</div>
          <div>
            <span class="afp-label">Llamar</span>
            <span class="afp-sub">+593 96 993 7265</span>
          </div>
        </a>
        <button class="afp-item" id="afp-email-btn" role="menuitem">
          <div class="afp-icon afp-icon--email">${ICON_EMAIL}</div>
          <div>
            <span class="afp-label">Consultoría por email</span>
            <span class="afp-sub">Respondemos en &lt;2 h</span>
          </div>
        </button>
      </div>
      <!-- Trigger -->
      <button id="artia-fab-btn" aria-label="Contacto rápido" aria-expanded="false">${ICON_CHAT}</button>
    </div>

    <!-- Email form modal -->
    <div id="artia-email-modal" role="dialog" aria-modal="true" aria-label="Solicitud de consultoría">
      <div class="aem-card">
        <div class="aem-header">
          <div>
            <span class="aem-brand-name">Artia Studio</span>
            <span class="aem-brand-sub">Solicitud de consultoría</span>
          </div>
          <button class="aem-close" id="aem-close-btn" aria-label="Cerrar">${ICON_CLOSE}</button>
        </div>
        <div class="aem-body">
          <div class="aem-field" id="aem-f-name">
            <label for="aem-inp-name">Nombre</label>
            <input id="aem-inp-name" type="text" placeholder="Nombre y apellido" autocomplete="name">
            <p class="aem-err">Ingresa tu nombre completo</p>
          </div>
          <div class="aem-field" id="aem-f-email">
            <label for="aem-inp-email">Correo electrónico</label>
            <input id="aem-inp-email" type="email" placeholder="tu@correo.com" autocomplete="email">
            <p class="aem-err">Ingresa un correo válido</p>
          </div>
          <div class="aem-field" id="aem-f-service">
            <label for="aem-inp-service">Servicio</label>
            <select id="aem-inp-service">
              <option value="">Selecciona un servicio…</option>
              <option>Páginas Web</option>
              <option>Planes de Redes Sociales</option>
              <option>Papelería Premium – Entrega Express</option>
              <option>Impresión o Sublimados</option>
              <option>Branding Corporativo</option>
              <option>Fotografía o Video Profesional</option>
              <option>Vuelos de Drone Profesional</option>
            </select>
            <p class="aem-err">Selecciona un servicio</p>
          </div>
          <div class="aem-field">
            <label for="aem-inp-msg">Mensaje <span style="color:#c0c8d8;font-weight:400;text-transform:none;">(opcional)</span></label>
            <textarea id="aem-inp-msg" rows="3" placeholder="Cuéntanos brevemente tu proyecto…"></textarea>
          </div>
          <button class="aem-submit" id="aem-submit-btn">
            Enviar consulta ${ICON_SEND}
          </button>
          <p class="aem-footer-note">
            Recibirás una confirmación automática en tu correo.
          </p>
        </div>
      </div>
    </div>
  `);

  /* ─────────────────────────────────────────────────────────
     FAB LOGIC — click toggle + drag (mobile)
  ───────────────────────────────────────────────────────── */
  const fabRoot  = document.getElementById('artia-fab-root');
  const fabBtn   = document.getElementById('artia-fab-btn');
  const panel    = document.getElementById('artia-fab-panel');
  const emailBtn = document.getElementById('afp-email-btn');

  let panelOpen = false;

  function openPanel() {
    panelOpen = true;
    fabBtn.classList.add('open');
    panel.classList.add('open');
    fabBtn.setAttribute('aria-expanded', 'true');
    // Flip panel horizontally if FAB is near right edge
    const r = fabRoot.getBoundingClientRect();
    const nearRight = r.left > window.innerWidth * 0.5;
    panel.style.left  = nearRight ? 'auto' : '0';
    panel.style.right = nearRight ? '0'    : 'auto';
    panel.style.transformOrigin = nearRight ? 'bottom right' : 'bottom left';
  }

  function closePanel() {
    panelOpen = false;
    fabBtn.classList.remove('open');
    panel.classList.remove('open');
    fabBtn.setAttribute('aria-expanded', 'false');
  }

  // Click outside
  document.addEventListener('click', function (e) {
    if (panelOpen && !fabRoot.contains(e.target)) closePanel();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closePanel(); closeModal(); }
  });

  // Desktop toggle
  fabBtn.addEventListener('click', function () {
    panelOpen ? closePanel() : openPanel();
  });

  // Open email modal from panel
  emailBtn.addEventListener('click', function () { closePanel(); openModal(); });

  // iOS touchend fallback (onclick unreliable on position:fixed)
  document.addEventListener('touchend', function (e) {
    if (emailBtn && (e.target === emailBtn || emailBtn.contains(e.target))) {
      e.preventDefault();
      closePanel();
      openModal();
    }
  }, { passive: false });

  /* ── Drag (entire fabRoot) ─────────────────────────── */
  let dragging = false, moved = false, ox, oy, sl, st;

  // Restore saved position
  try {
    const saved = JSON.parse(localStorage.getItem('artia_fab_v3') || 'null');
    if (saved) {
      fabRoot.style.right  = 'auto';
      fabRoot.style.bottom = 'auto';
      fabRoot.style.left   = saved.x + 'px';
      fabRoot.style.top    = saved.y + 'px';
    }
  } catch (_) {}

  fabBtn.addEventListener('touchstart', function (e) {
    const t = e.touches[0];
    ox = t.clientX; oy = t.clientY;
    const r = fabRoot.getBoundingClientRect();
    sl = r.left; st = r.top;
    dragging = true; moved = false;
  }, { passive: true });

  window.addEventListener('touchmove', function (e) {
    if (!dragging) return;
    const t = e.touches[0];
    const dx = t.clientX - ox, dy = t.clientY - oy;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) { moved = true; if (panelOpen) closePanel(); }
    const sz = 48, mX = window.innerWidth - sz - 8, mY = window.innerHeight - sz - 8;
    fabRoot.style.right  = 'auto'; fabRoot.style.bottom = 'auto';
    fabRoot.style.left   = Math.max(8, Math.min(mX, sl + dx)) + 'px';
    fabRoot.style.top    = Math.max(8, Math.min(mY, st + dy)) + 'px';
  }, { passive: true });

  window.addEventListener('touchend', function () {
    if (!dragging) return;
    dragging = false;
    try {
      const r = fabRoot.getBoundingClientRect();
      localStorage.setItem('artia_fab_v3', JSON.stringify({ x: r.left, y: r.top }));
    } catch (_) {}
    if (!moved) panelOpen ? closePanel() : openPanel();
    moved = false;
  });

  /* ─────────────────────────────────────────────────────────
     EMAIL MODAL
  ───────────────────────────────────────────────────────── */
  const modal     = document.getElementById('artia-email-modal');
  const closeBtn  = document.getElementById('aem-close-btn');
  const submitBtn = document.getElementById('aem-submit-btn');

  const FIELDS = {
    name:    { wrap: 'aem-f-name',    id: 'aem-inp-name' },
    email:   { wrap: 'aem-f-email',   id: 'aem-inp-email' },
    service: { wrap: 'aem-f-service', id: 'aem-inp-service' },
  };

  function openModal() {
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { document.getElementById('aem-inp-name').focus(); }, 180);
  }

  function closeModal() {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Expose for any legacy onclick="artiaOpenEmailModal()" calls in existing HTML
  window.artiaOpenEmailModal  = openModal;
  window.artiaCloseEmailModal = closeModal;

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

  // Clear field error on any input
  Object.values(FIELDS).forEach(function (f) {
    document.getElementById(f.id).addEventListener('input', function () {
      document.getElementById(f.wrap).classList.remove('has-err');
    });
  });

  /* ── Validate ── */
  function validate(name, email, service) {
    Object.values(FIELDS).forEach(function (f) {
      document.getElementById(f.wrap).classList.remove('has-err');
    });
    let ok = true;
    if (!name) {
      document.getElementById('aem-f-name').classList.add('has-err');
      ok = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.getElementById('aem-f-email').classList.add('has-err');
      ok = false;
    }
    if (!service) {
      document.getElementById('aem-f-service').classList.add('has-err');
      ok = false;
    }
    return ok;
  }

  /* ── Submit — POSTs to /api/send-email ── */
  submitBtn.addEventListener('click', async function () {
    const name    = document.getElementById('aem-inp-name').value.trim();
    const email   = document.getElementById('aem-inp-email').value.trim();
    const service = document.getElementById('aem-inp-service').value;
    const message = document.getElementById('aem-inp-msg').value.trim();

    if (!validate(name, email, service)) return;

    const origHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="aem-spinner"></span> Enviando…`;

    try {
      // artiaSendConsultation → POST /api/send-email
      // Backend (route.ts / handleConsultoria):
      //   1. Inserts lead in Supabase, generates folio
      //   2. Sends internal email → artia.estudioin@gmail.com
      //   3. Sends confirmation email → client (email)
      const data = await window.artiaSendConsultation({ name, emailFrom: email, service, message });

      submitBtn.classList.add('success');
      submitBtn.innerHTML = `${ICON_CHECK} ¡Enviado! Folio ${data.folio}`;

      setTimeout(function () {
        closeModal();
        document.getElementById('aem-inp-name').value    = '';
        document.getElementById('aem-inp-email').value   = '';
        document.getElementById('aem-inp-service').value = '';
        document.getElementById('aem-inp-msg').value     = '';
        submitBtn.disabled = false;
        submitBtn.classList.remove('success');
        submitBtn.innerHTML = origHTML;
      }, 2800);

    } catch (_err) {
      submitBtn.classList.add('error');
      submitBtn.innerHTML = 'Error al enviar. Intenta de nuevo.';
      setTimeout(function () {
        submitBtn.disabled = false;
        submitBtn.classList.remove('error');
        submitBtn.innerHTML = origHTML;
      }, 3200);
    }
  });

})();
