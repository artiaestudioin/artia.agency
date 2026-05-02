// app/admin/landings/utm/page.tsx
'use client'

import { useState, useEffect } from 'react'

interface Landing {
  id: string
  slug: string
  name: string
}

interface UtmLink {
  id: string
  name: string
  full_url: string
  utm_source: string
  utm_medium: string | null
  utm_campaign: string | null
  clicks: number
  conversions: number
  revenue: number
}

export default function UtmPage() {
  const [landings, setLandings] = useState<Landing[]>([])
  const [links, setLinks] = useState<UtmLink[]>([])
  const [selectedLanding, setSelectedLanding] = useState('')
  const [form, setForm] = useState({
    name: '',
    utm_source: 'facebook',
    utm_medium: 'cpc',
    utm_campaign: '',
    utm_content: '',
    utm_term: '',
  })
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/landings?status=active')
      .then(r => r.json())
      .then(d => setLandings(d.landings || []))

    fetchLinks()
  }, [])

  const fetchLinks = () => {
    fetch('/api/admin/utm-links')
      .then(r => r.json())
      .then(d => setLinks(d.links || []))
  }

  const generateUrl = () => {
    if (!selectedLanding) return ''
    const landing = landings.find(l => l.id === selectedLanding)
    if (!landing) return ''

    const base = `https://artiaagency.vercel.app/lp/${landing.slug}`
    const params = new URLSearchParams()
    if (form.utm_source) params.set('utm_source', form.utm_source)
    if (form.utm_medium) params.set('utm_medium', form.utm_medium)
    if (form.utm_campaign) params.set('utm_campaign', form.utm_campaign)
    if (form.utm_content) params.set('utm_content', form.utm_content)
    if (form.utm_term) params.set('utm_term', form.utm_term)

    return `${base}?${params.toString()}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const landing = landings.find(l => l.id === selectedLanding)
    if (!landing) return

    try {
      const res = await fetch('/api/admin/utm-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
  ...form,
  landing_id: selectedLanding,
  slug: landing.slug,
}),
      })

      if (res.ok) {
        setForm({ name: '', utm_source: 'facebook', utm_medium: 'cpc', utm_campaign: '', utm_content: '', utm_term: '' })
        fetchLinks()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0',
    borderRadius: 8, fontSize: 13, outline: 'none', background: '#fff',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase',
    color: '#94a3b8', display: 'block', marginBottom: 5,
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: '0 0 4px' }}>🔗 UTM Link Generator</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Crea URLs trackeadas para tus campañas de Meta Ads</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Generator Form */}
        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e2e8f0', padding: '20px 24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>Generar nuevo link</h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Landing Page *</label>
              <select required value={selectedLanding} onChange={e => setSelectedLanding(e.target.value)} style={inputStyle}>
                <option value="">Selecciona una landing...</option>
                {landings.map(l => (
                  <option key={l.id} value={l.id}>{l.name} (/lp/{l.slug})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Nombre del link *</label>
              <input type="text" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Meta Ads Abril 2026" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>UTM Source *</label>
                <select value={form.utm_source} onChange={e => setForm(f => ({ ...f, utm_source: e.target.value }))} style={inputStyle}>
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="google">Google</option>
                  <option value="tiktok">TikTok</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="organic">Orgánico</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>UTM Medium</label>
                <select value={form.utm_medium} onChange={e => setForm(f => ({ ...f, utm_medium: e.target.value }))} style={inputStyle}>
                  <option value="cpc">CPC (Pago por click)</option>
                  <option value="cpm">CPM (Impresiones)</option>
                  <option value="organic">Orgánico</option>
                  <option value="email">Email</option>
                  <option value="social">Social</option>
                  <option value="referral">Referral</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>UTM Campaign</label>
              <input type="text" value={form.utm_campaign} onChange={e => setForm(f => ({ ...f, utm_campaign: e.target.value }))}
                placeholder="Ej: tazas-verano-2026" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>UTM Content</label>
                <input type="text" value={form.utm_content} onChange={e => setForm(f => ({ ...f, utm_content: e.target.value }))}
                  placeholder="Ej: video-1" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>UTM Term</label>
                <input type="text" value={form.utm_term} onChange={e => setForm(f => ({ ...f, utm_term: e.target.value }))}
                  placeholder="Ej: taza personalizada" style={inputStyle} />
              </div>
            </div>

            {/* Preview */}
            {selectedLanding && (
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12, border: '1px dashed #e2e8f0' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>URL Preview</div>
                <code style={{ fontSize: 11, color: '#0f172a', wordBreak: 'break-all', display: 'block' }}>
                  {generateUrl()}
                </code>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{
                background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}>
              {loading ? '⏳ Generando...' : '⚡ Generar UTM Link'}
            </button>
          </form>
        </div>

        {/* Links List */}
        <div style={{ background: '#fff', borderRadius: 14, border: '0.5px solid #e2e8f0', padding: '20px 24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: '0 0 16px' }}>
            Links generados ({links.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 500, overflowY: 'auto' }}>
            {links.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: 20 }}>
                No hay links generados aún
              </p>
            ) : (
              links.map(link => (
                <div key={link.id} style={{ background: '#f8fafc', borderRadius: 10, padding: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{link.name}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                        {link.utm_source} · {link.utm_medium} · {link.utm_campaign}
                      </div>
                    </div>
                    <button onClick={() => copyUrl(link.full_url, link.id)}
                      style={{
                        background: copiedId === link.id ? '#dcfce7' : '#eff6ff',
                        color: copiedId === link.id ? '#166534' : '#2563eb',
                        border: 'none', borderRadius: 6, padding: '4px 10px',
                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      }}>
                      {copiedId === link.id ? '✓ Copiado' : '📋 Copiar'}
                    </button>
                  </div>
                  <code style={{ fontSize: 10, color: '#64748b', wordBreak: 'break-all', display: 'block', marginBottom: 8 }}>
                    {link.full_url}
                  </code>
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#94a3b8' }}>
                    <span>👁️ {link.clicks} clicks</span>
                    <span>🎯 {link.conversions} conversiones</span>
                    <span>💰 ${link.revenue?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
