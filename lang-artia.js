/**
 * lang-artia.js — Sistema bilingüe ES / EN
 * © 2026 Artia Studio. All rights reserved.
 *
 * Estrategia: show/hide de .artia-es y .artia-en
 * Todos los textos existen en el DOM; solo se muestra el idioma activo.
 *
 * Incluir ANTES de </body> en cada página:
 *   <script src="lang-artia.js"></script>
 */
(function () {
  'use strict';

  var LANG_KEY = 'artia_lang';

  // ── CSS global: oculta los spans del idioma inactivo ──
  var style = document.createElement('style');
  style.textContent = [
    /* Por defecto se muestra ES, EN oculto */
    '.artia-en { display: none; }',

    /* Cuando <html lang="en"> está activo */
    ':lang(en) .artia-es { display: none; }',
    ':lang(en) .artia-en { display: inline; }',

    /* ─── Botón de idioma ─── */
    '.artia-lang-btn {',
    '  display: inline-flex; align-items: center; gap: 3px;',
    '  background: transparent;',
    '  border: 1.5px solid rgba(0,17,58,0.2);',
    '  border-radius: 999px;',
    '  padding: 3px 11px;',
    '  font-family: "Inter", sans-serif;',
    '  font-size: 11px; letter-spacing: 0.08em;',
    '  cursor: pointer; color: #00113a;',
    '  transition: border-color .2s, background .2s;',
    '  white-space: nowrap; line-height: 1.4;',
    '}',
    '.artia-lang-btn:hover { border-color: #2552ca; background: rgba(37,82,202,.06); }',
    '.artia-lang-sep { opacity: .3; margin: 0 1px; font-size: 10px; }',
    '.artia-lang-es-lbl, .artia-lang-en-lbl { transition: opacity .15s, font-weight .15s; }',

    /* ─── Tooltip escritorio ─── */
    '.artia-lang-wrap { position: relative; display: flex; align-items: center; padding-left: 16px; }',
    '.artia-tooltip {',
    '  position: absolute; left: calc(100% + 10px); top: 50%;',
    '  transform: translateY(-50%);',
    '  background: #00113a; color: #fff;',
    '  font-size: 10px; font-family: "Inter", sans-serif;',
    '  font-weight: 600; letter-spacing: .05em;',
    '  white-space: nowrap; padding: 4px 10px; border-radius: 6px;',
    '  pointer-events: none; opacity: 0; transition: opacity .18s;',
    '}',
    '.artia-tooltip::before {',
    '  content: ""; position: absolute; right: 100%; top: 50%;',
    '  transform: translateY(-50%);',
    '  border: 5px solid transparent; border-right-color: #00113a;',
    '}',
    '.artia-lang-wrap:hover .artia-tooltip { opacity: 1; }',
  ].join('\n');
  document.head.appendChild(style);

  // ── Leer / guardar idioma ──
  function getLang() {
    return localStorage.getItem(LANG_KEY) || 'es';
  }

  function applyLang(lang) {
    document.documentElement.lang = lang;
    localStorage.setItem(LANG_KEY, lang);

    // Actualizar botones
    document.querySelectorAll('.artia-lang-btn').forEach(function (btn) {
      var esLbl = btn.querySelector('.artia-lang-es-lbl');
      var enLbl = btn.querySelector('.artia-lang-en-lbl');
      if (esLbl) {
        esLbl.style.opacity    = lang === 'es' ? '1' : '0.35';
        esLbl.style.fontWeight = lang === 'es' ? '800' : '400';
      }
      if (enLbl) {
        enLbl.style.opacity    = lang === 'en' ? '1' : '0.35';
        enLbl.style.fontWeight = lang === 'en' ? '800' : '400';
      }
    });

    // Tooltip text
    document.querySelectorAll('.artia-tooltip').forEach(function (el) {
      el.textContent = lang === 'es' ? 'Cambiar de idioma' : 'Change language';
    });

    // <select> en modales: actualizar las opciones
    syncSelectOptions(lang);
  }

  function toggle() {
    applyLang(getLang() === 'es' ? 'en' : 'es');
  }

  // ── Sincronizar <select> del modal Reserva ──
  function syncSelectOptions(lang) {
    var sel = document.getElementById('reservaMenuServicio');
    if (!sel) return;
    var opts = {
      es: ['', 'Páginas Webs', 'Planes de Redes Sociales',
           'Impresión o Sublimados', 'Branding Corporativo',
           'Fotografía o Video Profesionales', 'Vuelos de Drone profesional'],
      en: ['', 'Web Pages', 'Social Media Plans',
           'Printing or Sublimation', 'Corporate Branding',
           'Professional Photography or Video', 'Professional Drone Flights'],
    };
    var labels  = opts[lang];
    var options = sel.querySelectorAll('option');
    options.forEach(function (opt, i) {
      if (labels[i] !== undefined) {
        if (i === 0) opt.textContent = lang === 'es' ? 'Selecciona una opción...' : 'Select an option...';
        else         opt.textContent = labels[i];
      }
    });

    // También modal WhatsApp
    var sel2 = document.querySelector('#whatsappForm select');
    if (sel2) {
      sel2.querySelectorAll('option').forEach(function (opt, i) {
        if (labels[i] !== undefined) {
          if (i === 0) opt.textContent = lang === 'es' ? 'Selecciona una opción...' : 'Select an option...';
          else         opt.textContent = labels[i];
        }
      });
    }
  }

  // ── Crear botón ──
  function makeBtn() {
    var btn = document.createElement('button');
    btn.className = 'artia-lang-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Switch language / Cambiar idioma');
    btn.innerHTML =
      '<span class="artia-lang-es-lbl">ES</span>' +
      '<span class="artia-lang-sep">/</span>' +
      '<span class="artia-lang-en-lbl">EN</span>';
    btn.addEventListener('click', toggle);
    return btn;
  }

  // ── Inyectar en navigación ──
  function inject() {
    var lang = getLang();

    // 1. ESCRITORIO: bottom del aside (junto a Soporte)
    document.querySelectorAll('aside.fixed.left-0').forEach(function (aside) {
      if (aside.querySelector('.artia-lang-wrap')) return;
      var soporteRow = aside.querySelector('.flex.items-center.gap-3.pl-4.text-slate-500');
      if (!soporteRow) return;
      var wrap = document.createElement('div');
      wrap.className = 'artia-lang-wrap';
      var btn = makeBtn();
      var tooltip = document.createElement('span');
      tooltip.className = 'artia-tooltip';
      tooltip.textContent = lang === 'es' ? 'Cambiar de idioma' : 'Change language';
      wrap.appendChild(btn);
      wrap.appendChild(tooltip);
      soporteRow.parentNode.insertBefore(wrap, soporteRow);
    });

    // 2. MÓVIL HEADER: reemplazar div.w-10 vacío
    document.querySelectorAll('header.fixed.top-0.w-full').forEach(function (hdr) {
      var emptyDiv = hdr.querySelector('div.w-10');
      if (!emptyDiv || emptyDiv.querySelector('.artia-lang-btn')) return;
      emptyDiv.style.minWidth = '44px';
      emptyDiv.style.width = 'auto';
      emptyDiv.appendChild(makeBtn());
    });

    // 3. MENÚ MÓVIL OVERLAY: encima del botón Reservar
    var mmCta = document.getElementById('mm-cta');
    if (mmCta && !mmCta.previousElementSibling?.classList.contains('artia-mobile-lang')) {
      var mobileRow = document.createElement('div');
      mobileRow.className = 'artia-mobile-lang';
      mobileRow.style.cssText = 'display:flex;justify-content:center;margin-bottom:14px;';
      mobileRow.appendChild(makeBtn());
      mmCta.parentNode.insertBefore(mobileRow, mmCta);
    }

    applyLang(lang);
  }

  // ── Init ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

})();
