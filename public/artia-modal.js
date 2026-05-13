/* ═══════════════════════════════════════════════════════════
   ARTIA STUDIO — Unified Premium Booking Modal System v2.1
   Handles: reservaMenuModal + planModal across all public pages
   Fix: double-brace syntax errors, broken event listeners
   Feature: dual CTA — WhatsApp + Email
   Feature: locked-service mode — auto-preselects & hides selector
            when triggered from a section-specific pricing button
═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Config ──────────────────────────────────────────────── */
  const ARTIA_WA   = '593969937265';
  const ARTIA_EMAIL = 'hola@artiastudio.com';

  /* ── Modal HTML ─────────────────────────────────────────── */
  const MODAL_HTML = `
<!-- ╔══════════════════════════════════════════════════════╗
     ║  ARTIA PREMIUM BOOKING MODAL — reservaMenuModal     ║
     ╚══════════════════════════════════════════════════════╝ -->
<div id="reservaMenuModal"
     role="dialog" aria-modal="true" aria-labelledby="artiaModalTitle"
     class="artia-modal-overlay fixed inset-0 z-[9999] hidden items-center justify-center p-4"
     style="background:rgba(0,5,20,0.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);">

  <div id="reservaMenuContent"
       class="artia-modal-card w-full max-w-[460px] rounded-3xl overflow-hidden flex flex-col"
       style="background:#0a1628;
              border:1px solid rgba(79,130,246,0.25);
              box-shadow:0 32px 80px rgba(0,0,0,0.7),0 0 0 1px rgba(255,255,255,0.04),inset 0 1px 0 rgba(255,255,255,0.07);
              max-height:95vh;
              transform:scale(0.93) translateY(12px);
              opacity:0;
              transition:transform 0.35s cubic-bezier(0.22,1,0.36,1),opacity 0.3s ease;">

    <!-- ── Header ───────────────────────────────────────── -->
    <div class="artia-modal-header relative px-8 pt-8 pb-7 flex-shrink-0"
         style="background:linear-gradient(135deg,#0f2245 0%,#122a58 60%,#163370 100%);
                border-bottom:1px solid rgba(79,130,246,0.2);">

      <!-- Decorative glow -->
      <div style="position:absolute;top:-40px;right:-20px;width:180px;height:180px;
                  background:radial-gradient(circle,rgba(79,130,246,0.18) 0%,transparent 70%);
                  pointer-events:none;"></div>

      <!-- Close btn -->
      <button id="artiaModalClose" aria-label="Cerrar"
              onclick="closeReservaMenu()"
              style="position:absolute;top:18px;right:18px;
                     background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);
                     border-radius:50%;width:34px;height:34px;
                     display:flex;align-items:center;justify-content:center;
                     cursor:pointer;transition:background 0.2s,transform 0.3s;color:#fff;">
        <span class="material-symbols-outlined" style="font-size:18px;line-height:1;">close</span>
      </button>

      <!-- Brand -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);
                    border-radius:10px;display:flex;align-items:center;justify-content:center;">
          <span class="material-symbols-outlined" style="font-size:20px;color:#fff;font-variation-settings:'FILL' 1;">bolt</span>
        </div>
        <div>
          <p style="color:rgba(255,255,255,0.5);font-size:9px;letter-spacing:0.3em;font-weight:700;text-transform:uppercase;line-height:1;">ARTIA STUDIO</p>
          <p style="color:#fff;font-size:11px;letter-spacing:0.15em;font-weight:600;text-transform:uppercase;">Reserva de Consultoría</p>
        </div>
      </div>

      <!-- Title area -->
      <h2 id="artiaModalTitle" style="color:#fff;font-size:clamp(22px,5vw,28px);font-weight:900;letter-spacing:-0.03em;line-height:1.1;margin:0;">
        Hablemos de tu<br><span style="color:#60a5fa;">próximo proyecto</span>
      </h2>
      <p style="color:rgba(255,255,255,0.45);font-size:12px;margin-top:8px;font-weight:400;">
        Elige cómo contactarnos — respondemos en menos de 2 horas.
      </p>
    </div>

    <!-- ── Form body (scrollable) ────────────────────────── -->
    <div class="overflow-y-auto flex-1" style="padding:28px 32px 24px;">

      <form id="reservaMenuForm" novalidate autocomplete="off">
        <input type="hidden" id="reservaMenuPlanHidden" value="">

        <!-- Plan badge (shown when opened via openModal) -->
        <div id="artiaModalPlanBadge" style="display:none;margin-bottom:20px;">
          <div style="background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.3);
                      border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:8px;">
            <span class="material-symbols-outlined" style="color:#60a5fa;font-size:18px;font-variation-settings:'FILL' 1;">verified</span>
            <div>
              <p style="color:rgba(255,255,255,0.5);font-size:9px;letter-spacing:0.25em;font-weight:700;text-transform:uppercase;">Plan seleccionado</p>
              <p id="artiaModalPlanLabel" style="color:#93c5fd;font-size:13px;font-weight:800;letter-spacing:0.02em;"></p>
            </div>
          </div>
        </div>

        <!-- Name field -->
        <div class="artia-field" style="margin-bottom:20px;">
          <label for="reservaMenuNombre" style="color:rgba(255,255,255,0.45);font-size:9px;letter-spacing:0.25em;font-weight:700;text-transform:uppercase;display:block;margin-bottom:8px;">
            Tu Nombre y Apellido <span style="color:#f87171;">*</span>
          </label>
          <div style="position:relative;">
            <span class="material-symbols-outlined"
                  style="position:absolute;left:14px;top:50%;transform:translateY(-50%);
                         color:rgba(255,255,255,0.25);font-size:18px;pointer-events:none;
                         font-variation-settings:'FILL' 1;">person</span>
            <input type="text" id="reservaMenuNombre" required
                   placeholder="Nombre completo"
                   autocomplete="name"
                   style="width:100%;box-sizing:border-box;
                          background:rgba(255,255,255,0.05);
                          border:1px solid rgba(255,255,255,0.1);
                          border-radius:14px;padding:13px 14px 13px 44px;
                          color:#fff;font-size:14px;font-weight:500;
                          outline:none;transition:border-color 0.2s,background 0.2s;
                          -webkit-appearance:none;">
          </div>
          <p class="artia-error" id="errNombre" style="display:none;color:#f87171;font-size:11px;margin-top:6px;padding-left:4px;"></p>
        </div>

        <!-- Email field -->
        <div class="artia-field" style="margin-bottom:20px;">
          <label for="reservaMenuEmail" style="color:rgba(255,255,255,0.45);font-size:9px;letter-spacing:0.25em;font-weight:700;text-transform:uppercase;display:block;margin-bottom:8px;">
            Correo Electrónico <span style="color:#f87171;">*</span>
          </label>
          <div style="position:relative;">
            <span class="material-symbols-outlined"
                  style="position:absolute;left:14px;top:50%;transform:translateY(-50%);
                         color:rgba(255,255,255,0.25);font-size:18px;pointer-events:none;
                         font-variation-settings:'FILL' 1;">mail</span>
            <input type="email" id="reservaMenuEmail" required
                   placeholder="tu@email.com"
                   autocomplete="email"
                   style="width:100%;box-sizing:border-box;
                          background:rgba(255,255,255,0.05);
                          border:1px solid rgba(255,255,255,0.1);
                          border-radius:14px;padding:13px 14px 13px 44px;
                          color:#fff;font-size:14px;font-weight:500;
                          outline:none;transition:border-color 0.2s,background 0.2s;
                          -webkit-appearance:none;">
          </div>
          <p class="artia-error" id="errEmail" style="display:none;color:#f87171;font-size:11px;margin-top:6px;padding-left:4px;"></p>
        </div>

        <!-- Service select (shown in open mode) / locked badge (shown in locked mode) -->
        <div id="artiaServicioField" class="artia-field" style="margin-bottom:28px;">
          <label for="reservaMenuServicio" style="color:rgba(255,255,255,0.45);font-size:9px;letter-spacing:0.25em;font-weight:700;text-transform:uppercase;display:block;margin-bottom:8px;">
            Servicio Requerido <span style="color:#f87171;">*</span>
          </label>

          <!-- SELECT wrapper — hidden when service is locked -->
          <div id="artiaServicioSelectWrap" style="position:relative;">
            <span class="material-symbols-outlined"
                  style="position:absolute;left:14px;top:50%;transform:translateY(-50%);
                         color:rgba(255,255,255,0.25);font-size:18px;pointer-events:none;
                         font-variation-settings:'FILL' 1;">category</span>
            <select id="reservaMenuServicio" required
                    style="width:100%;box-sizing:border-box;
                           background:rgba(255,255,255,0.05);
                           border:1px solid rgba(255,255,255,0.1);
                           border-radius:14px;padding:13px 44px 13px 44px;
                           color:#fff;font-size:14px;font-weight:500;
                           outline:none;cursor:pointer;
                           -webkit-appearance:none;appearance:none;
                           transition:border-color 0.2s,background 0.2s;">
              <option value="" disabled selected style="background:#0a1628;color:#666;">Selecciona un servicio…</option>
              <option value="Páginas Web" style="background:#0a1628;">Páginas Web</option>
              <option value="Planes de Redes Sociales" style="background:#0a1628;">Planes de Redes Sociales</option>
              <option value="Impresión o Sublimados" style="background:#0a1628;">Impresión o Sublimados</option>
              <option value="Branding Corporativo" style="background:#0a1628;">Branding Corporativo</option>
              <option value="Fotografía o Video Profesional" style="background:#0a1628;">Fotografía o Video Profesional</option>
              <option value="Vuelos de Drone Profesional" style="background:#0a1628;">Vuelos de Drone Profesional</option>
              <option value="Consultoría Integral" style="background:#0a1628;">Consultoría Integral</option>
            </select>
            <span class="material-symbols-outlined"
                  style="position:absolute;right:14px;top:50%;transform:translateY(-50%);
                         color:rgba(255,255,255,0.3);font-size:18px;pointer-events:none;">expand_more</span>
          </div>

          <!-- LOCKED BADGE — shown only when service is locked; hidden by default -->
          <div id="artiaServicioLockedBadge" style="display:none;">
            <div style="background:rgba(16,185,129,0.1);
                        border:1px solid rgba(16,185,129,0.35);
                        border-radius:14px;padding:13px 16px;
                        display:flex;align-items:center;gap:12px;
                        position:relative;overflow:hidden;">
              <!-- Subtle shimmer line -->
              <div style="position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(16,185,129,0.06),transparent);pointer-events:none;"></div>
              <span class="material-symbols-outlined"
                    style="color:#34d399;font-size:20px;flex-shrink:0;font-variation-settings:'FILL' 1;">verified</span>
              <div style="flex:1;min-width:0;">
                <p style="color:rgba(255,255,255,0.35);font-size:9px;letter-spacing:0.2em;font-weight:700;text-transform:uppercase;margin:0 0 2px;">Servicio asignado</p>
                <p id="artiaServicioLockedLabel"
                   style="color:#6ee7b7;font-size:14px;font-weight:800;margin:0;
                          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-0.01em;"></p>
              </div>
              <span class="material-symbols-outlined"
                    style="color:rgba(52,211,153,0.4);font-size:16px;flex-shrink:0;">lock</span>
            </div>
            <p style="color:rgba(255,255,255,0.2);font-size:10px;margin-top:6px;padding-left:4px;">
              El servicio está preseleccionado según la sección que consultaste.
            </p>
          </div>

          <p class="artia-error" id="errServicio" style="display:none;color:#f87171;font-size:11px;margin-top:6px;padding-left:4px;"></p>
        </div>

        <!-- Divider -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div style="flex:1;height:1px;background:rgba(255,255,255,0.08);"></div>
          <p style="color:rgba(255,255,255,0.3);font-size:10px;letter-spacing:0.2em;font-weight:600;text-transform:uppercase;white-space:nowrap;">Elige cómo contactarnos</p>
          <div style="flex:1;height:1px;background:rgba(255,255,255,0.08);"></div>
        </div>

        <!-- CTA Buttons -->
        <div style="display:flex;flex-direction:column;gap:12px;">

          <!-- WhatsApp CTA -->
          <button type="button" id="artiaWhatsAppBtn"
                  onclick="artiaReservarWhatsApp()"
                  style="width:100%;padding:16px 20px;
                         background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);
                         border:none;border-radius:16px;
                         color:#fff;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;
                         cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;
                         box-shadow:0 8px 24px rgba(34,197,94,0.3);
                         transition:transform 0.15s,box-shadow 0.15s,filter 0.15s;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Reservar por WhatsApp
          </button>

          <!-- Email CTA -->
          <button type="button" id="artiaEmailBtn"
                  onclick="artiaReservarEmail()"
                  style="width:100%;padding:16px 20px;
                         background:rgba(59,130,246,0.12);
                         border:1px solid rgba(59,130,246,0.35);
                         border-radius:16px;
                         color:#93c5fd;font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;
                         cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;
                         transition:transform 0.15s,background 0.2s,border-color 0.2s;">
            <span class="material-symbols-outlined" style="font-size:20px;font-variation-settings:'FILL' 1;">mark_email_read</span>
            Reservar por Email
          </button>

        </div>

        <!-- Footer note -->
        <p style="text-align:center;color:rgba(255,255,255,0.2);font-size:10px;margin-top:18px;line-height:1.5;">
          Al contactarnos aceptas nuestros términos de servicio.<br>
          <span style="color:rgba(255,255,255,0.3);">🔒 Tu información es privada y segura.</span>
        </p>

      </form>
    </div>

  </div>
</div>

<!-- ╔══════════════════════════════════════════════════════╗
     ║  PLAN MODAL (for pricing plan cards)                ║
     ╚══════════════════════════════════════════════════════╝ -->
<div id="planModal"
     role="dialog" aria-modal="true"
     class="fixed inset-0 z-[9998] hidden items-center justify-center p-4"
     style="background:rgba(0,5,20,0.82);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);">
  <!-- planModal now delegates to reservaMenuModal with plan pre-filled -->
</div>
`;

  /* ── Inject modals into DOM ──────────────────────────── */
  function injectModals() {
    // Remove old modal nodes if they exist
    ['planModal', 'reservaMenuModal'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });

    var wrapper = document.createElement('div');
    wrapper.innerHTML = MODAL_HTML;
    document.body.appendChild(wrapper);

    // Inject styles
    injectStyles();

    // Bind close-on-overlay
    var overlay = document.getElementById('reservaMenuModal');
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeReservaMenu();
      });
    }

    // Input focus states
    document.querySelectorAll('#reservaMenuForm input, #reservaMenuForm select').forEach(function (el) {
      el.addEventListener('focus', function () {
        this.style.borderColor = 'rgba(59,130,246,0.7)';
        this.style.background = 'rgba(59,130,246,0.08)';
      });
      el.addEventListener('blur', function () {
        this.style.borderColor = 'rgba(255,255,255,0.1)';
        this.style.background = 'rgba(255,255,255,0.05)';
      });
    });

    // Button hover states
    var waBtn = document.getElementById('artiaWhatsAppBtn');
    if (waBtn) {
      waBtn.addEventListener('mouseenter', function () {
        this.style.transform = 'translateY(-2px)';
        this.style.boxShadow = '0 12px 32px rgba(34,197,94,0.4)';
        this.style.filter = 'brightness(1.08)';
      });
      waBtn.addEventListener('mouseleave', function () {
        this.style.transform = '';
        this.style.boxShadow = '0 8px 24px rgba(34,197,94,0.3)';
        this.style.filter = '';
      });
    }

    var emailBtn = document.getElementById('artiaEmailBtn');
    if (emailBtn) {
      emailBtn.addEventListener('mouseenter', function () {
        this.style.transform = 'translateY(-2px)';
        this.style.background = 'rgba(59,130,246,0.2)';
        this.style.borderColor = 'rgba(59,130,246,0.6)';
      });
      emailBtn.addEventListener('mouseleave', function () {
        this.style.transform = '';
        this.style.background = 'rgba(59,130,246,0.12)';
        this.style.borderColor = 'rgba(59,130,246,0.35)';
      });
    }

    // Close btn hover
    var closeBtn = document.getElementById('artiaModalClose');
    if (closeBtn) {
      closeBtn.addEventListener('mouseenter', function () {
        this.style.background = 'rgba(255,255,255,0.15)';
        this.style.transform = 'rotate(90deg)';
      });
      closeBtn.addEventListener('mouseleave', function () {
        this.style.background = 'rgba(255,255,255,0.08)';
        this.style.transform = '';
      });
    }

    // ESC key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var modal = document.getElementById('reservaMenuModal');
        if (modal && !modal.classList.contains('hidden')) {
          closeReservaMenu();
        }
      }
    });
  }

  /* ── Styles ─────────────────────────────────────────── */
  function injectStyles() {
    var css = `
      #reservaMenuModal { display:none; }
      #reservaMenuModal.artia-open { display:flex !important; }
      #reservaMenuForm input::placeholder,
      #reservaMenuForm select::placeholder { color:rgba(255,255,255,0.2); }
      #reservaMenuForm select option { color:#1e293b; background:#fff; }
      @media (max-width:480px) {
        #reservaMenuContent { border-radius:20px !important; max-height:98vh !important; }
        #reservaMenuContent .overflow-y-auto > form { padding-left:20px !important; padding-right:20px !important; }
        .artia-modal-header { padding:24px 20px 20px !important; }
      }
      #artiaWhatsAppBtn:active { transform:scale(0.97) !important; }
      #artiaEmailBtn:active { transform:scale(0.97) !important; }
    `;
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ── Validation ─────────────────────────────────────── */
  function validateForm() {
    var valid = true;

    // Reset errors
    ['errNombre', 'errEmail', 'errServicio'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    var nombre   = (document.getElementById('reservaMenuNombre') || {}).value || '';
    var email    = (document.getElementById('reservaMenuEmail') || {}).value || '';
    var servicio = (document.getElementById('reservaMenuServicio') || {}).value || '';

    function showErr(id, msg) {
      var el = document.getElementById(id);
      if (el) { el.textContent = msg; el.style.display = 'block'; }
      valid = false;
    }

    // Shake input
    function shakeInput(inputId) {
      var input = document.getElementById(inputId);
      if (!input) return;
      input.style.borderColor = 'rgba(248,113,113,0.7)';
      input.style.animation = 'artiaShake 0.4s ease';
      setTimeout(function () { input.style.animation = ''; }, 400);
    }

    if (!nombre.trim()) {
      showErr('errNombre', '✕  Por favor ingresa tu nombre.');
      shakeInput('reservaMenuNombre');
    }
    if (!email.trim()) {
      showErr('errEmail', '✕  Por favor ingresa tu correo.');
      shakeInput('reservaMenuEmail');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showErr('errEmail', '✕  Correo electrónico no válido.');
      shakeInput('reservaMenuEmail');
    }
    if (!servicio) {
      showErr('errServicio', '✕  Por favor selecciona un servicio.');
      shakeInput('reservaMenuServicio');
    }

    // Add shake keyframe if not exists
    if (!document.getElementById('artiaShakeStyle')) {
      var ks = document.createElement('style');
      ks.id = 'artiaShakeStyle';
      ks.textContent = '@keyframes artiaShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}';
      document.head.appendChild(ks);
    }

    return valid;
  }

  /* ── Get form values ────────────────────────────────── */
  function getFormValues() {
    var nombre   = ((document.getElementById('reservaMenuNombre') || {}).value || '').trim();
    var email    = ((document.getElementById('reservaMenuEmail') || {}).value || '').trim();
    var servicio = ((document.getElementById('reservaMenuServicio') || {}).value || '').trim();
    var plan     = ((document.getElementById('reservaMenuPlanHidden') || {}).value || '').trim();
    return { nombre: nombre, email: email, servicio: servicio, plan: plan };
  }

  /* ── Button loading state ───────────────────────────── */
  function setLoading(btnId, loading) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    if (loading) {
      btn.dataset.origHtml = btn.innerHTML;
      btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:18px;animation:artiaSpinKeyframe 0.8s linear infinite;">progress_activity</span>';
      btn.disabled = true;
      btn.style.opacity = '0.7';
    } else {
      if (btn.dataset.origHtml) btn.innerHTML = btn.dataset.origHtml;
      btn.disabled = false;
      btn.style.opacity = '';
    }
    // Add spin keyframe if needed
    if (!document.getElementById('artiaSpinStyle')) {
      var ks = document.createElement('style');
      ks.id = 'artiaSpinStyle';
      ks.textContent = '@keyframes artiaSpinKeyframe{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
      document.head.appendChild(ks);
    }
  }

  /* ── WhatsApp handler ───────────────────────────────── */
  window.artiaReservarWhatsApp = function () {
    if (!validateForm()) return;
    var v = getFormValues();

    setLoading('artiaWhatsAppBtn', true);

    var serviceDisplay = v.plan ? v.plan + ' — ' + v.servicio : v.servicio;

    var mensaje = '✨ *NUEVA RESERVA — ARTIA STUDIO*\n\n'
      + '*Nombre:* ' + v.nombre + '\n'
      + '*Email:* ' + v.email + '\n'
      + '*Servicio:* ' + serviceDisplay + '\n\n'
      + 'Hola Artia, me gustaría agendar una reunión para conocer más detalles. ¿Tienen disponibilidad?\n\n'
      + '¡Quedo atento/a! 🚀';

    var url = 'https://wa.me/' + ARTIA_WA + '?text=' + encodeURIComponent(mensaje);

    setTimeout(function () {
      window.open(url, '_blank');
      setLoading('artiaWhatsAppBtn', false);
      closeReservaMenu();
    }, 600);
  };

  /* ── Email handler — POST /api/send-email ──────────── */
  /**
   * Sends lead data via the shared artiaSendConsultation utility,
   * which POSTs to /api/send-email (route.ts / handleConsultoria).
   * The server:
   *   1. Inserts lead in Supabase + generates a folio (ASMKT-XXXX)
   *   2. Sends internal notification → artia.estudioin@gmail.com
   *   3. Sends confirmation email    → client (v.email)
   *
   * artiaSendConsultation is defined in fab-artia.js and exposed on
   * window so both scripts share the exact same API contract.
   * Load order: fab-artia.js first, then artia-modal.js.
   * Fallback: if fab-artia.js isn't loaded, we define a local copy.
   */
  if (typeof window.artiaSendConsultation !== 'function') {
    window.artiaSendConsultation = async function (payload) {
      var res  = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Error del servidor');
      return data;
    };
  }

  window.artiaReservarEmail = function () {
    if (!validateForm()) return;
    var v = getFormValues();

    setLoading('artiaEmailBtn', true);

    var serviceDisplay = v.plan ? v.plan + ' \u2014 ' + v.servicio : v.servicio;

    window.artiaSendConsultation({
      name:      v.nombre,
      emailFrom: v.email,
      service:   serviceDisplay,
      message:   v.plan ? 'Plan seleccionado: ' + v.plan : '',
    })
    .then(function (data) {
      setLoading('artiaEmailBtn', false);
      // Show brief success state on button before closing
      var btn = document.getElementById('artiaEmailBtn');
      if (btn) {
        var orig = btn.innerHTML;
        btn.style.background = 'rgba(5,150,105,0.15)';
        btn.style.borderColor = 'rgba(5,150,105,0.4)';
        btn.style.color = '#6ee7b7';
        btn.innerHTML = '\u2714\ufe0f Solicitud enviada \u2014 Folio ' + data.folio;
        setTimeout(function () {
          btn.style.background = '';
          btn.style.borderColor = '';
          btn.style.color = '';
          btn.innerHTML = orig;
          closeReservaMenu();
        }, 2400);
      } else {
        closeReservaMenu();
      }
    })
    .catch(function () {
      setLoading('artiaEmailBtn', false);
      var btn = document.getElementById('artiaEmailBtn');
      if (btn) {
        var orig = btn.innerHTML;
        btn.style.background = 'rgba(239,68,68,0.12)';
        btn.style.borderColor = 'rgba(239,68,68,0.4)';
        btn.style.color = '#fca5a5';
        btn.innerHTML = '\u2715 Error al enviar. Intenta de nuevo.';
        setTimeout(function () {
          btn.style.background = '';
          btn.style.borderColor = '';
          btn.style.color = '';
          btn.innerHTML = orig;
        }, 3000);
      }
    });
  };

  /* ── Service lock helpers ───────────────────────────── */
  function setServiceLocked(serviceName) {
    var selectWrap  = document.getElementById('artiaServicioSelectWrap');
    var lockedBadge = document.getElementById('artiaServicioLockedBadge');
    var lockedLabel = document.getElementById('artiaServicioLockedLabel');
    var select      = document.getElementById('reservaMenuServicio');
    var errEl       = document.getElementById('errServicio');

    if (!selectWrap || !lockedBadge || !select) return;

    // Force-select the value in the hidden <select> so getFormValues() still reads it
    var matched = false;
    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].value === serviceName ||
          select.options[i].value.toLowerCase() === serviceName.toLowerCase()) {
        select.selectedIndex = i;
        matched = true;
        break;
      }
    }
    // If no exact match, add a temporary option
    if (!matched) {
      var opt = document.createElement('option');
      opt.value = serviceName;
      opt.textContent = serviceName;
      opt.dataset.temp = '1';
      select.appendChild(opt);
      select.value = serviceName;
    }

    // Hide select, show badge
    selectWrap.style.display  = 'none';
    lockedBadge.style.display = 'block';
    if (lockedLabel) lockedLabel.textContent = serviceName;
    if (errEl) errEl.style.display = 'none';

    // Animate badge in
    lockedBadge.style.opacity   = '0';
    lockedBadge.style.transform = 'translateY(6px)';
    lockedBadge.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    requestAnimationFrame(function () {
      lockedBadge.style.opacity   = '1';
      lockedBadge.style.transform = 'translateY(0)';
    });
  }

  function clearServiceLock() {
    var selectWrap  = document.getElementById('artiaServicioSelectWrap');
    var lockedBadge = document.getElementById('artiaServicioLockedBadge');
    var select      = document.getElementById('reservaMenuServicio');

    if (!selectWrap || !lockedBadge || !select) return;

    // Remove any temp options
    var temps = select.querySelectorAll('[data-temp]');
    temps.forEach(function (o) { o.remove(); });

    selectWrap.style.display  = '';
    lockedBadge.style.display = 'none';
  }

  /* ── Open / Close ───────────────────────────────────── */
  /**
   * openReservaMenu(presetService, lockedService)
   *
   * presetService  – string: pre-selects the dropdown (editable). Used by
   *                  legacy calls like openReservaMenu('único').
   * lockedService  – string: pre-selects AND locks (hides) the dropdown,
   *                  showing a locked badge instead. Used by section-specific
   *                  pricing buttons.
   *
   * Pass only one at a time. lockedService takes priority if both supplied.
   */
  window.openReservaMenu = function (presetService, lockedService) {
    var modal   = document.getElementById('reservaMenuModal');
    var content = document.getElementById('reservaMenuContent');
    if (!modal) return;

    // Reset form & errors
    var form = document.getElementById('reservaMenuForm');
    if (form) form.reset();
    document.getElementById('reservaMenuPlanHidden').value = '';
    var badge = document.getElementById('artiaModalPlanBadge');
    if (badge) badge.style.display = 'none';
    ['errNombre','errEmail','errServicio'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    // Always clear any previous lock first
    clearServiceLock();

    if (lockedService) {
      // Locked mode: hide selector, show badge
      setTimeout(function () { setServiceLocked(lockedService); }, 60);
    } else if (presetService) {
      // Open mode: just pre-select the dropdown (user can still change)
      var sel = document.getElementById('reservaMenuServicio');
      if (sel) {
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value.toLowerCase().indexOf(presetService.toLowerCase()) !== -1) {
            sel.selectedIndex = i;
            break;
          }
        }
      }
    }

    document.body.style.overflow = 'hidden';
    modal.classList.remove('hidden');
    modal.classList.add('flex', 'artia-open');
    modal.style.display = 'flex';

    // Animate in
    requestAnimationFrame(function () {
      content.style.transform = 'scale(1) translateY(0)';
      content.style.opacity   = '1';
    });

    // Focus first input
    setTimeout(function () {
      var first = document.getElementById('reservaMenuNombre');
      if (first) first.focus();
    }, 350);
  };

  window.closeReservaMenu = function () {
    var modal   = document.getElementById('reservaMenuModal');
    var content = document.getElementById('reservaMenuContent');
    if (!modal) return;

    content.style.transform = 'scale(0.93) translateY(12px)';
    content.style.opacity   = '0';

    setTimeout(function () {
      modal.classList.add('hidden');
      modal.classList.remove('flex', 'artia-open');
      modal.style.display = '';
      document.body.style.overflow = '';
      // Reset lock state on close so next open starts clean
      clearServiceLock();
    }, 320);
  };

  /* ── openModal (plan cards) — delegates to reservaMenuModal ── */
  /**
   * openModal(planName, lockedService)
   *
   * planName      – string: shown in the plan badge (e.g. 'Esencial')
   * lockedService – string (optional): if supplied, locks the service selector
   *                 to this value (e.g. 'Planes de Redes Sociales')
   */
  window.openModal = function (planName, lockedService) {
    openReservaMenu(null, lockedService || null);

    // Show plan badge
    setTimeout(function () {
      var badge  = document.getElementById('artiaModalPlanBadge');
      var label  = document.getElementById('artiaModalPlanLabel');
      var hidden = document.getElementById('reservaMenuPlanHidden');
      if (badge)  badge.style.display = 'flex';
      if (label)  label.textContent = planName;
      if (hidden) hidden.value = planName;

      // If locked, apply it now (after openReservaMenu's own 60ms timeout)
      if (lockedService) setServiceLocked(lockedService);
    }, 80);
  };

  window.closeModal = function () {
    closeReservaMenu();
  };

  /* ── Init ───────────────────────────────────────────── */
  function init() {
    injectModals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
