'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus, QrCode, ExternalLink, Copy, Trash2, Edit, BarChart2,
  Sparkles, Filter, Search, Download
} from 'lucide-react'
import type { ARExperience, OccasionType } from '@/types/ar'
import { OCCASION_LABELS, OCCASION_EMOJIS } from '@/types/ar'

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  draft:    { label: 'Borrador',  color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  active:   { label: 'Activa',    color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  paused:   { label: 'Pausada',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  archived: { label: 'Archivada', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
}

function StatusBadge({ status }: { status: ARExperience['status'] }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
      color: cfg.color, background: cfg.bg,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
      {cfg.label}
    </span>
  )
}

function QRPreview({ url, size = 80 }: { url: string | null; size?: number }) {
  if (!url) return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: '#1e1b2e', border: '1px dashed #3f3a5c',
      display: 'grid', placeItems: 'center', color: '#6b6894', fontSize: 11,
    }}>QR</div>
  )
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=0a0a0f&margin=2`}
      alt="QR"
      width={size} height={size}
      style={{ borderRadius: 8, border: '1px solid #e5e7eb', display: 'block' }}
    />
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ARDashboardPage() {
  const [experiences, setExperiences] = useState<ARExperience[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterOccasion, setFilterOccasion] = useState<string>('')
  const [deleting, setDeleting]       = useState<string | null>(null)

  const fetchExperiences = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus)  params.set('status', filterStatus)
      if (filterOccasion) params.set('occasion', filterOccasion)
      const res = await fetch(`/api/ar/experiences?${params}`)
      const json = await res.json()
      setExperiences(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterOccasion])

  useEffect(() => { fetchExperiences() }, [fetchExperiences])

  const filtered = experiences.filter(e =>
    !search ||
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.recipient_name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete(id: string, title: string) {
    if (!confirm(`¿Eliminar "${title}"? Esta acción no se puede deshacer.`)) return
    setDeleting(id)
    await fetch(`/api/ar/experiences/${id}`, { method: 'DELETE' })
    setExperiences(prev => prev.filter(e => e.id !== id))
    setDeleting(null)
  }

  async function handleDuplicate(id: string) {
    const res = await fetch(`/api/ar/experiences/${id}/duplicate`, { method: 'POST' })
    const json = await res.json()
    if (json.data) setExperiences(prev => [json.data, ...prev])
  }

  function downloadQR(url: string, title: string) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=0a0a0f&margin=4`
    const a = document.createElement('a')
    a.href = qrUrl
    a.download = `qr-${title.replace(/\s+/g, '-').toLowerCase()}.png`
    a.target = '_blank'
    a.click()
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1280, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Sparkles size={20} color="#c084fc" />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c084fc' }}>
              Plataforma WebAR
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#f1f0f9' }}>Experiencias AR</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#9ca3af' }}>
            {experiences.length} experiencia{experiences.length !== 1 ? 's' : ''} creada{experiences.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/admin/ar/nuevo" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'linear-gradient(135deg, #c084fc, #818cf8)',
          color: '#fff', fontWeight: 700, fontSize: 14,
          padding: '11px 20px', borderRadius: 12, textDecoration: 'none',
          boxShadow: '0 4px 20px rgba(192,132,252,0.35)',
        }}>
          <Plus size={16} />
          Nueva Experiencia
        </Link>
      </div>

      {/* Filtros */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap',
        background: '#13111f', border: '1px solid #2a2642',
        borderRadius: 12, padding: '12px 16px',
      }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#6b6894' }} />
          <input
            type="text" placeholder="Buscar por título o destinatario…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              background: '#1e1b2e', border: '1px solid #2a2642', borderRadius: 8,
              color: '#f1f0f9', fontSize: 14, outline: 'none',
            }}
          />
        </div>
        <select
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', background: '#1e1b2e', border: '1px solid #2a2642', borderRadius: 8, color: '#f1f0f9', fontSize: 14, cursor: 'pointer' }}
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={filterOccasion} onChange={e => setFilterOccasion(e.target.value)}
          style={{ padding: '8px 12px', background: '#1e1b2e', border: '1px solid #2a2642', borderRadius: 8, color: '#f1f0f9', fontSize: 14, cursor: 'pointer' }}
        >
          <option value="">Todas las ocasiones</option>
          {(Object.entries(OCCASION_LABELS) as [OccasionType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{OCCASION_EMOJIS[k]} {v}</option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#6b6894' }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: '#13111f', border: '1px dashed #2a2642', borderRadius: 16,
          color: '#6b6894',
        }}>
          <Sparkles size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>No hay experiencias todavía</p>
          <p style={{ margin: '8px 0 20px', fontSize: 14 }}>Crea tu primera experiencia AR para empezar</p>
          <Link href="/admin/ar/nuevo" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#c084fc', color: '#fff', fontWeight: 600, fontSize: 14,
            padding: '10px 18px', borderRadius: 10, textDecoration: 'none',
          }}>
            <Plus size={14} /> Crear experiencia
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.map(exp => (
            <div key={exp.id} style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr auto',
              gap: 20, alignItems: 'center',
              background: '#13111f', border: '1px solid #2a2642',
              borderRadius: 14, padding: '16px 20px',
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#c084fc')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2642')}
            >
              {/* QR */}
              <QRPreview url={exp.public_url} size={80} />

              {/* Info */}
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>{OCCASION_EMOJIS[exp.occasion]}</span>
                  <span style={{ fontWeight: 700, fontSize: 16, color: '#f1f0f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {exp.title}
                  </span>
                  <StatusBadge status={exp.status} />
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#9ca3af' }}>
                  {exp.recipient_name && (
                    <span>👤 {exp.recipient_name}</span>
                  )}
                  <span>{OCCASION_LABELS[exp.occasion]}</span>
                  <span title="Escaneos">📱 {exp.scan_count} scans</span>
                  <span title="Lanzamientos AR">🔮 {exp.ar_launch_count} lanzamientos AR</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b6894' }}>
                    /ar/{exp.slug}
                  </span>
                </div>
                {exp.public_url && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#6b6894', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {exp.public_url}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                {exp.public_url && (
                  <>
                    <button
                      onClick={() => downloadQR(exp.public_url!, exp.title)}
                      title="Descargar QR"
                      style={btnStyle('#1e1b2e', '#2a2642')}
                    >
                      <Download size={14} />
                    </button>
                    <a
                      href={exp.public_url} target="_blank" rel="noopener noreferrer"
                      title="Ver experiencia"
                      style={{ ...btnStyle('#1e1b2e', '#2a2642'), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <ExternalLink size={14} />
                    </a>
                  </>
                )}
                <button
                  onClick={() => handleDuplicate(exp.id)}
                  title="Duplicar"
                  style={btnStyle('#1e1b2e', '#2a2642')}
                >
                  <Copy size={14} />
                </button>
                <Link
                  href={`/admin/ar/${exp.id}/editar`}
                  title="Editar"
                  style={{ ...btnStyle('#c084fc22', '#c084fc'), textDecoration: 'none', display: 'inline-flex', alignItems: 'center', color: '#c084fc' }}
                >
                  <Edit size={14} />
                </Link>
                <button
                  onClick={() => handleDelete(exp.id, exp.title)}
                  title="Eliminar"
                  disabled={deleting === exp.id}
                  style={btnStyle('#fb71851a', '#fb7185', '#fb7185')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function btnStyle(bg: string, border: string, color = '#9ca3af') {
  return {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34, borderRadius: 8,
    background: bg, border: `1px solid ${border}`, color,
    cursor: 'pointer', transition: 'opacity 0.15s',
  } as React.CSSProperties
}
