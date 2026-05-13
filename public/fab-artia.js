/**
 * fab-artia.js — Botón Flotante ARTIA Studio
 * Versión corregida: drag solo en botón circular, email con window.open
 *
 * USO: Agrega esta línea antes de </body> en cada HTML:
 *   <script src="fab-artia.js"></script>
 */

(function () {

  // ─────────────────────────────────────────────
  // 1. INYECTAR ESTILOS
  // ─────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    .artia-wa-pulse {
      animation: artiaWaPulse 2s infinite;
    }
    @keyframes artiaWaPulse {
      0%   { box-shadow: 0 0 0 0 rgba(37,99,235,0.7); }
      70%  { box-shadow: 0 0 0 15px rgba(37,99,235,0); }
      100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
    }
    @keyframes artiaFadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to   { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);

  // ─────────────────────────────────────────────
  // 2. INYECTAR HTML
  // ─────────────────────────────────────────────
  const WHATSAPP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`;

  const EMAIL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>`;

  const BTN_STYLE = `background:#fff;color:#191c1e;padding:10px 14px;border-radius:9999px;box-shadow:0 4px 15px rgba(0,0,0,0.1);display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;border:1px solid rgba(197,198,210,0.2);text-decoration:none;font-family:inherit;cursor:pointer;`;

  const html = `
  <!-- ===== MODAL EMAIL ===== -->
  <div id="artia-emailModal" style="
    position:fixed;inset:0;z-index:200;
    display:flex;align-items:center;justify-content:center;
    padding:16px;background:rgba(0,0,0,0.5);
    visibility:hidden;opacity:0;transition:opacity 0.2s ease,visibility 0.2s ease;
  ">
    <div style="background:#fff;border-radius:12px;width:100%;max-width:380px;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.25);">
      <!-- Header -->
      <div style="background:#2563eb;padding:20px 24px;display:flex;align-items:flex-start;justify-content:space-between;">
        <div>
          <h2 style="color:#fff;font-size:18px;font-weight:900;letter-spacing:0.05em;margin:0;font-family:inherit;">ARTIA STUDIO</h2>
          <p style="color:rgba(255,255,255,0.8);font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:4px 0 0;">Reserva de Consultoría</p>
        </div>
        <button onclick="artiaCloseEmailModal()" style="background:rgba(255,255,255,0.2);border:none;color:#fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;flex-shrink:0;font-family:inherit;">✕</button>
      </div>
      <!-- Formulario -->
      <div style="padding:24px;display:flex;flex-direction:column;gap:16px;">
        <div>
          <label style="display:block;font-size:10px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;font-family:inherit;">Tu Nombre</label>
          <input id="artia-emailName" type="text" placeholder="Nombre y Apellido"
            style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:14px;color:#1e293b;outline:none;background:#f8fafc;box-sizing:border-box;font-family:inherit;" />
        </div>
        <div>
          <label style="display:block;font-size:10px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;font-family:inherit;">Tu Correo Electrónico</label>
          <input id="artia-emailFrom" type="email" placeholder="tucorreo@ejemplo.com"
            style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:14px;color:#1e293b;outline:none;background:#f8fafc;box-sizing:border-box;font-family:inherit;" />
        </div>
        <div>
          <label style="display:block;font-size:10px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;font-family:inherit;">Servicio Requerido</label>
          <select id="artia-emailService"
            style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:14px;color:#1e293b;outline:none;background:#f8fafc;appearance:none;cursor:pointer;font-family:inherit;">
            <option value="">Selecciona una opción...</option>
            <option>Páginas Webs</option>
            <option>Planes de Redes Sociales</option>
            <option>Papelería Premium – Entrega Express</option>
            <option>Impresión o Sublimados</option>
            <option>Branding Corporativo</option>
            <option>Fotografía o Video Profesionales</option>
            <option>Vuelos de Drone Profesional</option>
          </select>
        </div>
        <div>
          <label style="display:block;font-size:10px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;font-family:inherit;">Tu Mensaje</label>
          <textarea id="artia-emailMessage" rows="3" placeholder="Cuéntanos brevemente tu proyecto o consulta..."
            style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:14px;color:#1e293b;outline:none;background:#f8fafc;resize:none;box-sizing:border-box;font-family:inherit;"></textarea>
        </div>
        <button onclick="artiaSendEmail()"
          style="background:#2563eb;color:#fff;font-weight:900;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;border:none;border-radius:8px;padding:14px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;font-family:inherit;">
          CONFIRMAR RESERVA ${EMAIL_SVG}
        </button>
      </div>
    </div>
  </div>

  <!-- ===== BOTÓN FLOTANTE DESKTOP (≥1024px) ===== -->
  <div id="artia-fab-desktop" style="
    position:fixed;bottom:32px;right:16px;z-index:60;
    display:none;flex-direction:column;align-items:flex-end;
  ">
    <!-- Menú (visible al hacer hover con CSS de clase) -->
    <div id="artia-desk-menu" style="
      display:flex;flex-direction:column;align-items:flex-end;gap:8px;margin-bottom:8px;
      opacity:0;pointer-events:none;transform:translateY(16px);
      transition:opacity 0.3s ease,transform 0.3s ease;
    ">
      <div style="background:#fff;padding:4px 10px;border-radius:8px;box-shadow:0 10px 30px rgba(0,17,58,0.1);font-size:8px;text-transform:uppercase;letter-spacing:0.1em;font-weight:900;color:#00113a;border:1px solid rgba(197,198,210,0.1);">¿Cómo podemos ayudarte?</div>
      <a href="https://wa.me/593969937265" style="${BTN_STYLE}">
        <span style="font-size:14px;font-weight:700;">WhatsApp</span>${WHATSAPP_SVG}
      </a>
      <a href="tel:+593969937265" style="${BTN_STYLE}">
        <span style="font-size:14px;font-weight:700;">Llamar ahora</span>
        <span class="material-symbols-outlined" style="font-size:18px;">call</span>
      </a>
      <button onclick="artiaOpenEmailModal()" style="${BTN_STYLE}border:1px solid rgba(197,198,210,0.2);">
        <span style="font-size:14px;font-weight:700;">Enviar Email</span>${EMAIL_SVG}
      </button>
    </div>
    <!-- Botón principal -->
    <button id="artia-desk-btn" class="artia-wa-pulse" style="
      width:44px;height:44px;background:#2552ca;border-radius:50%;color:#fff;border:none;
      box-shadow:0 10px 25px rgba(37,99,235,0.4);display:flex;align-items:center;
      justify-content:center;cursor:pointer;transition:transform 0.3s ease,background 0.2s ease;
    ">
      <span class="material-symbols-outlined" style="font-size:24px;font-variation-settings:'FILL' 1;">chat</span>
    </button>
  </div>

  <!-- ===== BOTÓN FLOTANTE MOBILE (<1024px) ===== -->
  <div id="artia-fab-mobile" style="
    position:fixed;bottom:32px;left:16px;z-index:60;
    user-select:none;
  ">
    <!-- Menú -->
    <div id="artia-fab-menu" style="
      position:absolute;bottom:56px;right:0;
      display:flex;flex-direction:column;align-items:flex-end;gap:8px;
      opacity:0;pointer-events:none;
      transform:translateY(8px);
      transition:opacity 0.25s ease,transform 0.25s ease;
      white-space:nowrap;
    ">
      <div style="background:#fff;padding:4px 10px;border-radius:8px;box-shadow:0 10px 30px rgba(0,17,58,0.12);font-size:8px;text-transform:uppercase;letter-spacing:0.1em;font-weight:900;color:#00113a;border:1px solid rgba(197,198,210,0.15);">¿Cómo podemos ayudarte?</div>
      <a id="artia-menu-wa" href="https://wa.me/593969937265" style="${BTN_STYLE}">
        WhatsApp ${WHATSAPP_SVG}
      </a>
      <a id="artia-menu-tel" href="tel:+593969937265" style="${BTN_STYLE}">
        Llamar ahora <span class="material-symbols-outlined" style="font-size:18px;">call</span>
      </a>
      <button id="artia-menu-email" onclick="artiaOpenEmailModal()" style="${BTN_STYLE}">
        Enviar Email ${EMAIL_SVG}
      </button>
    </div>
    <!-- Botón principal circular -->
    <button id="artia-fab-btn" class="artia-wa-pulse" style="
      width:48px;height:48px;background:#2552ca;border-radius:50%;color:#fff;border:none;
      box-shadow:0 10px 25px rgba(37,99,235,0.4);display:flex;align-items:center;
      justify-content:center;cursor:pointer;
      touch-action:none;user-select:none;
      transition:transform 0.2s ease,background 0.2s ease;
      -webkit-tap-highlight-color:transparent;
    ">
      <span id="artia-fab-icon" class="material-symbols-outlined" style="font-size:24px;font-variation-settings:'FILL' 1;transition:transform 0.3s ease;">chat</span>
    </button>
  </div>
  `;

  // Insertar HTML al final del body
  document.body.insertAdjacentHTML('beforeend', html);

  // touchend explícito para el botón email en móvil
  // onclick no siempre se dispara en position:fixed en iOS
  document.addEventListener('touchend', function(e) {
    const emailBtn = document.getElementById('artia-menu-email');
    if (emailBtn && (e.target === emailBtn || emailBtn.contains(e.target))) {
      e.preventDefault();
      window.artiaOpenEmailModal && window.artiaOpenEmailModal();
    }
  }, { passive: false });

  // ─────────────────────────────────────────────
  // 3. MOSTRAR FAB SEGÚN TAMAÑO DE PANTALLA
  // ─────────────────────────────────────────────
  const fabDesktop = document.getElementById('artia-fab-desktop');
  const fabMobile  = document.getElementById('artia-fab-mobile');

  function applyVisibility() {
    if (window.innerWidth >= 1024) {
      fabDesktop.style.display = 'flex';
      fabMobile.style.display  = 'none';
    } else {
      fabDesktop.style.display = 'none';
      fabMobile.style.display  = 'block';
    }
  }
  applyVisibility();
  window.addEventListener('resize', applyVisibility);

  // ─────────────────────────────────────────────
  // 4. LÓGICA DESKTOP — hover abre menú
  // ─────────────────────────────────────────────
  const deskBtn  = document.getElementById('artia-desk-btn');
  const deskMenu = document.getElementById('artia-desk-menu');

  fabDesktop.addEventListener('mouseenter', function () {
    deskMenu.style.opacity       = '1';
    deskMenu.style.pointerEvents = 'auto';
    deskMenu.style.transform     = 'translateY(0)';
    deskBtn.style.transform      = 'rotate(12deg)';
  });
  fabDesktop.addEventListener('mouseleave', function () {
    deskMenu.style.opacity       = '0';
    deskMenu.style.pointerEvents = 'none';
    deskMenu.style.transform     = 'translateY(16px)';
    deskBtn.style.transform      = 'rotate(0deg)';
  });

  // ─────────────────────────────────────────────
  // 5. LÓGICA MOBILE — drag + tap para abrir menú
  // ─────────────────────────────────────────────
  const fab  = document.getElementById('artia-fab-mobile');
  const btn  = document.getElementById('artia-fab-btn');
  const menu = document.getElementById('artia-fab-menu');
  const icon = document.getElementById('artia-fab-icon');

  let menuOpen = false;
  let dragging = false;
  let dragMoved = false;
  let startX, startY, startLeft, startTop;

  // Restaurar posición guardada
  const STORE = 'artia_fab_pos';
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved) {
      fab.style.left   = saved.x + 'px';
      fab.style.top    = saved.y + 'px';
      fab.style.bottom = 'auto';
    }
  } catch(e) {}

  // Drag: SOLO en el botón circular
  // touchStartedOnBtn garantiza que touchend solo actúe si el toque
  // comenzó en el botón, nunca en los links del menú
  let touchStartedOnBtn = false;

  btn.addEventListener('touchstart', function (e) {
    const t = e.touches[0];
    startX = t.clientX;
    startY = t.clientY;
    const rect = fab.getBoundingClientRect();
    startLeft = rect.left;
    startTop  = rect.top;
    dragging  = true;
    dragMoved = false;
    touchStartedOnBtn = true;
  }, { passive: true });

  window.addEventListener('touchmove', function (e) {
    if (!dragging || !touchStartedOnBtn) return;
    const t  = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      dragMoved = true;
      if (menuOpen) closeMenu();
    }

    const size = 48;
    const maxX = window.innerWidth  - size - 8;
    const maxY = window.innerHeight - size - 8;
    fab.style.left   = Math.max(8, Math.min(maxX, startLeft + dx)) + 'px';
    fab.style.top    = Math.max(8, Math.min(maxY, startTop  + dy)) + 'px';
    fab.style.bottom = 'auto';
    fab.style.right  = 'auto';
    btn.style.transform = 'scale(1.08)';
  }, { passive: true });

  window.addEventListener('touchend', function () {
    if (!touchStartedOnBtn) return;
    touchStartedOnBtn = false;
    if (!dragging) return;
    dragging = false;
    btn.style.transform = 'scale(1)';
    try {
      const rect = fab.getBoundingClientRect();
      localStorage.setItem(STORE, JSON.stringify({ x: rect.left, y: rect.top }));
    } catch(e) {}
    if (!dragMoved) toggleMenu();
  });

  function toggleMenu() { menuOpen ? closeMenu() : openMenu(); }

  function openMenu() {
    menuOpen = true;
    const rect      = fab.getBoundingClientRect();
    const fabCenterX = rect.left + rect.width / 2;

    if (fabCenterX < window.innerWidth / 2) {
      menu.style.right     = 'auto';
      menu.style.left      = '0';
      menu.style.alignItems = 'flex-start';
    } else {
      menu.style.left      = 'auto';
      menu.style.right     = '0';
      menu.style.alignItems = 'flex-end';
    }

    if (rect.top < 220) {
      menu.style.bottom = 'auto';
      menu.style.top    = '56px';
    } else {
      menu.style.top    = 'auto';
      menu.style.bottom = '56px';
    }

    menu.style.opacity       = '1';
    menu.style.pointerEvents = 'auto';
    menu.style.transform     = 'translateY(0)';
    icon.style.transform     = 'rotate(20deg)';
  }

  function closeMenu() {
    menuOpen = false;
    menu.style.opacity       = '0';
    menu.style.pointerEvents = 'none';
    menu.style.transform     = 'translateY(8px)';
    icon.style.transform     = 'rotate(0deg)';
  }

  document.addEventListener('touchstart', function (e) {
    if (menuOpen && !fab.contains(e.target)) closeMenu();
  }, { passive: true });

  // ─────────────────────────────────────────────
  // 6. FUNCIONES GLOBALES DEL MODAL EMAIL
  // ─────────────────────────────────────────────
  window.artiaOpenEmailModal = function () {
    const modal = document.getElementById('artia-emailModal');
    modal.style.visibility = 'visible';
    modal.style.opacity    = '1';
    document.body.style.overflow = 'hidden';
  };

  window.artiaCloseEmailModal = function () {
    const modal = document.getElementById('artia-emailModal');
    modal.style.opacity    = '0';
    modal.style.visibility = 'hidden';
    document.body.style.overflow = '';
  };

  // Cerrar al tocar el fondo del modal
  document.getElementById('artia-emailModal').addEventListener('click', function (e) {
    if (e.target === this) window.artiaCloseEmailModal();
  });

  window.artiaSendEmail = async function () {
    const name     = document.getElementById('artia-emailName').value.trim();
    const emailFrom = document.getElementById('artia-emailFrom').value.trim();
    const service  = document.getElementById('artia-emailService').value;
    const message  = document.getElementById('artia-emailMessage').value.trim();

    if (!name || !emailFrom || !service) {
      alert('Por favor completa tu nombre, correo electrónico y selecciona un servicio.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFrom)) {
      alert('Por favor ingresa un correo electrónico válido.');
      return;
    }

    // ── Estado: cargando ──
    const submitBtn = document.querySelector('#artia-emailModal button[onclick="artiaSendEmail()"]');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        style="animation:artiaSpinAnim 0.8s linear infinite;">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      Enviando...
    `;

    if (!document.getElementById('artia-spin-style')) {
      const s = document.createElement('style');
      s.id = 'artia-spin-style';
      s.textContent = '@keyframes artiaSpinAnim { to { transform: rotate(360deg); } }';
      document.head.appendChild(s);
    }

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, emailFrom, service, message }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        submitBtn.style.background = '#16a34a';
        submitBtn.innerHTML = '✔ ¡Consulta enviada! Te contactaremos pronto.';
        setTimeout(() => {
          window.artiaCloseEmailModal();
          document.getElementById('artia-emailName').value    = '';
          document.getElementById('artia-emailFrom').value    = '';
          document.getElementById('artia-emailService').value = '';
          document.getElementById('artia-emailMessage').value = '';
          submitBtn.disabled = false;
          submitBtn.style.background = '#2563eb';
          submitBtn.innerHTML = originalHTML;
        }, 2500);
      } else {
        throw new Error(data.error || 'Error desconocido');
      }

    } catch (err) {
      submitBtn.style.background = '#dc2626';
      submitBtn.innerHTML = '✕ Error al enviar. Intenta de nuevo.';
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.style.background = '#2563eb';
        submitBtn.innerHTML = originalHTML;
      }, 3000);
    }
  };

})();
