'use client'

import { useState, useRef, useCallback } from 'react'

type Lead = { id: string; nombre: string; email: string | null; folio: string | null; servicio: string | null; payment_status: string | null }
type Project = {
  id: string; name: string; description: string | null; access_code: string
  status: string; event_date: string | null; created_at: string; lead_id: string | null
  leads: Lead | null; file_count: number
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  activo:    { label: 'En producción', color: '#2552ca', bg: '#eff6ff' },
  entregado: { label: 'Entregado',     color: '#10b981', bg: '#f0fdf4' },
  archivado: { label: 'Archivado',     color: '#94a3b8', bg: '#f8fafc' },
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artiaagency.vercel.app'

export default function ProyectosCRMClient({ projects: init }: { projects: Project[] }) {
  const [projects, setProjects] = useState<Project[]>(init)
  const [selected, setSelected] = useState<Project | null>(null)
  const [tab, setTab]           = useState<'info' | 'files'>('info')
  const [files, setFiles]       = useState<any[]>([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [uploadError, setUploadError]   = useState('')
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newForm, setNewForm]   = useState({ name: '', description: '', event_date: '' })
  const [saving, setSaving]     = useState(false)
  const [deletingProject, setDeletingProject] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function showMsg(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function openProject(p: Project) {
    setSelected(p)
    setTab('info')
    setUploadError('')
    loadProjectFiles(p.id)
  }

  async function loadProjectFiles(projectId: string) {
    setLoadingFiles(true)
    try {
      const res  = await fetch(`/api/admin/project-files/list?projectId=${projectId}`)
      const data = await res.json()
      setFiles(data.files ?? [])
    } catch {
      setFiles([])
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (!selected) return
    await uploadFiles(Array.from(e.dataTransfer.files))
  }, [selected])

  async function uploadFiles(filesToUpload: File[]) {
    if (!selected || filesToUpload.length === 0) return
    setUploading(true)
    setUploadError('')
    let success = 0

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i]
      setUploadProgress(`Subiendo ${i + 1}/${filesToUpload.length}: ${file.name}`)
      try {
        const form = new FormData()
        form.append('file', file)
        form.append('projectId', selected.id)
        const res  = await fetch('/api/admin/project-files', { method: 'POST', body: form })
        const data = await res.json()
        if (res.ok && data.file) {
          setFiles(prev => [data.file, ...prev])
          success++
        } else {
          setUploadError(data.error ?? 'Error subiendo archivo')
        }
      } catch (e: any) {
        setUploadError(e.message ?? 'Error de conexión')
      }
    }

    setUploadProgress('')
    setUploading(false)
    setProjects(prev => prev.map(p => p.id === selected.id ? { ...p, file_count: p.file_count + success } : p))
    if (success > 0) showMsg(`${success} archivo${success > 1 ? 's' : ''} subido${success > 1 ? 's' : ''} ✓`)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function deleteFile(fileId: string) {
    if (!selected || !confirm('¿Eliminar este archivo?')) return
    const res = await fetch('/api/admin/project-files', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, projectId: selected.id }),
    })
    if (res.ok) {
      setFiles(prev => prev.filter(f => f.id !== fileId))
      setProjects(prev => prev.map(p => p.id === selected.id ? { ...p, file_count: Math.max(0, p.file_count - 1) } : p))
      showMsg('Archivo eliminado')
    }
  }

  async function updateStatus(projectId: string, newStatus: string) {
    const res = await fetch('/api/admin/projects/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, status: newStatus }),
    })
    if (res.ok) {
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p))
      if (selected?.id === projectId) setSelected(s => s ? { ...s, status: newStatus } : s)
      showMsg('Estado actualizado')
    }
  }

  async function deleteProject(projectId: string, projectName: string) {
    if (!confirm(`¿Eliminar el proyecto "${projectName}" y todos sus archivos? Esta acción no se puede deshacer.`)) return
    setDeletingProject(true)
    try {
      const res  = await fetch('/api/admin/projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      })
      const data = await res.json()
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== projectId))
        if (selected?.id === projectId) setSelected(null)
        showMsg('Proyecto eliminado')
      } else {
        showMsg(data.error ?? 'Error eliminando proyecto', false)
      }
    } finally {
      setDeletingProject(false)
    }
  }

  async function createProject() {
    if (!newForm.name.trim()) return
    setSaving(true)
    try {
      const res  = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      })
      const data = await res.json()
      if (res.ok && data.project) {
        setProjects(prev => [{ ...data.project, leads: null, file_count: 0 }, ...prev])
        setShowNewModal(false)
        setNewForm({ name: '', description: '', event_date: '' })
        showMsg('Proyecto creado ✓')
      } else {
        showMsg(data.error ?? 'Error', false)
      }
    } finally {
      setSaving(false)
    }
  }

  function isImage(url: string, type?: string) {
    if (type?.startsWith('image/')) return true
    return /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(url)
  }

  const portalUrl = (code: string) => `${SITE_URL}/client/${code}`

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '0.5px solid #e2e8f0', borderRadius: 8,
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 120px)' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, background: toast.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${toast.ok ? '#bbf7d0' : '#fecaca'}`, color: toast.ok ? '#15803d' : '#dc2626', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      {/* ── Lista ── */}
      <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: '#00113a', margin: 0 }}>Proyectos</h1>
            <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{projects.length} proyectos</p>
          </div>
          <button onClick={() => setShowNewModal(true)} style={{ background: '#00113a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            + Nuevo
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projects.map(p => {
            const cfg = STATUS_CFG[p.status] ?? STATUS_CFG['activo']
            const isActive = selected?.id === p.id
            return (
              <div key={p.id}
                style={{ background: isActive ? '#00113a' : '#fff', border: `0.5px solid ${isActive ? '#00113a' : '#e2e8f0'}`, borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s' }}
              >
                <div onClick={() => openProject(p)} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#fff' : '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    {p.leads && <div style={{ fontSize: 11, color: isActive ? 'rgba(255,255,255,0.5)' : '#94a3b8', marginTop: 2 }}>{p.leads.nombre}</div>}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, background: isActive ? 'rgba(255,255,255,0.15)' : cfg.bg, color: isActive ? '#fff' : cfg.color, padding: '2px 8px', borderRadius: 10, flexShrink: 0 }}>
                    {cfg.label.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <code style={{ fontSize: 9, fontFamily: 'monospace', color: isActive ? 'rgba(255,255,255,0.4)' : '#94a3b8', letterSpacing: '1px' }}>
                    {p.access_code}
                  </code>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, color: isActive ? 'rgba(255,255,255,0.4)' : '#94a3b8' }}>
                      {p.file_count} archivo{p.file_count !== 1 ? 's' : ''}
                    </span>
                    {/* Botón eliminar proyecto */}
                    <button
                      onClick={e => { e.stopPropagation(); deleteProject(p.id, p.name) }}
                      disabled={deletingProject}
                      title="Eliminar proyecto"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                        color: isActive ? 'rgba(255,80,80,0.7)' : '#fca5a5', fontSize: 13, lineHeight: 1,
                        borderRadius: 4, transition: 'color 0.15s',
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Detalle ── */}
      {selected ? (
        <div style={{ flex: 1, background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '0.5px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#00113a', margin: '0 0 4px' }}>{selected.name}</h2>
                {selected.leads && (
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    {selected.leads.nombre}{selected.leads.email ? ` · ${selected.leads.email}` : ''}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <select value={selected.status} onChange={e => updateStatus(selected.id, e.target.value)}
                  style={{ border: '0.5px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                  <option value="activo">En producción</option>
                  <option value="entregado">Entregado</option>
                  <option value="archivado">Archivado</option>
                </select>
                <a href={portalUrl(selected.access_code)} target="_blank" rel="noopener noreferrer"
                  style={{ background: '#eff6ff', color: '#2552ca', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', border: '0.5px solid #bfdbfe' }}>
                  Portal ↗
                </a>
                <button onClick={() => deleteProject(selected.id, selected.name)} disabled={deletingProject}
                  style={{ background: '#fef2f2', color: '#ef4444', border: '0.5px solid #fecaca', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {deletingProject ? '…' : '🗑 Eliminar'}
                </button>
              </div>
            </div>

            {/* Código + URL */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <code style={{ fontSize: 13, fontFamily: 'monospace', background: '#f1f5f9', color: '#2552ca', fontWeight: 700, padding: '4px 12px', borderRadius: 8, letterSpacing: '2px' }}>
                {selected.access_code}
              </code>
              <button onClick={() => { navigator.clipboard.writeText(selected.access_code); showMsg('Código copiado') }}
                style={{ fontSize: 11, color: '#64748b', background: 'none', border: '0.5px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                Copiar código
              </button>
              <button onClick={() => { navigator.clipboard.writeText(portalUrl(selected.access_code)); showMsg('Link copiado') }}
                style={{ fontSize: 11, color: '#2552ca', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>
                Copiar link
              </button>
              {selected.event_date && (
                <span style={{ fontSize: 12, color: '#64748b' }}>📅 {fmtDate(selected.event_date)}</span>
              )}
            </div>

            {/* Link completo visible */}
            <div style={{ background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
              <span style={{ fontSize: 11, color: '#94a3b8', marginRight: 8, fontWeight: 600 }}>LINK PORTAL CLIENTE</span>
              <code style={{ fontSize: 11, color: '#475569' }}>{portalUrl(selected.access_code)}</code>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
              {(['info', 'files'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  background: tab === t ? '#00113a' : '#f1f5f9',
                  color: tab === t ? '#fff' : '#64748b',
                }}>
                  {t === 'info' ? 'Información' : `Archivos (${files.length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Contenido */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {tab === 'info' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {selected.description && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 6 }}>Descripción</div>
                    <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.6 }}>{selected.description}</p>
                  </div>
                )}
                {selected.leads && (
                  <div style={{ background: '#f8fafc', borderRadius: 10, padding: '16px 18px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 10 }}>Lead vinculado</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{selected.leads.nombre}</div>
                    {selected.leads.folio && <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>{selected.leads.folio}</div>}
                    {selected.leads.servicio && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{selected.leads.servicio}</div>}
                  </div>
                )}
              </div>
            )}

            {tab === 'files' && (
              <div>
                {/* Error de subida */}
                {uploadError && (
                  <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#dc2626', fontWeight: 600 }}>
                    ⚠️ {uploadError}
                    {uploadError.includes('bucket') && (
                      <div style={{ marginTop: 4, fontSize: 11, color: '#ef4444', fontWeight: 400 }}>
                        Ve a Supabase → Storage → New bucket → nombre: <strong>projects</strong> → Public ✅
                      </div>
                    )}
                  </div>
                )}

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragging ? '#2552ca' : '#e2e8f0'}`, borderRadius: 12,
                    padding: '28px', textAlign: 'center', cursor: 'pointer', marginBottom: 20,
                    background: dragging ? '#eff6ff' : '#f8fafc', transition: 'all 0.15s',
                  }}
                >
                  {uploading ? (
                    <div style={{ fontSize: 13, color: '#2552ca', fontWeight: 600 }}>⏳ {uploadProgress}</div>
                  ) : (
                    <>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>Arrastra archivos aquí o haz clic</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Imágenes, PDFs, videos · múltiples archivos · máx 50MB c/u</div>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }}
                  onChange={e => uploadFiles(Array.from(e.target.files ?? []))} />

                {/* Galería */}
                {loadingFiles ? (
                  <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 13 }}>Cargando…</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
                    {files.map(f => (
                      <div key={f.id} style={{ position: 'relative', background: '#f8fafc', borderRadius: 8, overflow: 'hidden', border: '0.5px solid #e2e8f0' }}>
                        {isImage(f.file_url, f.file_type) ? (
                          <img src={f.file_url} alt={f.file_name ?? 'img'} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} loading="lazy" />
                        ) : (
                          <div style={{ width: '100%', aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
                            <span style={{ fontSize: 28 }}>{f.file_type === 'application/pdf' ? '📄' : '📎'}</span>
                          </div>
                        )}
                        <div style={{ padding: '6px 8px' }}>
                          <div style={{ fontSize: 10, color: '#475569', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file_name ?? 'Archivo'}</div>
                        </div>
                        <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 3 }}>
                          <a href={f.file_url} target="_blank" rel="noopener noreferrer"
                            style={{ width: 22, height: 22, background: 'rgba(0,0,0,0.55)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', textDecoration: 'none' }}>
                            ↗
                          </a>
                          <button onClick={() => deleteFile(f.id)}
                            style={{ width: 22, height: 22, background: 'rgba(220,38,38,0.8)', borderRadius: 4, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12 }}>
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                    {files.length === 0 && !loadingFiles && (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>
                        Aún no hay archivos en este proyecto
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#94a3b8' }}>
          <div style={{ fontSize: 40 }}>📁</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Selecciona un proyecto</div>
        </div>
      )}

      {/* Modal nuevo proyecto */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '32px', width: '100%', maxWidth: 440 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#00113a', margin: '0 0 20px' }}>Nuevo proyecto</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 6 }}>Nombre *</label>
                <input value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} placeholder="ej: Boda García — Fotografía" style={inp} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 6 }}>Descripción</label>
                <textarea value={newForm.description} onChange={e => setNewForm(p => ({ ...p, description: e.target.value }))} rows={3} style={{ ...inp, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 6 }}>Fecha del evento</label>
                <input type="date" value={newForm.event_date} onChange={e => setNewForm(p => ({ ...p, event_date: e.target.value }))} style={inp} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={createProject} disabled={saving || !newForm.name.trim()}
                style={{ flex: 1, background: '#00113a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'Creando…' : 'Crear proyecto'}
              </button>
              <button onClick={() => setShowNewModal(false)}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}