/**
 * lang-artia.js — Sistema de traducción ES / EN
 * © 2026 Artia Studio. All rights reserved.
 *
 * USO: Incluir ANTES de </body> en cada página HTML:
 *   <script src="lang-artia.js"></script>
 *
 * Marca los elementos a traducir con:
 *   data-i18n="clave"           → reemplaza textContent
 *   data-i18n-html="clave"      → reemplaza innerHTML
 *   data-i18n-placeholder="clave" → reemplaza placeholder
 */

(function () {
  'use strict';

  const LANG_KEY = 'artia_lang';

  // ════════════════════════════════════════════════════
  //  DICCIONARIO DE TRADUCCIONES
  // ════════════════════════════════════════════════════
  const T = {
    es: {
      /* ── NAV COMPARTIDO ── */
      'nav.home'        : 'Inicio',
      'nav.services'    : 'Servicios',
      'nav.marketing'   : 'Planes de Marketing Digital',
      'nav.print'       : 'Medios Impresos',
      'nav.photo'       : 'Fotografía y Audiovisual Profesional',
      'nav.photo.short' : 'Fotografía y Audiovisual',
      'nav.clients'     : 'Clientes',
      'nav.about'       : 'Nosotros',
      'nav.book'        : 'RESERVAR',
      'nav.support'     : 'Soporte',
      'nav.change.lang' : 'Cambiar de idioma',

      /* ── FAB / MODAL EMAIL ── */
      'fab.help'        : '¿Cómo podemos ayudarte?',
      'fab.call'        : 'Llamar ahora',
      'fab.email'       : 'Enviar Email',
      'fab.book.title'  : 'Reserva de Consultoría',
      'fab.name'        : 'Tu Nombre',
      'fab.name.ph'     : 'Nombre y Apellido',
      'fab.email.lbl'   : 'Tu Correo Electrónico',
      'fab.email.ph'    : 'tucorreo@ejemplo.com',
      'fab.service'     : 'Servicio Requerido',
      'fab.service.ph'  : 'Selecciona una opción...',
      'fab.svc.web'     : 'Páginas Webs',
      'fab.svc.social'  : 'Planes de Redes Sociales',
      'fab.svc.print'   : 'Impresión o Sublimados',
      'fab.svc.brand'   : 'Branding Corporativo',
      'fab.svc.photo'   : 'Fotografía o Video Profesionales',
      'fab.svc.drone'   : 'Vuelos de Drone Profesional',
      'fab.message'     : 'Tu Mensaje',
      'fab.message.ph'  : 'Cuéntanos brevemente tu proyecto o consulta...',
      'fab.confirm'     : 'CONFIRMAR RESERVA',
      'fab.sending'     : 'Enviando...',
      'fab.sent'        : '✔ ¡Consulta enviada! Te contactaremos pronto.',
      'fab.error'       : '✕ Error al enviar. Intenta de nuevo.',

      /* ── MODALES RESERVA (inicio, etc.) ── */
      'modal.title'      : 'Solicitar Información',
      'modal.plan.lbl'   : 'Plan:',
      'modal.name.lbl'   : 'Tu Nombre',
      'modal.name.ph'    : 'Ej. Carlitos',
      'modal.send'       : 'Enviar a WhatsApp',
      'reserva.title'    : 'ARTIA STUDIO',
      'reserva.subtitle' : 'Reserva de Consultoría',
      'reserva.name'     : 'Tu Nombre',
      'reserva.name.ph'  : 'Nombre y Apellido',
      'reserva.svc'      : 'Servicio Requerido',
      'reserva.svc.ph'   : 'Selecciona una opción...',
      'reserva.svc.web'  : 'Páginas Webs',
      'reserva.svc.soc'  : 'Planes de Redes Sociales',
      'reserva.svc.prt'  : 'Impresión o Sublimados',
      'reserva.svc.brd'  : 'Branding Corporativo',
      'reserva.svc.pht'  : 'Fotografía o Video Profesionales',
      'reserva.svc.drn'  : 'Vuelos de Drone profesional',
      'reserva.btn'      : 'Confirmar Reserva',

      /* ── INICIO ── */
      'home.hero.sub'    : 'Marketing & Publicidad Integral',
      'home.hero.cta1'   : 'Contáctanos',
      'home.hero.cta2'   : 'Ver servicios',
      'home.about.tag'   : 'Más que identidad...',
      'home.about.title' : 'MARCAS DE ALTO',
      'home.about.impact': 'IMPACTO.',
      'home.about.text'  : 'Estrategia, datos y diseño: creamos marcas de alto impacto que convierten la publicidad en resultados rentables.',
      'home.about.years' : 'Años Exp',
      'home.about.proj'  : 'Proyectos',
      'home.about.cli'   : 'Clientes Satisfechos',
      'home.srv.tag'     : 'Marketing y Publicidad Integral',
      'home.srv.title'   : 'Soluciones Integrales',
      'home.card.mkt.t'  : 'Planes de Marketing Digital',
      'home.card.mkt.d'  : 'Estrategias omnicanal enfocadas en conversión, gestión de comunidades y posicionamiento SEO/SEM de alta precisión.',
      'home.card.mkt.cta': 'Explorar plan',
      'home.card.prt.t'  : 'Medios Impresos',
      'home.card.prt.cta': 'Ver Catálogo',
      'home.card.pht.t'  : 'Fotografía y Audiovisual',
      'home.card.pht.d'  : 'Producción de contenido visual premium que eleva la percepción de su marca.',
      'home.card.pht.cta': 'Ver Portafolio',
      'home.card.cli.t'  : 'Nuestros Clientes',
      'home.card.cli.d'  : 'Marcas que han confiado en nuestra visión integral.',
      'home.card.cli.cta': 'Ingresar',
      'home.tagline'     : 'Marketing & Publicidad Integral',

      /* ── NOSOTROS ── */
      'about.tag'        : 'Nuestra Historia',
      'about.headline'   : 'No solo existas',
      'about.headline2'  : 'conecta',
      'about.headline3'  : 'e impacta.',
      'about.sub'        : 'Tu marca merece ser líder.',
      'about.desc'       : 'Transformamos tu presencia digital en una máquina de resultados.',
      'about.years.lbl'  : 'Años de experticia',
      'about.mission.t'  : 'Misión',
      'about.mission.d'  : 'Proveer soluciones de marketing integral que trascienden lo convencional, transformando la visión de nuestros clientes en realidades comerciales potentes y sostenibles.',
      'about.vision.t'   : 'Visión',
      'about.vision.d'   : 'Ser reconocidos como la agencia boutique líder en estrategia publicitaria en la región, destacando por nuestra excelencia técnica y ética profesional.',
      'about.values.t'   : 'Valores',
      'about.values.d'   : 'Integridad, innovación disruptiva y compromiso absoluto. Creemos que la transparencia es el cimiento de toda relación profesional exitosa.',
      'about.ceo.label'  : 'Liderazgo Ejecutivo',
      'about.ceo.quote'  : '"Nuestra meta es construir legados, no solo campañas."',
      'about.ceo.desc'   : 'Bajo la dirección de nuestro fundador, ARTIA ha evolucionado de ser un taller creativo a una consultoría de marketing de espectro completo. Con una visión centrada en el cliente y una obsesión por los detalles, lideramos el mercado con integridad.',
      'about.ceo.role'   : 'Director General',
      'about.ceo.sub'    : 'Estrategia & Visión',
      'about.team.title' : 'Mentes Maestras',
      'about.team.desc'  : 'Un equipo multidisciplinario dedicado a la precisión y el impacto visual.',

      /* ── CLIENTES ── */
      'clients.tag'      : 'Trusted Partners',
      'clients.title'    : 'Empresas que confían en nuestra visión.',
      'clients.desc'     : 'Construimos relaciones sólidas a través de resultados tangibles. Desde startups disruptivas hasta corporaciones consolidadas, nuestra arquitectura de marketing se adapta a cada desafío.',

      /* ── MARKETING DIGITAL ── */
      'mkt.hero.tag'     : 'Nuestros Planes',
      'mkt.hero.title'   : 'Marketing Digital',
      'mkt.hero.desc'    : 'Estrategias omnicanal que convierten audiencias en clientes leales.',
      'mkt.plan.book'    : 'RESERVAR PLAN',
      'mkt.plan.basic'   : 'Básico',
      'mkt.plan.std'     : 'Estándar',
      'mkt.plan.pro'     : 'Profesional',
      'mkt.plan.month'   : '/mes',
      'mkt.plan.ideal'   : 'Ideal para negocios en crecimiento',

      /* ── FOTOGRAFÍA ── */
      'photo.hero.tag'   : 'Fotografía & Audiovisual',
      'photo.hero.title' : 'Imágenes que hablan.',
      'photo.hero.desc'  : 'Capturamos la esencia de tu marca con producción visual de nivel profesional.',
      'photo.cta'        : 'Solicitar Sesión',

      /* ── IMPRESIÓN ── */
      'print.hero.tag'   : 'Medios Impresos',
      'print.hero.title' : 'Diseño que se toca.',
      'print.hero.desc'  : 'Desde tarjetas de presentación hasta vallas publicitarias, materiales que reflejan la calidad de tu marca.',
      'print.cta'        : 'Solicitar Cotización',

      /* ── FOOTER ── */
      'footer.slogan'    : 'Elevamos el estándar visual de tu marca a través de marketing estratégico y producción audiovisual.',
      'footer.services'  : 'Servicios',
      'footer.svc.mkt'   : 'Marketing Digital',
      'footer.svc.photo' : 'Fotografía Profesional',
      'footer.svc.brand' : 'Diseño de Marca',
      'footer.rights'    : '© 2026 Artia Studio. Todos los derechos reservados.',
    },

    en: {
      /* ── SHARED NAV ── */
      'nav.home'        : 'Home',
      'nav.services'    : 'Services',
      'nav.marketing'   : 'Digital Marketing Plans',
      'nav.print'       : 'Print Media',
      'nav.photo'       : 'Professional Photography & Audiovisual',
      'nav.photo.short' : 'Photography & Audiovisual',
      'nav.clients'     : 'Clients',
      'nav.about'       : 'About Us',
      'nav.book'        : 'BOOK NOW',
      'nav.support'     : 'Support',
      'nav.change.lang' : 'Change language',

      /* ── FAB / EMAIL MODAL ── */
      'fab.help'        : 'How can we help you?',
      'fab.call'        : 'Call now',
      'fab.email'       : 'Send Email',
      'fab.book.title'  : 'Consultation Booking',
      'fab.name'        : 'Your Name',
      'fab.name.ph'     : 'Full Name',
      'fab.email.lbl'   : 'Your Email Address',
      'fab.email.ph'    : 'youremail@example.com',
      'fab.service'     : 'Required Service',
      'fab.service.ph'  : 'Select an option...',
      'fab.svc.web'     : 'Web Pages',
      'fab.svc.social'  : 'Social Media Plans',
      'fab.svc.print'   : 'Printing or Sublimation',
      'fab.svc.brand'   : 'Corporate Branding',
      'fab.svc.photo'   : 'Professional Photography or Video',
      'fab.svc.drone'   : 'Professional Drone Flights',
      'fab.message'     : 'Your Message',
      'fab.message.ph'  : 'Briefly tell us about your project or inquiry...',
      'fab.confirm'     : 'CONFIRM BOOKING',
      'fab.sending'     : 'Sending...',
      'fab.sent'        : '✔ Inquiry sent! We will contact you soon.',
      'fab.error'       : '✕ Error sending. Please try again.',

      /* ── BOOKING MODALS ── */
      'modal.title'      : 'Request Information',
      'modal.plan.lbl'   : 'Plan:',
      'modal.name.lbl'   : 'Your Name',
      'modal.name.ph'    : 'e.g. Carlos',
      'modal.send'       : 'Send via WhatsApp',
      'reserva.title'    : 'ARTIA STUDIO',
      'reserva.subtitle' : 'Consultation Booking',
      'reserva.name'     : 'Your Name',
      'reserva.name.ph'  : 'Full Name',
      'reserva.svc'      : 'Required Service',
      'reserva.svc.ph'   : 'Select an option...',
      'reserva.svc.web'  : 'Web Pages',
      'reserva.svc.soc'  : 'Social Media Plans',
      'reserva.svc.prt'  : 'Printing or Sublimation',
      'reserva.svc.brd'  : 'Corporate Branding',
      'reserva.svc.pht'  : 'Professional Photography or Video',
      'reserva.svc.drn'  : 'Professional Drone Flights',
      'reserva.btn'      : 'Confirm Booking',

      /* ── HOME ── */
      'home.hero.sub'    : 'Marketing & Comprehensive Advertising',
      'home.hero.cta1'   : 'Contact Us',
      'home.hero.cta2'   : 'View Services',
      'home.about.tag'   : 'More than identity...',
      'home.about.title' : 'HIGH',
      'home.about.impact': 'IMPACT BRANDS.',
      'home.about.text'  : 'Strategy, data and design: we create high-impact brands that turn advertising into profitable results.',
      'home.about.years' : 'Yrs Exp',
      'home.about.proj'  : 'Projects',
      'home.about.cli'   : 'Happy Clients',
      'home.srv.tag'     : 'Marketing & Comprehensive Advertising',
      'home.srv.title'   : 'Integrated Solutions',
      'home.card.mkt.t'  : 'Digital Marketing Plans',
      'home.card.mkt.d'  : 'Omnichannel strategies focused on conversion, community management and high-precision SEO/SEM positioning.',
      'home.card.mkt.cta': 'Explore plan',
      'home.card.prt.t'  : 'Print Media',
      'home.card.prt.cta': 'View Catalog',
      'home.card.pht.t'  : 'Photography & Audiovisual',
      'home.card.pht.d'  : 'Premium visual content production that elevates the perception of your brand.',
      'home.card.pht.cta': 'View Portfolio',
      'home.card.cli.t'  : 'Our Clients',
      'home.card.cli.d'  : 'Brands that have trusted our comprehensive vision.',
      'home.card.cli.cta': 'Enter',
      'home.tagline'     : 'Marketing & Comprehensive Advertising',

      /* ── ABOUT ── */
      'about.tag'        : 'Our Story',
      'about.headline'   : "Don't just exist",
      'about.headline2'  : 'connect',
      'about.headline3'  : 'and make an impact.',
      'about.sub'        : 'Your brand deserves to be a leader.',
      'about.desc'       : 'We transform your digital presence into a results machine.',
      'about.years.lbl'  : 'Years of expertise',
      'about.mission.t'  : 'Mission',
      'about.mission.d'  : 'To provide comprehensive marketing solutions that transcend the conventional, transforming our clients\' vision into powerful and sustainable commercial realities.',
      'about.vision.t'   : 'Vision',
      'about.vision.d'   : 'To be recognized as the leading boutique agency in advertising strategy in the region, standing out for our technical excellence and professional ethics.',
      'about.values.t'   : 'Values',
      'about.values.d'   : 'Integrity, disruptive innovation and absolute commitment. We believe transparency is the foundation of every successful professional relationship.',
      'about.ceo.label'  : 'Executive Leadership',
      'about.ceo.quote'  : '"Our goal is to build legacies, not just campaigns."',
      'about.ceo.desc'   : 'Under the direction of our founder, ARTIA has evolved from a creative workshop to a full-spectrum marketing consultancy. With a client-centered vision and an obsession for detail, we lead the market with integrity.',
      'about.ceo.role'   : 'General Director',
      'about.ceo.sub'    : 'Strategy & Vision',
      'about.team.title' : 'Master Minds',
      'about.team.desc'  : 'A multidisciplinary team dedicated to precision and visual impact.',

      /* ── CLIENTS ── */
      'clients.tag'      : 'Trusted Partners',
      'clients.title'    : 'Companies that trust our vision.',
      'clients.desc'     : 'We build solid relationships through tangible results. From disruptive startups to established corporations, our marketing architecture adapts to every challenge.',

      /* ── DIGITAL MARKETING ── */
      'mkt.hero.tag'     : 'Our Plans',
      'mkt.hero.title'   : 'Digital Marketing',
      'mkt.hero.desc'    : 'Omnichannel strategies that convert audiences into loyal customers.',
      'mkt.plan.book'    : 'BOOK PLAN',
      'mkt.plan.basic'   : 'Basic',
      'mkt.plan.std'     : 'Standard',
      'mkt.plan.pro'     : 'Professional',
      'mkt.plan.month'   : '/mo',
      'mkt.plan.ideal'   : 'Ideal for growing businesses',

      /* ── PHOTOGRAPHY ── */
      'photo.hero.tag'   : 'Photography & Audiovisual',
      'photo.hero.title' : 'Images that speak.',
      'photo.hero.desc'  : 'We capture the essence of your brand with professional-level visual production.',
      'photo.cta'        : 'Request Session',

      /* ── PRINT ── */
      'print.hero.tag'   : 'Print Media',
      'print.hero.title' : 'Design you can touch.',
      'print.hero.desc'  : 'From business cards to billboards, materials that reflect the quality of your brand.',
      'print.cta'        : 'Request Quote',

      /* ── FOOTER ── */
      'footer.slogan'    : 'We elevate the visual standard of your brand through strategic marketing and audiovisual production.',
      'footer.services'  : 'Services',
      'footer.svc.mkt'   : 'Digital Marketing',
      'footer.svc.photo' : 'Professional Photography',
      'footer.svc.brand' : 'Brand Design',
      'footer.rights'    : '© 2026 Artia Studio. All rights reserved.',
    }
  };

  // ════════════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════════════
  function getLang() {
    return localStorage.getItem(LANG_KEY) || 'es';
  }

  function applyTranslations(lang) {
    const t = T[lang] || T['es'];

    // textContent
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (t[key] !== undefined) el.textContent = t[key];
    });

    // innerHTML (for elements with nested HTML)
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      if (t[key] !== undefined) el.innerHTML = t[key];
    });

    // placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (t[key] !== undefined) el.placeholder = t[key];
    });

    // html lang attr
    document.documentElement.lang = lang;
  }

  function updateToggleBtns(lang) {
    document.querySelectorAll('.artia-lang-toggle').forEach(function (btn) {
      var esSpan = btn.querySelector('.artia-lang-es');
      var enSpan = btn.querySelector('.artia-lang-en');
      if (esSpan && enSpan) {
        esSpan.style.opacity  = lang === 'es' ? '1'   : '0.4';
        esSpan.style.fontWeight = lang === 'es' ? '800' : '400';
        enSpan.style.opacity  = lang === 'en' ? '1'   : '0.4';
        enSpan.style.fontWeight = lang === 'en' ? '800' : '400';
      }
    });
    // Tooltip text
    document.querySelectorAll('.artia-lang-tooltip').forEach(function (el) {
      el.textContent = T[lang]['nav.change.lang'];
    });
  }

  function setLang(lang) {
    localStorage.setItem(LANG_KEY, lang);
    applyTranslations(lang);
    updateToggleBtns(lang);
  }

  function toggleLang() {
    setLang(getLang() === 'es' ? 'en' : 'es');
  }

  // ════════════════════════════════════════════════════
  //  ESTILOS DEL BOTÓN
  // ════════════════════════════════════════════════════
  var style = document.createElement('style');
  style.textContent = [
    /* Botón base */
    '.artia-lang-toggle {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 2px;',
    '  background: transparent;',
    '  border: 1.5px solid rgba(0,17,58,0.18);',
    '  border-radius: 999px;',
    '  padding: 3px 10px;',
    '  font-family: "Inter", sans-serif;',
    '  font-size: 11px;',
    '  letter-spacing: 0.06em;',
    '  cursor: pointer;',
    '  color: #00113a;',
    '  transition: border-color 0.2s, background 0.2s;',
    '  white-space: nowrap;',
    '  position: relative;',
    '}',
    '.artia-lang-toggle:hover { border-color: #2552ca; background: rgba(37,82,202,0.06); }',
    '.artia-lang-sep { opacity: 0.3; margin: 0 2px; }',
    /* Tooltip escritorio */
    '.artia-lang-wrap-desktop {',
    '  position: relative;',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 8px;',
    '  padding-left: 16px;',
    '}',
    '.artia-lang-tooltip {',
    '  position: absolute;',
    '  left: calc(100% + 10px);',
    '  top: 50%;',
    '  transform: translateY(-50%);',
    '  background: #00113a;',
    '  color: #fff;',
    '  font-size: 10px;',
    '  font-family: "Inter", sans-serif;',
    '  font-weight: 600;',
    '  letter-spacing: 0.05em;',
    '  white-space: nowrap;',
    '  padding: 4px 10px;',
    '  border-radius: 6px;',
    '  pointer-events: none;',
    '  opacity: 0;',
    '  transition: opacity 0.18s ease;',
    '}',
    '.artia-lang-tooltip::before {',
    '  content: "";',
    '  position: absolute;',
    '  right: 100%;',
    '  top: 50%;',
    '  transform: translateY(-50%);',
    '  border: 5px solid transparent;',
    '  border-right-color: #00113a;',
    '}',
    '.artia-lang-wrap-desktop:hover .artia-lang-tooltip { opacity: 1; }',
  ].join('\n');
  document.head.appendChild(style);

  // ════════════════════════════════════════════════════
  //  CREAR BOTÓN DE IDIOMA
  // ════════════════════════════════════════════════════
  function createToggleBtn() {
    var btn = document.createElement('button');
    btn.className   = 'artia-lang-toggle';
    btn.setAttribute('aria-label', 'Switch language / Cambiar idioma');
    btn.type = 'button';
    btn.innerHTML  =
      '<span class="artia-lang-es">ES</span>' +
      '<span class="artia-lang-sep">/</span>' +
      '<span class="artia-lang-en">EN</span>';
    btn.addEventListener('click', toggleLang);
    return btn;
  }

  // ════════════════════════════════════════════════════
  //  INYECTAR EN NAVEGACIÓN
  // ════════════════════════════════════════════════════
  function injectButtons() {

    /* ── 1. ESCRITORIO: al final del sidebar (antes de Soporte) ── */
    var desktopAsides = document.querySelectorAll('aside.fixed.left-0');
    // Usar el último aside visible (el real nav)
    var aside = null;
    desktopAsides.forEach(function(a) {
      if (window.getComputedStyle(a).display !== 'none' || a.classList.contains('lg:flex')) {
        aside = a;
      }
    });
    // Buscar el div de Soporte en todos los asides
    document.querySelectorAll('aside.fixed.left-0').forEach(function(as) {
      var soporteDiv = as.querySelector('.flex.items-center.gap-3.pl-4.text-slate-500');
      if (soporteDiv && !as.querySelector('.artia-lang-wrap-desktop')) {
        var wrap = document.createElement('div');
        wrap.className = 'artia-lang-wrap-desktop';
        var btn = createToggleBtn();
        var tooltip = document.createElement('span');
        tooltip.className = 'artia-lang-tooltip';
        tooltip.textContent = T[getLang()]['nav.change.lang'];
        wrap.appendChild(btn);
        wrap.appendChild(tooltip);
        soporteDiv.parentNode.insertBefore(wrap, soporteDiv.nextSibling);
      }
    });

    /* ── 2. MÓVIL HEADER: reemplazar div.w-10 vacío ── */
    var mobileHeaders = document.querySelectorAll('header.fixed.top-0');
    mobileHeaders.forEach(function (hdr) {
      var emptyDiv = hdr.querySelector('div.w-10');
      if (emptyDiv && !emptyDiv.querySelector('.artia-lang-toggle')) {
        emptyDiv.style.width = 'auto';
        emptyDiv.style.minWidth = '40px';
        emptyDiv.appendChild(createToggleBtn());
      }
    });

    /* ── 3. MÓVIL OVERLAY: encima del botón Reservar ── */
    var mmCta = document.getElementById('mm-cta');
    if (mmCta && !mmCta.querySelector('.artia-lang-toggle')) {
      var mobileWrap = document.createElement('div');
      mobileWrap.style.cssText = 'display:flex;justify-content:center;margin-bottom:16px;';
      mobileWrap.appendChild(createToggleBtn());
      mmCta.parentNode.insertBefore(mobileWrap, mmCta);
    }

    // Aplicar estado visual inicial
    updateToggleBtns(getLang());
  }

  // ════════════════════════════════════════════════════
  //  INIT
  // ════════════════════════════════════════════════════
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      injectButtons();
      applyTranslations(getLang());
      updateToggleBtns(getLang());
    });
  } else {
    injectButtons();
    applyTranslations(getLang());
    updateToggleBtns(getLang());
  }

})();
