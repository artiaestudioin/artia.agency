'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Landing, LandingConfig } from '@/types/landing'

interface LandingRendererProps {
  landing: Landing
  isEditMode: boolean
  utmParams: {
    source?: string
    medium?: string
    campaign?: string
  }
}

export default function LandingRenderer({ landing, isEditMode, utmParams }: LandingRendererProps) {
  const config = landing.config as LandingConfig
  const [mounted, setMounted] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [folio, setFolio] = useState('')
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 })
  const [viewers, setViewers] = useState(config.viewers_min)
  const [currentImage, setCurrentImage] = useState(config.image)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [showSticky, setShowSticky] = useState(false)
  const [editorValues, setEditorValues] = useState({
    headline: config.headline,
    price: config.price,
    image: config.image,
  })

  const sessionId = useRef(`sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const scrollTracked = useRef<Set<number>>(new Set())

  useEffect(() => {
    setMounted(true)
    initCountdown()
    initViewers()
    initPixel()
    trackEvent('page_view')

    // Scroll tracking
    const handleScroll = () => {
      const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      setScrollProgress(scrollPercent)
      setShowSticky(window.scrollY > 600)

      // Track scroll milestones
      [25, 50, 75, 90].forEach(threshold => {
        if (scrollPercent >= threshold && !scrollTracked.current.has(threshold)) {
          scrollTracked.current.add(threshold)
          trackEvent(`scroll_${threshold}` as any)
        }
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Countdown timer
  const initCountdown = () => {
    const key = `countdown_${landing.id}`
    let endTime = localStorage.getItem(key)

    if (!endTime || parseInt(endTime) < Date.now()) {
      endTime = String(Date.now() + config.countdown_hours * 60 * 60 * 1000)
      localStorage.setItem(key, endTime)
    }

    const update = () => {
      const diff = parseInt(endTime!) - Date.now()
      if (diff <= 0) {
        setCountdown({ hours: 0, minutes: 0, seconds: 0 })
        return
      }
      setCountdown({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }

  // Viewers simulation
  const initViewers = () => {
    const base = Math.floor(Math.random() * (config.viewers_max - config.viewers_min)) + config.viewers_min
    setViewers(base)

    const interval = setInterval(() => {
      const change = Math.floor(Math.random() * 7) - 3
      setViewers(prev => Math.max(config.viewers_min, Math.min(config.viewers_max, prev + change)))
    }, 8000)

    return () => clearInterval(interval)
  }

  // Meta Pixel
  const initPixel = () => {
    if (!config.pixel_id || typeof window === 'undefined') return

    const fbq = (window as any).fbq
    if (!fbq) {
      // Load pixel script
      const script = document.createElement('script')
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${config.pixel_id}');
        fbq('track', 'PageView');
      `
      document.head.appendChild(script)
    }

    // Track ViewContent
    setTimeout(() => {
      trackPixel('ViewContent', {
        content_name: config.product_name,
        content_type: 'product',
        value: config.price,
        currency: 'USD',
      })
    }, 1000)
  }

  const trackPixel = (event: string, params?: Record<string, any>) => {
    const fbq = (window as any).fbq
    if (fbq) fbq('track', event, params)
  }

  const trackEvent = async (eventType: string, extraData?: Record<string, any>) => {
    try {
      await fetch('/api/landing-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landing_id: landing.id,
          session_id: sessionId.current,
          event_type: eventType,
          event_data: extraData || {},
          utm_source: utmParams.source,
          utm_medium: utmParams.medium,
          utm_campaign: utmParams.campaign,
        }),
      })
    } catch (e) {
      console.error('Track error:', e)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    // Track events
    trackEvent('form_submit')
    trackPixel('InitiateCheckout', {
      content_name: config.product_name,
      value: config.price * quantity,
      currency: 'USD',
      num_items: quantity,
    })

    // Send CAPI server-side
    if (config.capi_token) {
      fetch('/api/meta-capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pixel_id: config.pixel_id,
          access_token: config.capi_token,
          event_name: 'InitiateCheckout',
          event_data: {
            value: config.price * quantity,
            currency: 'USD',
            content_name: config.product_name,
          },
          user_data: {
            email: formData.email,
            phone: formData.phone,
          },
        }),
      }).catch(() => {})
    }

    // Create order
    try {
      const res = await fetch('/api/landing-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landing_id: landing.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          product_name: config.product_name,
          quantity,
          price: config.price,
          total: config.price * quantity,
          design_description: formData.design,
          design_files: uploadedImage ? [uploadedImage] : [],
          utm_source: utmParams.source,
          utm_medium: utmParams.medium,
          utm_campaign: utmParams.campaign,
        }),
      })

      const data = await res.json()

      if (data.order) {
        setFolio(data.order.folio)
        setSubmitted(true)

        // Track purchase
        trackEvent('purchase', { folio: data.order.folio, value: config.price * quantity })
        trackPixel('Purchase', {
          content_name: config.product_name,
          value: config.price * quantity,
          currency: 'USD',
          num_items: quantity,
        })

        // Launch confetti
        launchConfetti()

        // Redirect to WhatsApp
        const message = `🛒 *NUEVO PEDIDO*\n\n` +
          `*Producto:* ${config.product_name}\n` +
          `*Cantidad:* ${quantity}\n` +
          `*Total:* $${(config.price * quantity).toFixed(2)}\n` +
          `*Folio:* ${data.order.folio}\n\n` +
          `*Cliente:* ${formData.name}\n` +
          `*Teléfono:* ${formData.phone}\n` +
          `*Dirección:* ${formData.address}\n\n` +
          `*Diseño:*\n${formData.design}`

        const waUrl = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(message)}`
        window.open(waUrl, '_blank')
      }
    } catch (e) {
      console.error('Order error:', e)
    } finally {
      setSubmitting(false)
    }
  }

  const launchConfetti = () => {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#10b981', '#f59e0b']
    for (let i = 0; i < 50; i++) {
      const el = document.createElement('div')
      el.style.cssText = `
        position: fixed; z-index: 9999; pointer-events: none;
        width: ${Math.random() * 10 + 5}px; height: ${Math.random() * 10 + 5}px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: ${Math.random() * 100}vw; top: -10px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
        animation: confetti-fall ${Math.random() * 2 + 2}s ease-out forwards;
      `
      document.body.appendChild(el)
      setTimeout(() => el.remove(), 4000)
    }
  }

  const fmtMoney = (n: number) => `${config.currency}${n.toFixed(2)}`

  const total = config.price * quantity

  // Editor mode handlers
  const updateField = (field: string, value: any) => {
    setEditorValues(prev => ({ ...prev, [field]: value }))
  }

  const saveEdit = async () => {
    try {
      await fetch(`/api/admin/landings/${landing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            ...config,
            headline: editorValues.headline,
            price: editorValues.price,
            image: editorValues.image,
          },
        }),
      })
      alert('Cambios guardados ✓')
    } catch (e) {
      alert('Error guardando')
    }
  }

  if (!mounted) return <div className="min-h-screen bg-gray-50" />

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 antialiased" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Inline Editor (Admin only) */}
      {isEditMode && (
        <div className="fixed top-4 right-4 z-50 bg-white rounded-xl shadow-2xl border-2 border-purple-200 p-4 w-80 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">🔧 Editor Rápido</h3>
            <button onClick={() => window.location.href = window.location.pathname} className="text-gray-400">✕</button>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Headline</label>
              <input value={editorValues.headline} onChange={e => updateField('headline', e.target.value)}
                className="w-full px-2 py-1 border rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Precio</label>
              <input type="number" value={editorValues.price} onChange={e => updateField('price', parseFloat(e.target.value))}
                className="w-full px-2 py-1 border rounded text-sm" step="0.01" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Imagen URL</label>
              <input value={editorValues.image} onChange={e => updateField('image', e.target.value)}
                className="w-full px-2 py-1 border rounded text-sm" />
            </div>
            <button onClick={saveEdit} className="w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-bold">
              💾 Guardar Cambios
            </button>
            <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
              Los cambios son instantáneos en la base de datos.
            </p>
          </div>
        </div>
      )}

      {/* Confetti animation */}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes pulse-soft {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animate-pulse-soft { animation: pulse-soft 2s ease-in-out infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: config.gradient_hero }}>A</div>
            <span className="font-bold text-gray-800 tracking-tight">Artia Studio</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>{viewers} personas</span> viendo
            </div>
            <a href="#order" className="bg-gray-900 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-gray-800 transition">
              Ordenar
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Text */}
          <div className="space-y-6" style={{ animation: 'slide-up 0.6s ease-out' }}>
            {/* Discount Badge */}
            <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 rounded-full px-4 py-2">
              <span className="text-red-500 text-lg">🔥</span>
              <span className="text-red-600 font-bold text-sm">OFERTA FLASH {config.discount} OFF</span>
              <span className="text-xs text-red-400">Solo hoy</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-tight tracking-tight">
              {editorValues.headline}
            </h1>

            <p className="text-lg text-gray-600 leading-relaxed max-w-lg">
              {config.subheadline}
            </p>

            {/* Price */}
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-4xl font-black text-gray-900">{fmtMoney(editorValues.price)}</span>
              <span className="text-xl text-gray-400 line-through">{fmtMoney(config.old_price)}</span>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                Ahorras {fmtMoney(config.old_price - editorValues.price)}
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a href="#order" onClick={() => trackEvent('click_cta')}
                className="text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-center animate-pulse-soft flex items-center justify-center gap-2"
                style={{ background: config.gradient_cta }}>
                <span>🛒</span>
                <span>{config.cta_text}</span>
              </a>
              <a href={`https://wa.me/${config.whatsapp}?text=Hola!%20Me%20interesa%20${encodeURIComponent(config.product_name)}`}
                target="_blank" rel="noopener noreferrer"
                onClick={() => trackEvent('click_whatsapp')}
                className="bg-green-500 text-white px-6 py-4 rounded-2xl font-bold text-base shadow-xl shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 transition-all duration-300 text-center flex items-center justify-center gap-2 relative">
                <span className="absolute inset-[-4px] rounded-2xl bg-green-500/40 animate-ping" style={{ animationDuration: '2s' }} />
                <span>💬</span>
                <span>Preguntar por WhatsApp</span>
              </a>
            </div>

            {/* Guarantees */}
            <div className="flex flex-wrap gap-4 pt-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">✅ Envío gratis</span>
              <span className="flex items-center gap-1">🔄 Garantía 30 días</span>
              <span className="flex items-center gap-1">🔒 Pago seguro</span>
              <span className="flex items-center gap-1">⭐ 4.9/5 (2,847 reviews)</span>
            </div>
          </div>

          {/* Image */}
          <div className="relative animate-float">
            <div className="absolute -inset-4 rounded-3xl opacity-30 blur-2xl" style={{ background: config.gradient_hero }} />
            <div className="relative bg-white/95 backdrop-blur rounded-3xl p-4 shadow-2xl border border-white/30">
              <img src={currentImage} alt={config.product_name} className="w-full h-auto rounded-2xl object-cover aspect-square" />

              {/* Stock Badge */}
              {config.show_stock_bar && (
                <div className="absolute -top-3 -right-3 bg-red-500 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg animate-pulse">
                  ¡Solo {config.stock_current} left!
                </div>
              )}

              {/* Gallery Thumbs */}
              {config.show_gallery && config.gallery.length > 0 && (
                <div className="flex gap-2 mt-4 justify-center">
                  {[config.image, ...config.gallery].map((img, i) => (
                    <button key={i} onClick={() => setCurrentImage(img)}
                      className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition ${currentImage === img ? 'border-purple-500' : 'border-transparent hover:border-purple-300'}`}>
                      <img src={img} className="w-full h-full object-cover" alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Countdown & Urgency */}
      {(config.show_countdown || config.show_stock_bar) && (
        <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto mb-8">
          <div className="bg-gray-900 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')]" />

            <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
              {config.show_countdown && (
                <>
                  <div className="text-center lg:text-left">
                    <h3 className="text-lg font-bold mb-1">⏰ Oferta Termina En:</h3>
                    <p className="text-gray-400 text-sm">Después el precio vuelve a {fmtMoney(config.old_price)}</p>
                  </div>

                  <div className="flex gap-3 sm:gap-4">
                    {['hours', 'minutes', 'seconds'].map((unit, i) => (
                      <div key={unit} className="text-center">
                        <div className={`w-16 h-16 sm:w-20 sm:h-20 bg-white/10 rounded-xl flex items-center justify-center text-2xl sm:text-3xl font-black backdrop-blur ${unit === 'seconds' ? 'text-red-400' : ''}`}>
                          {String(countdown[unit as keyof typeof countdown]).padStart(2, '0')}
                        </div>
                        <span className="text-xs text-gray-400 mt-1 block capitalize">{unit === 'hours' ? 'Horas' : unit === 'minutes' ? 'Min' : 'Seg'}</span>
                      </div>
                    )).reduce((acc: React.ReactNode[], curr, i) => {
                      acc.push(curr)
                      if (i < 2) acc.push(<div key={`sep-${i}`} className="text-2xl sm:text-3xl font-black self-start mt-4">:</div>)
                      return acc
                    }, [])}
                  </div>
                </>
              )}

              {config.show_stock_bar && (
                <div className="w-full lg:w-64">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-400">Stock disponible</span>
                    <span className="font-bold text-red-400">{config.stock_current} unidades</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${(config.stock_current / config.stock_total) * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #ef4444)' }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center lg:text-left">
                    {viewers} personas están viendo esto ahora
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      {config.show_features && (
        <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto mb-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {config.features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h4 className="font-bold text-gray-900 mb-1">{f.title}</h4>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Testimonials */}
      {config.show_testimonials && (
        <section className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto mb-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">¿Qué dicen nuestros clientes?</h2>
            <p className="text-gray-500">Más de 2,000 productos entregados</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {config.testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <img src={t.image} className="w-12 h-12 rounded-full object-cover" alt={t.name} />
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.location}</p>
                  </div>
                </div>
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <span key={j} className="text-yellow-400 text-sm">★</span>
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">"{t.text}"</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Order Form */}
      <section id="order" className="px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto mb-24">
        <div className="bg-white/95 backdrop-blur rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/30">
          {!submitted ? (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black text-gray-900 mb-2">Completa tu Pedido</h2>
                <p className="text-gray-500 text-sm">Envío gratis incluido. Entrega en 24-48h.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Product Summary */}
                <div className="flex items-center gap-4 bg-gray-50 rounded-xl p-4">
                  <img src={currentImage} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900">{config.product_name}</h4>
                    <p className="text-sm text-gray-500">Personalización incluida</p>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-lg text-gray-900">{fmtMoney(editorValues.price)}</div>
                    <div className="text-sm text-gray-400 line-through">{fmtMoney(config.old_price)}</div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                    <input type="text" required value={formData.name || ''}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                      placeholder="Tu nombre" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono / WhatsApp *</label>
                    <input type="tel" required value={formData.phone || ''}
                      onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                      placeholder="09X XXX XXXX" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formData.email || ''}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                    placeholder="tu@email.com" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad / Dirección de entrega *</label>
                  <input type="text" required value={formData.address || ''}
                    onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition"
                    placeholder="Ej: Quito, Av. Principal 123" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">¿Qué diseño quieres? *</label>
                  <textarea required rows={3} value={formData.design || ''}
                    onChange={e => setFormData(p => ({ ...p, design: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition resize-none"
                    placeholder="Describe tu diseño..." />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subir imagen (opcional)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-purple-400 transition cursor-pointer"
                    onClick={() => document.getElementById('file-upload')?.click()}>
                    <input type="file" id="file-upload" accept="image/*" className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = ev => setUploadedImage(ev.target?.result as string)
                          reader.readAsDataURL(file)
                        }
                      }} />
                    {uploadedImage ? (
                      <div>
                        <img src={uploadedImage} className="max-h-32 mx-auto rounded-lg" alt="Preview" />
                        <p className="text-sm text-green-600 mt-2">✅ Imagen lista</p>
                      </div>
                    ) : (
                      <div>
                        <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-500">Arrastra o haz click para subir</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                  <span className="font-medium text-gray-700">Cantidad</span>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100">-</button>
                    <span className="font-bold w-8 text-center">{quantity}</span>
                    <button type="button" onClick={() => setQuantity(Math.min(10, quantity + 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100">+</button>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{fmtMoney(total)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Envío</span>
                    <span className="text-green-600 font-medium">GRATIS</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-black">
                    <span>Total</span>
                    <span style={{ color: config.color_primary }}>{fmtMoney(total)}</span>
                  </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={submitting}
                  className="w-full text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 animate-pulse-soft disabled:opacity-70"
                  style={{ background: config.gradient_cta }}>
                  {submitting ? '⏳ Procesando...' : '🚀 Confirmar Pedido Ahora'}
                </button>

                <p className="text-center text-xs text-gray-400">
                  Al confirmar, te contactaremos por WhatsApp. Pago contra entrega disponible.
                </p>
              </form>
            </>
          ) : (
            <div className="text-center py-10">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">¡Pedido Enviado!</h3>
              <p className="text-gray-600 mb-2">Tu número de seguimiento:</p>
              <div className="bg-gray-100 rounded-lg p-3 mb-4 inline-block">
                <code className="text-lg font-bold text-purple-600">{folio}</code>
              </div>
              <p className="text-gray-600 mb-4">
                <a href={`/cliente/${folio}`} className="text-purple-600 font-bold hover:underline">
                  Seguir mi pedido →
                </a>
              </p>
              <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noopener noreferrer"
                className="inline-block bg-green-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition">
                Abrir WhatsApp
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Sticky CTA Bar */}
      {config.sticky_cta && (
        <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-200 transition-transform duration-300 ${showSticky ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <img src={currentImage} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" alt="" />
              <div className="min-w-0">
                <p className="font-bold text-sm text-gray-900 truncate">{config.product_name}</p>
                <p className="text-xs text-gray-500">
                  <span className="font-black">{fmtMoney(editorValues.price)}</span>
                  <span className="line-through text-gray-400 ml-1">{fmtMoney(config.old_price)}</span>
                </p>
              </div>
            </div>
            <a href="#order" onClick={() => trackEvent('click_cta')}
              className="text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:scale-105 transition flex-shrink-0 whitespace-nowrap"
              style={{ background: config.gradient_cta }}>
              Ordenar Ahora →
            </a>
          </div>
        </div>
      )}

      {/* Custom CSS/JS */}
      {config.custom_css && <style>{config.custom_css}</style>}
      {config.custom_js && <script dangerouslySetInnerHTML={{ __html: config.custom_js }} />}
    </div>
  )
}
