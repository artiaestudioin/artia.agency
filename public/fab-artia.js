/**
 * fab-artia.js — Botón Flotante ARTIA Studio  v3.1  ✦ PREMIUM + STABLE
 * ─────────────────────────────────────────────────────────────
 * Merge: Premium UI from v3.0 + Robust mobile behavior from v2.0
 * 
 * Fixes applied:
 *  - Full viewport collision detection (top/bottom/left/right)
 *  - Menu dynamically repositions based on FAB location after drag
 *  - Touch handling uses touchStartedOnBtn pattern for stability
 *  - Menu opens downward when FAB is near top edge
 *  - Desktop: click toggle preserved
 *  - Mobile: drag + tap with proper gesture isolation
 *  - z-index management preserved
 *  - All animations and premium styling intact
 *
 * USO: agrega antes de </body>:
 *   <script src="fab-artia.js"></script>
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════
     1. ESTILOS — variables, animaciones, componentes
  ══════════════════════════════════════════════════════════ */
  const CSS = `
    :root {
      --fab-blue:      #2552ca;
      --fab-blue-deep: #0f2245;
      --fab-glow:      rgba(37, 82, 202, 0.55);
      --fab-glow-sm:   rgba(37, 82, 202, 0.30);
      --fab-white:     #ffffff;
      --fab-navy:      #00113a;
      --fab-radius:    22px;
    }

    /* ── Keyframes ──────────────────────────────────── */
    @keyframes fabGlowPulse {
      0%   { box-shadow: 0 0 0 0 var(--fab-glow), 0 8px 32px var(--fab-glow-sm); }
      60%  { box-shadow: 0 0 0 14px rgba(37,82,202,0), 0 8px 32px var(--fab-glow-sm); }
      100% { box-shadow: 0 0 0 0 rgba(37,82,202,0), 0 8px 32px var(--fab-glow-sm); }
    }

    @keyframes fabOrbitSpin {
      to { transform: rotate(360deg); }
    }

    @keyframes fabBounceIn {
      0%   { opacity:0; transform: scale(0.6) translateY(12px); }
      60%  { transform: scale(1.06) translateY(-3px); }
      80%  { transform: scale(0.97) translateY(1px); }
      100% { opacity:1; transform: scale(1) translateY(0); }
    }

    @keyframes fabItemIn {
      from { opacity:0; transform: translateX(20px) scale(0.92); }
      to   { opacity:1; transform: translateX(0) scale(1); }
    }

    @keyframes fabLabelIn {
      from { opacity:0; transform: translateX(8px); }
      to   { opacity:1; transform: translateX(0); }
    }

    @keyframes fabSpinLoad {
      to { transform: rotate(360deg); }
    }

    @keyframes fabModalIn {
      from { opacity:0; transform: scale(0.94) translateY(16px); }
      to   { opacity:1; transform: scale(1) translateY(0); }
    }

    @keyframes fabShake {
      0%,100% { transform: translateX(0); }
      20%     { transform: translateX(-5px); }
      40%     { transform: translateX(5px); }
      60%     { transform: translateX(-3px); }
      80%     { transform: translateX(3px); }
    }

    /* ── Botón principal ────────────────────────────── */
    .fab-main-btn {
      position: relative;
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: linear-gradient(145deg, #2d62e8 0%, #1a3fb5 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      animation: fabGlowPulse 2.4s ease infinite;
      transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1),
                  background 0.25s ease;
      -webkit-tap-highlight-color: transparent;
      outline: none;
      z-index: 2;
      flex-shrink: 0;
    }

    .fab-main-btn:hover {
      transform: scale(1.1);
      animation: none;
      box-shadow: 0 0 0 8px rgba(37,82,202,0.18), 0 12px 40px var(--fab-glow);
    }

    .fab-main-btn.is-open {
      background: linear-gradient(145deg, #1a3fb5 0%, #0f2245 100%);
      animation: none;
      box-shadow: 0 0 0 6px rgba(37,82,202,0.2), 0 12px 40px rgba(37,82,202,0.4);
    }

    /* Anillo orbital decorativo */
    .fab-orbit-ring {
      position: absolute;
      inset: -8px;
      border-radius: 50%;
      border: 1.5px solid rgba(37,82,202,0.35);
      border-top-color: rgba(37,82,202,0.85);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
      animation: fabOrbitSpin 2.5s linear infinite;
    }

    .fab-main-btn.is-open .fab-orbit-ring,
    .fab-main-btn:hover .fab-orbit-ring {
      opacity: 1;
    }

    /* Ícono central */
    .fab-main-icon {
      font-size: 26px;
      transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1),
                  opacity 0.2s ease;
      font-variation-settings: 'FILL' 1;
      line-height: 1;
    }

    .fab-main-btn.is-open .fab-main-icon {
      transform: rotate(45deg) scale(0.9);
    }

    /* ── Panel flotante ─────────────────────────────── */
    .fab-panel {
      position: absolute;
      /* Default: will be overridden by JS based on position */
      width: 230px;
      background: var(--fab-blue-deep);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: var(--fab-radius);
      padding: 16px 14px 14px;
      box-shadow:
        0 32px 64px rgba(0,0,0,0.5),
        0 0 0 1px rgba(255,255,255,0.04),
        inset 0 1px 0 rgba(255,255,255,0.07);
      pointer-events: none;
      opacity: 0;
      transform: scale(0.88) translateY(12px);
      transition: opacity 0.28s cubic-bezier(0.22,1,0.36,1),
                  transform 0.32s cubic-bezier(0.22,1,0.36,1);
      z-index: 1;
      /* Dynamic transform origin set by JS */
    }

    .fab-panel.is-open {
      opacity: 1;
      pointer-events: auto;
      transform: scale(1) translateY(0);
    }

    /* Header del panel */
    .fab-panel-header {
      display: flex;
      align-items: center;
      gap: 9px;
      padding-bottom: 12px;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }

    .fab-panel-logo {
      width: 30px;
      height: 30px;
      border-radius: 9px;
      background: linear-gradient(135deg, #3b82f6, var(--fab-blue));
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .fab-panel-brand {
      display: flex;
      flex-direction: column;
    }

    .fab-panel-name {
      color: #fff;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      font-family: 'Manrope', 'Inter', sans-serif;
    }

    .fab-panel-tagline {
      color: rgba(255,255,255,0.4);
      font-size: 9px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-family: 'Inter', sans-serif;
    }

    /* Online dot */
    .fab-online-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 6px rgba(34,197,94,0.7);
      margin-left: auto;
      flex-shrink: 0;
    }

    /* Items del panel */
    .fab-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 13px;
      text-decoration: none;
      border: none;
      cursor: pointer;
      width: 100%;
      box-sizing: border-box;
      font-family: 'Manrope', 'Inter', sans-serif;
      transition: background 0.18s ease, transform 0.18s ease;
      background: transparent;
      margin-bottom: 4px;
    }

    .fab-item:last-child { margin-bottom: 0; }

    .fab-item:hover {
      background: rgba(255,255,255,0.07);
      transform: translateX(-3px);
    }

    .fab-item:active {
      transform: scale(0.97);
    }

    /* Ícono del ítem */
    .fab-item-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.2s ease;
    }

    .fab-item:hover .fab-item-icon {
      transform: scale(1.08) rotate(-4deg);
    }

    .fab-item-icon--wa    { background: linear-gradient(135deg,#22c55e,#16a34a); }
    .fab-item-icon--phone { background: linear-gradient(135deg,#6366f1,#4f46e5); }
    .fab-item-icon--email { background: linear-gradient(135deg,#f59e0b,#d97706); }

    /* Texto del ítem */
    .fab-item-text {
      display: flex;
      flex-direction: column;
    }

    .fab-item-label {
      color: #fff;
      font-size: 12.5px;
      font-weight: 800;
      letter-spacing: -0.01em;
      line-height: 1.2;
    }

    .fab-item-sub {
      color: rgba(255,255,255,0.35);
      font-size: 9.5px;
      font-weight: 500;
      margin-top: 1px;
    }

    /* Flecha */
    .fab-item-arrow {
      margin-left: auto;
      color: rgba(255,255,255,0.2);
      font-size: 16px;
      transition: color 0.18s ease, transform 0.18s ease;
      font-variation-settings: 'FILL' 0;
    }

    .fab-item:hover .fab-item-arrow {
      color: rgba(255,255,255,0.5);
      transform: translateX(2px);
    }

    /* ── Wrapper general del FAB ────────────────────── */
    #artia-fab-wrap {
      position: fixed;
      bottom: 28px;
      right: 22px;
      z-index: 9990;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      user-select: none;
      touch-action: none;
    }

    /* Animación de entrada global */
    #artia-fab-wrap {
      animation: fabBounceIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both;
      animation-delay: 0.8s;
      opacity: 0;
    }

    /* ── Panel en mobile ── */
    @media (max-width: 640px) {
      .fab-panel {
        width: 212px;
      }
    }

    /* ── Modal Email ────────────────────────────────── */
    #artia-emailModal {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(0, 5, 20, 0.78);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      visibility: hidden;
      opacity: 0;
      transition: opacity 0.25s ease, visibility 0.25s ease;
    }

    #artia-emailModal.is-open {
      visibility: visible;
      opacity: 1;
    }

    .fab-modal-card {
      background: #0a1628;
      border: 1px solid rgba(79,130,246,0.2);
      border-radius: 24px;
      width: 100%;
      max-width: 400px;
      overflow: hidden;
      box-shadow: 0 40px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
      animation: fabModalIn 0.35s cubic-bezier(0.22,1,0.36,1) both;
    }

    .fab-modal-header {
      background: linear-gradient(135deg, #0f2245 0%, #163370 100%);
      padding: 22px 24px 20px;
      position: relative;
      border-bottom: 1px solid rgba(79,130,246,0.18);
    }

    .fab-modal-close {
      position: absolute;
      top: 14px;
      right: 14px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 50%;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #fff;
      font-family: inherit;
      transition: background 0.2s, transform 0.3s;
    }

    .fab-modal-close:hover {
      background: rgba(255,255,255,0.18);
      transform: rotate(90deg);
    }

    .fab-modal-body {
      padding: 22px 24px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .fab-field label {
      display: block;
      color: rgba(255,255,255,0.4);
      font-size: 9px;
      letter-spacing: 0.22em;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 7px;
      font-family: 'Inter', sans-serif;
    }

    .fab-input-wrap {
      position: relative;
    }

    .fab-input-wrap .fab-input-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: rgba(255,255,255,0.22);
      font-size: 17px;
      font-variation-settings: 'FILL' 1;
      pointer-events: none;
    }

    .fab-field input,
    .fab-field select,
    .fab-field textarea {
      width: 100%;
      box-sizing: border-box;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 11px 12px 11px 40px;
      color: #fff;
      font-size: 13.5px;
      font-weight: 500;
      font-family: 'Inter', sans-serif;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      transition: border-color 0.2s, background 0.2s;
    }

    .fab-field textarea {
      padding-top: 12px;
      resize: none;
      line-height: 1.5;
    }

    .fab-field input::placeholder,
    .fab-field textarea::placeholder {
      color: rgba(255,255,255,0.2);
    }

    .fab-field select {
      cursor: pointer;
    }

    .fab-field select option {
      background: #0a1628;
      color: #fff;
    }

    .fab-field input:focus,
    .fab-field select:focus,
    .fab-field textarea:focus {
      border-color: rgba(59,130,246,0.7);
      background: rgba(59,130,246,0.07);
    }

    .fab-field .fab-select-arrow {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: rgba(255,255,255,0.25);
      font-size: 18px;
      pointer-events: none;
    }

    .fab-field textarea + .fab-input-icon {
      top: 14px;
      transform: none;
    }

    .fab-submit-btn {
      background: linear-gradient(135deg, #2d62e8 0%, #1a3fb5 100%);
      color: #fff;
      border: none;
      border-radius: 14px;
      padding: 14px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-family: 'Manrope', 'Inter', sans-serif;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      box-shadow: 0 8px 24px rgba(37,82,202,0.35);
      transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.2s;
    }

    .fab-submit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 32px rgba(37,82,202,0.45);
    }

    .fab-submit-btn:active {
      transform: scale(0.97);
    }

    .fab-error {
      display: none;
      color: #f87171;
      font-size: 10.5px;
      margin-top: 5px;
      padding-left: 3px;
      font-family: 'Inter', sans-serif;
    }

    /* shake on error */
    .fab-field.has-error input,
    .fab-field.has-error select,
    .fab-field.has-error textarea {
      border-color: rgba(248,113,113,0.7);
      animation: fabShake 0.35s ease;
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);
/* ══════════════════════════════════════════════════════════
     probando
  ══════════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════
     2. SVG ASSETS
  ══════════════════════════════════════════════════════════ */
  const WA_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`;

  const PHONE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>`;

  const EMAIL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`;

  const BOLT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;

  const ARROW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9,18 15,12 9,6"/></svg>`;

  /* ══════════════════════════════════════════════════════════
     3. HTML
  ══════════════════════════════════════════════════════════ */
  const HTML = `
  <!-- ═══ ARTIA FAB v3.1 ═══ -->

  <!-- Modal Email -->
  <div id="artia-emailModal" role="dialog" aria-modal="true" aria-labelledby="fabModalTitle">
    <div class="fab-modal-card">
      <div class="fab-modal-header">
        <button class="fab-modal-close" onclick="artiaCloseEmailModal()" aria-label="Cerrar">
          <span class="material-symbols-outlined" style="font-size:16px;line-height:1;">close</span>
        </button>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <div style="width:32px;height:32px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:9px;display:flex;align-items:center;justify-content:center;">${BOLT_SVG}</div>
          <div>
            <p style="color:rgba(255,255,255,0.45);font-size:9px;letter-spacing:0.3em;font-weight:700;text-transform:uppercase;font-family:'Inter',sans-serif;">ARTIA STUDIO</p>
            <p style="color:#fff;font-size:11px;letter-spacing:0.12em;font-weight:700;text-transform:uppercase;font-family:'Inter',sans-serif;">Reserva de Consultoría</p>
          </div>
        </div>
        <h2 id="fabModalTitle" style="color:#fff;font-size:clamp(20px,4vw,24px);font-weight:900;letter-spacing:-0.03em;line-height:1.15;margin:0;font-family:'Manrope','Inter',sans-serif;">
          Cuéntanos tu <span style="color:#60a5fa;">proyecto</span>
        </h2>
        <p style="color:rgba(255,255,255,0.35);font-size:11px;margin-top:6px;font-family:'Inter',sans-serif;">Respondemos en menos de 2 horas hábiles.</p>
      </div>
      <div class="fab-modal-body">
        <!-- Nombre -->
        <div class="fab-field" id="fabFieldName">
          <label>Tu nombre</label>
          <div class="fab-input-wrap">
            <span class="fab-input-icon material-symbols-outlined">person</span>
            <input id="artia-emailName" type="text" placeholder="Nombre y Apellido" autocomplete="name" />
          </div>
          <p class="fab-error" id="fabErrName">✕ Ingresa tu nombre</p>
        </div>
        <!-- Email -->
        <div class="fab-field" id="fabFieldEmail">
          <label>Correo electrónico</label>
          <div class="fab-input-wrap">
            <span class="fab-input-icon material-symbols-outlined">mail</span>
            <input id="artia-emailFrom" type="email" placeholder="tu@correo.com" autocomplete="email" />
          </div>
          <p class="fab-error" id="fabErrEmail">✕ Ingresa un correo válido</p>
        </div>
        <!-- Servicio -->
        <div class="fab-field" id="fabFieldService">
          <label>Servicio requerido</label>
          <div class="fab-input-wrap">
            <span class="fab-input-icon material-symbols-outlined">category</span>
            <select id="artia-emailService">
              <option value="">Selecciona un servicio…</option>
              <option>Páginas Web</option>
              <option>Planes de Redes Sociales</option>
              <option>Papelería Premium – Entrega Express</option>
              <option>Impresión o Sublimados</option>
              <option>Branding Corporativo</option>
              <option>Fotografía o Video Profesional</option>
              <option>Vuelos de Drone Profesional</option>
            </select>
            <span class="fab-select-arrow material-symbols-outlined">expand_more</span>
          </div>
          <p class="fab-error" id="fabErrService">✕ Selecciona un servicio</p>
        </div>
        <!-- Mensaje -->
        <div class="fab-field">
          <label>Tu mensaje</label>
          <div class="fab-input-wrap">
            <span class="fab-input-icon material-symbols-outlined" style="top:13px;transform:none;">chat</span>
            <textarea id="artia-emailMessage" rows="3" placeholder="Cuéntanos brevemente tu proyecto…" style="padding-top:12px;"></textarea>
          </div>
        </div>
        <!-- Submit -->
        <button class="fab-submit-btn" id="fabSubmitBtn" onclick="artiaSendEmail()">
          Confirmar reserva
          <span class="material-symbols-outlined" style="font-size:18px;font-variation-settings:'FILL' 1;">send</span>
        </button>
      </div>
    </div>
  </div>

  <!-- FAB principal (único, responsive) -->
  <div id="artia-fab-wrap" role="complementary" aria-label="Contacto rápido Artia">

    <!-- Panel de opciones -->
    <div class="fab-panel" id="artia-fab-panel" role="menu">

      <!-- Header del panel -->
      <div class="fab-panel-header">
        <div class="fab-panel-logo">${BOLT_SVG}</div>
        <div class="fab-panel-brand">
          <span class="fab-panel-name">ARTIA STUDIO</span>
          <span class="fab-panel-tagline">¿Cómo podemos ayudarte?</span>
        </div>
        <div class="fab-online-dot" title="En línea"></div>
      </div>

      <!-- WhatsApp -->
      <a class="fab-item" href="https://wa.me/593969937265" target="_blank" rel="noopener noreferrer" role="menuitem">
        <div class="fab-item-icon fab-item-icon--wa">${WA_SVG}</div>
        <div class="fab-item-text">
          <span class="fab-item-label">WhatsApp</span>
          <span class="fab-item-sub">Respuesta inmediata</span>
        </div>
        <span class="fab-item-arrow">${ARROW_SVG}</span>
      </a>

      <!-- Llamar -->
      <a class="fab-item" href="tel:+593969937265" role="menuitem">
        <div class="fab-item-icon fab-item-icon--phone">${PHONE_SVG}</div>
        <div class="fab-item-text">
          <span class="fab-item-label">Llamar ahora</span>
          <span class="fab-item-sub">+593 96 993 7265</span>
        </div>
        <span class="fab-item-arrow">${ARROW_SVG}</span>
      </a>

      <!-- Email -->
      <button class="fab-item" id="artia-fab-email-btn" role="menuitem">
        <div class="fab-item-icon fab-item-icon--email">${EMAIL_SVG}</div>
        <div class="fab-item-text">
          <span class="fab-item-label">Enviar Email</span>
          <span class="fab-item-sub">hola@artiastudio.com</span>
        </div>
        <span class="fab-item-arrow">${ARROW_SVG}</span>
      </button>

    </div>

    <!-- Botón principal -->
    <button class="fab-main-btn" id="artia-fab-btn" aria-expanded="false" aria-controls="artia-fab-panel" aria-label="Abrir menú de contacto">
      <div class="fab-orbit-ring"></div>
      <span class="fab-main-icon material-symbols-outlined">chat</span>
    </button>

  </div>
  `;

  document.body.insertAdjacentHTML('beforeend', HTML);

  /* ══════════════════════════════════════════════════════════
     4. LÓGICA DEL FAB — UNIFIED DESKTOP + MOBILE
  ══════════════════════════════════════════════════════════ */
  const fabWrap    = document.getElementById('artia-fab-wrap');
  const fabBtn     = document.getElementById('artia-fab-btn');
  const fabPanel   = document.getElementById('artia-fab-panel');
  const fabEmailBtn= document.getElementById('artia-fab-email-btn');

  let menuOpen      = false;
  let isDragging    = false;
  let dragMoved     = false;
  let startX, startY, startLeft, startTop;
  let touchStartedOnBtn = false;  // V2 pattern: gesture isolation

  // ── Restaurar posición guardada (mobile drag) ──
  const STORE_KEY = 'artia_fab_pos_v3';
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (saved && window.innerWidth < 1024) {
      fabWrap.style.left   = saved.x + 'px';
      fabWrap.style.top    = saved.y + 'px';
      fabWrap.style.bottom = 'auto';
      fabWrap.style.right  = 'auto';
    }
  } catch(e) {}

  // ── Viewport collision detection: calculate optimal panel position ──
  function calculatePanelPosition() {
    const fabRect     = fabWrap.getBoundingClientRect();
    const panelWidth  = window.innerWidth <= 640 ? 212 : 230;
    const panelHeight = 280; // Approximate max height
    const padding     = 12;
    const vw          = window.innerWidth;
    const vh          = window.innerHeight;

    // Horizontal: center of FAB vs center of viewport
    const fabCenterX  = fabRect.left + fabRect.width / 2;
    const isLeftSide  = fabCenterX < vw / 2;

    // Vertical: is there enough space above? If not, open downward
    const spaceAbove  = fabRect.top;
    const spaceBelow  = vh - fabRect.bottom;
    const openDownward = spaceAbove < panelHeight + padding && spaceBelow > spaceAbove;

    // Reset all positioning first
    fabPanel.style.left      = '';
    fabPanel.style.right     = '';
    fabPanel.style.top       = '';
    fabPanel.style.bottom    = '';
    fabPanel.style.transformOrigin = '';

    if (openDownward) {
      // Open downward (menu below FAB)
      fabPanel.style.top = (fabRect.height + padding) + 'px';
      if (isLeftSide) {
        fabPanel.style.left = '0';
        fabPanel.style.transformOrigin = 'top left';
      } else {
        fabPanel.style.right = '0';
        fabPanel.style.transformOrigin = 'top right';
      }
    } else {
      // Open upward (default, menu above FAB)
      fabPanel.style.bottom = (fabRect.height + padding) + 'px';
      if (isLeftSide) {
        fabPanel.style.left = '0';
        fabPanel.style.transformOrigin = 'bottom left';
      } else {
        fabPanel.style.right = '0';
        fabPanel.style.transformOrigin = 'bottom right';
      }
    }
  }

  // ── Toggle panel ──────────────────────────────
  function openMenu() {
    menuOpen = true;
    fabBtn.classList.add('is-open');
    fabBtn.setAttribute('aria-expanded', 'true');

    // Calculate and apply optimal position BEFORE showing
    calculatePanelPosition();

    // Force reflow then add is-open for transition
    void fabPanel.offsetWidth;
    fabPanel.classList.add('is-open');
  }

  function closeMenu() {
    menuOpen = false;
    fabBtn.classList.remove('is-open');
    fabPanel.classList.remove('is-open');
    fabBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu() {
    menuOpen ? closeMenu() : openMenu();
  }

  // ── Desktop: click para toggle ─────────────────
  fabBtn.addEventListener('click', function(e) {
    if (!dragMoved && !isDragging) toggleMenu();
  });

  // ── Cerrar al hacer click/touch fuera ────────────────
  document.addEventListener('click', function(e) {
    if (menuOpen && !fabWrap.contains(e.target)) closeMenu();
  });

  document.addEventListener('touchstart', function(e) {
    if (menuOpen && !fabWrap.contains(e.target)) closeMenu();
  }, { passive: true });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && menuOpen) closeMenu();
  });

  // ── Botón email en el panel ────────────────────
  fabEmailBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    closeMenu();
    window.artiaOpenEmailModal();
  });

  // touchend para iOS — email button
  fabEmailBtn.addEventListener('touchend', function(e) {
    e.preventDefault();
    e.stopPropagation();
    closeMenu();
    window.artiaOpenEmailModal && window.artiaOpenEmailModal();
  }, { passive: false });

  /* ══════════════════════════════════════════════════════════
     5. DRAG (mobile touch — arrastra el FAB completo)
     V2 pattern: touchStartedOnBtn for gesture isolation
  ══════════════════════════════════════════════════════════ */
  fabBtn.addEventListener('touchstart', function(e) {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    const rect = fabWrap.getBoundingClientRect();
    startLeft = rect.left;
    startTop  = rect.top;
    isDragging = true;
    dragMoved  = false;
    touchStartedOnBtn = true;
  }, { passive: true });

  window.addEventListener('touchmove', function(e) {
    if (!isDragging || !touchStartedOnBtn) return;
    const t  = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      dragMoved = true;
      if (menuOpen) closeMenu();
    }

    const size = 58;
    const maxX = window.innerWidth  - size - 8;
    const maxY = window.innerHeight - size - 8;
    fabWrap.style.left   = Math.max(8, Math.min(maxX, startLeft + dx)) + 'px';
    fabWrap.style.top    = Math.max(8, Math.min(maxY, startTop  + dy)) + 'px';
    fabWrap.style.bottom = 'auto';
    fabWrap.style.right  = 'auto';
    fabBtn.style.transform = dragMoved ? 'scale(1.12)' : '';
  }, { passive: true });

  window.addEventListener('touchend', function(e) {
    if (!touchStartedOnBtn) return;
    touchStartedOnBtn = false;
    if (!isDragging) return;
    isDragging = false;
    fabBtn.style.transform = '';

    // Save position
    try {
      const rect = fabWrap.getBoundingClientRect();
      localStorage.setItem(STORE_KEY, JSON.stringify({ x: rect.left, y: rect.top }));
    } catch(e) {}

    // Only toggle if it was a tap, not a drag
    if (!dragMoved) {
      toggleMenu();
    }
    dragMoved = false;
  });

  // Prevent default on touchstart for the button to avoid double firing
  fabBtn.addEventListener('touchstart', function(e) {
    // Allow default for scrolling, but mark that we're handling this
  }, { passive: true });

  /* ══════════════════════════════════════════════════════════
     6. MODAL EMAIL — abrir / cerrar / enviar
  ══════════════════════════════════════════════════════════ */
  const emailModal = document.getElementById('artia-emailModal');

  window.artiaOpenEmailModal = function() {
    emailModal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    setTimeout(function() {
      const first = document.getElementById('artia-emailName');
      if (first) first.focus();
    }, 320);
  };

  window.artiaCloseEmailModal = function() {
    emailModal.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  emailModal.addEventListener('click', function(e) {
    if (e.target === emailModal) window.artiaCloseEmailModal();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && emailModal.classList.contains('is-open')) {
      window.artiaCloseEmailModal();
    }
  });

  // Focus states en inputs del modal
  ['artia-emailName','artia-emailFrom','artia-emailService','artia-emailMessage'].forEach(function(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('focus', function() {
      this.style.borderColor = 'rgba(59,130,246,0.7)';
      this.style.background  = 'rgba(59,130,246,0.07)';
    });
    el.addEventListener('blur', function() {
      this.style.borderColor = '';
      this.style.background  = '';
    });
    // Clear error on input
    el.addEventListener('input', function() {
      const field = this.closest('.fab-field');
      if (field) {
        field.classList.remove('has-error');
        const errEl = field.querySelector('.fab-error');
        if (errEl) errEl.style.display = 'none';
      }
    });
  });

  // ── Validación y envío ─────────────────────────
  window.artiaSendEmail = async function() {
    const nameEl    = document.getElementById('artia-emailName');
    const emailEl   = document.getElementById('artia-emailFrom');
    const serviceEl = document.getElementById('artia-emailService');
    const msgEl     = document.getElementById('artia-emailMessage');
    const submitBtn = document.getElementById('fabSubmitBtn');

    const name    = nameEl.value.trim();
    const email   = emailEl.value.trim();
    const service = serviceEl.value;
    const message = msgEl.value.trim();

    // Reset errors
    ['fabFieldName','fabFieldEmail','fabFieldService'].forEach(function(id) {
      const f = document.getElementById(id);
      if (f) f.classList.remove('has-error');
    });
    ['fabErrName','fabErrEmail','fabErrService'].forEach(function(id) {
      const e = document.getElementById(id);
      if (e) e.style.display = 'none';
    });

    let valid = true;

    function showErr(fieldId, errId, msg) {
      const f = document.getElementById(fieldId);
      const e = document.getElementById(errId);
      if (f) f.classList.add('has-error');
      if (e) { if (msg) e.textContent = msg; e.style.display = 'block'; }
      valid = false;
    }

    if (!name) showErr('fabFieldName','fabErrName','✕ Ingresa tu nombre completo');
    if (!email) {
      showErr('fabFieldEmail','fabErrEmail','✕ Ingresa tu correo electrónico');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showErr('fabFieldEmail','fabErrEmail','✕ Correo electrónico no válido');
    }
    if (!service) showErr('fabFieldService','fabErrService','✕ Selecciona un servicio');

    if (!valid) return;

    // Loading state
    const origHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"
        style="animation:fabSpinLoad 0.75s linear infinite;flex-shrink:0;">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
      </svg>
      Enviando…
    `;

    try {
      const res  = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emailFrom: email, service, message }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        submitBtn.style.background = 'linear-gradient(135deg,#22c55e,#16a34a)';
        submitBtn.style.boxShadow  = '0 8px 24px rgba(34,197,94,0.35)';
        submitBtn.innerHTML = `
          <span class="material-symbols-outlined" style="font-size:18px;font-variation-settings:'FILL' 1;">check_circle</span>
          ¡Consulta enviada! Te contactamos pronto.
        `;
        setTimeout(function() {
          window.artiaCloseEmailModal();
          nameEl.value = ''; emailEl.value = ''; serviceEl.value = ''; msgEl.value = '';
          submitBtn.disabled = false;
          submitBtn.style.background = '';
          submitBtn.style.boxShadow  = '';
          submitBtn.innerHTML = origHTML;
        }, 2800);
      } else {
        throw new Error(data.error || 'Error');
      }
    } catch(err) {
      submitBtn.style.background = 'linear-gradient(135deg,#ef4444,#dc2626)';
      submitBtn.innerHTML = `
        <span class="material-symbols-outlined" style="font-size:18px;">error</span>
        Error al enviar. Intenta de nuevo.
      `;
      setTimeout(function() {
        submitBtn.disabled = false;
        submitBtn.style.background = '';
        submitBtn.innerHTML = origHTML;
      }, 3200);
    }
  };

  // ── Recalculate panel position on resize ──
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      if (menuOpen) calculatePanelPosition();
    }, 100);
  });

  // ── Recalculate on orientation change ──
  window.addEventListener('orientationchange', function() {
    setTimeout(function() {
      if (menuOpen) calculatePanelPosition();
    }, 300);
  });

})();