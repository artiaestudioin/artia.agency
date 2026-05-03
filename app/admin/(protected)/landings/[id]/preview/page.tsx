// app/admin/landings/[id]/preview/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'

const DEVICES = [
  { name: 'iPhone 14', width: 390, height: 844, type: 'mobile' },
  { name: 'iPhone SE', width: 375, height: 667, type: 'mobile' },
  { name: 'Samsung S23', width: 384, height: 854, type: 'mobile' },
  { name: 'iPad Mini', width: 768, height: 1024, type: 'tablet' },
  { name: 'Desktop', width: 1280, height: 800, type: 'desktop' },
  { name: 'MacBook', width: 1440, height: 900, type: 'desktop' },
]

const FEED_SIMULATORS = [
  { name: 'Facebook Feed', icon: '📘', bg: '#f0f2f5' },
  { name: 'Instagram Story', icon: '📸', bg: '#000' },
  { name: 'Instagram Feed', icon: '📷', bg: '#fafafa' },
  { name: 'TikTok', icon: '🎵', bg: '#000' },
]

export default function PreviewPage() {
  const { id } = useParams()
  const [selectedDevice, setSelectedDevice] = useState(DEVICES[0])
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null)
  const [landingUrl, setLandingUrl] = useState('')
  const [scale, setScale] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch landing slug
    fetch(`/api/admin/landings/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.landing) {
          setLandingUrl(`https://artiaagency.vercel.app/lp/${d.landing.slug}?edit=true`)
        }
        setLoading(false)
      })
  }, [id])

  // Auto-scale to fit viewport
  useEffect(() => {
    const viewportWidth = window.innerWidth - 100
    const viewportHeight = window.innerHeight - 200
    const scaleX = viewportWidth / selectedDevice.width
    const scaleY = viewportHeight / selectedDevice.height
    setScale(Math.min(scaleX, scaleY, 1))
  }, [selectedDevice])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Cargando preview...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column', background: '#1a1a2e' }}>
      {/* Toolbar */}
      <div style={{
        background: '#16213e', borderBottom: '1px solid #0f3460',
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>👁️</span>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>Preview</span>
        </div>

        {/* Device Selector */}
        <div style={{ display: 'flex', gap: 4, background: '#0f3460', borderRadius: 8, padding: 4 }}>
          {DEVICES.map(device => (
            <button
              key={device.name}
              onClick={() => { setSelectedDevice(device); setSelectedFeed(null) }}
              style={{
                padding: '6px 12px', borderRadius: 6, border: 'none',
                background: selectedDevice.name === device.name ? '#e94560' : 'transparent',
                color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <span>{device.type === 'mobile' ? '📱' : device.type === 'tablet' ? '💻' : '🖥️'}</span>
              {device.name}
            </button>
          ))}
        </div>

        {/* Feed Simulator */}
        <div style={{ display: 'flex', gap: 4, background: '#0f3460', borderRadius: 8, padding: 4 }}>
          {FEED_SIMULATORS.map(feed => (
            <button
              key={feed.name}
              onClick={() => setSelectedFeed(selectedFeed === feed.name ? null : feed.name)}
              style={{
                padding: '6px 12px', borderRadius: 6, border: 'none',
                background: selectedFeed === feed.name ? '#e94560' : 'transparent',
                color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {feed.icon} {feed.name}
            </button>
          ))}
        </div>

        {/* Scale Info */}
        <div style={{ color: '#94a3b8', fontSize: 12, marginLeft: 'auto' }}>
          {selectedDevice.width}×{selectedDevice.height} · Scale: {scale.toFixed(2)}x
        </div>
      </div>

      {/* Preview Area */}
      <div style={{
        flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40, background: selectedFeed ? FEED_SIMULATORS.find(f => f.name === selectedFeed)?.bg : '#1a1a2e',
      }}>
        {selectedFeed ? (
          // Feed Simulator Mode
          <FeedSimulator
            feed={selectedFeed}
            landingUrl={landingUrl}
            device={selectedDevice}
            scale={scale}
          />
        ) : (
          // Device Simulator Mode
          <div style={{
            width: selectedDevice.width,
            height: selectedDevice.height,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
            background: '#fff',
            borderRadius: selectedDevice.type === 'mobile' ? 40 : 12,
            overflow: 'hidden',
            boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
            border: '12px solid #333',
            position: 'relative',
          }}>
            {/* Notch for mobile */}
            {selectedDevice.type === 'mobile' && (
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 120, height: 28, background: '#333', borderRadius: '0 0 16px 16px',
                zIndex: 10,
              }} />
            )}

            <iframe
              src={landingUrl}
              style={{
                width: '100%', height: '100%', border: 'none',
                borderRadius: selectedDevice.type === 'mobile' ? 28 : 0,
              }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function FeedSimulator({ feed, landingUrl, device, scale }: {
  feed: string
  landingUrl: string
  device: typeof DEVICES[0]
  scale: number
}) {
  if (feed === 'Instagram Story') {
    return (
      <div style={{
        width: 360,
        height: 640,
        transform: `scale(${Math.min(scale * 1.2, 1)})`,
        background: '#000',
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Story UI */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 4, background: 'rgba(255,255,255,0.3)', zIndex: 10,
        }}>
          <div style={{ width: '60%', height: '100%', background: '#fff', borderRadius: 2 }} />
        </div>

        <div style={{ padding: '40px 20px 20px', color: '#fff', position: 'relative', zIndex: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)' }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>artia.studio</div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>Sponsored</div>
            </div>
          </div>
        </div>

        {/* Landing Preview in Story */}
        <div style={{
          position: 'absolute', bottom: 80, left: 20, right: 20,
          background: '#fff', borderRadius: 16, overflow: 'hidden',
          maxHeight: 300,
        }}>
          <iframe
            src={landingUrl}
            style={{ width: '100%', height: 300, border: 'none' }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        {/* Swipe up CTA */}
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>↑ Swipe up to shop</div>
        </div>
      </div>
    )
  }

  // Facebook / Instagram Feed Simulator
  return (
    <div style={{
      width: Math.min(device.width, 500),
      maxHeight: 800,
      transform: `scale(${scale})`,
      background: '#fff',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    }}>
      {/* Feed Post Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f0f2f5' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#050505' }}>Artia Studio</div>
          <div style={{ fontSize: 12, color: '#65676b' }}>Sponsored · 2h</div>
        </div>
        <span style={{ fontSize: 20, color: '#65676b' }}>⋯</span>
      </div>

      {/* Post Text */}
      <div style={{ padding: '12px 16px', fontSize: 14, color: '#050505', lineHeight: 1.5 }}>
        🔥 OFERTA FLASH 50% OFF
        <br /><br />
        La taza que cuenta TU historia. Personalízala con tu foto favorita.
      </div>

      {/* Landing Preview */}
      <div style={{ border: '1px solid #f0f2f5', margin: '0 16px 12px', borderRadius: 8, overflow: 'hidden' }}>
        <iframe
          src={landingUrl}
          style={{ width: '100%', height: 400, border: 'none' }}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      {/* Engagement Bar */}
      <div style={{ padding: '8px 16px', borderTop: '1px solid #f0f2f5', display: 'flex', gap: 16 }}>
        <span style={{ fontSize: 20 }}>👍</span>
        <span style={{ fontSize: 20 }}>💬</span>
        <span style={{ fontSize: 20 }}>↗️</span>
      </div>
    </div>
  )
}
