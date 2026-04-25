'use client'

import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'assistant'; content: string; data?: any[] }

const QUICK_QUERIES = [
  'Clientes que no han pagado',
  'Leads cerrados este mes',
  'Leads en proceso con mayor valor',
  'Proyectos activos',
  'Leads perdidos este año',
  'Cuánto hemos facturado en total',
]

export default function IACRMPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de CRM. Puedo consultar tu base de datos en lenguaje natural. Prueba con: "clientes que no han pagado" o "cuántos leads tenemos este mes".',
    },
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef             = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendQuery(query: string) {
    if (!query.trim() || loading) return
    const userMsg: Message = { role: 'user', content: query }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/ia-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer ?? 'No pude procesar esa consulta.',
        data: data.rows,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error de conexión. Intenta de nuevo.',
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendQuery(input)
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#00113a', margin: 0 }}>IA — Consulta tu CRM</h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
          Escribe en lenguaje natural. La IA consulta tu base de datos real y devuelve insights accionables.
        </p>
      </div>

      {/* Quick queries */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {QUICK_QUERIES.map(q => (
          <button key={q} onClick={() => sendQuery(q)} disabled={loading} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: '#f1f5f9', color: '#475569', border: '0.5px solid #e2e8f0',
            cursor: loading ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
            transition: 'all 0.15s',
          }}
            onMouseOver={e => { if (!loading) { (e.currentTarget as HTMLElement).style.background = '#00113a'; (e.currentTarget as HTMLElement).style.color = '#fff' } }}
            onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; (e.currentTarget as HTMLElement).style.color = '#475569' }}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div style={{
        background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 16, overflow: 'hidden',
        display: 'flex', flexDirection: 'column', height: 'calc(100vh - 300px)',
      }}>
        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
              <div style={{
                maxWidth: '80%', padding: '12px 16px', borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '2px 12px 12px 12px',
                background: m.role === 'user' ? '#00113a' : '#f8fafc',
                color: m.role === 'user' ? '#fff' : '#0f172a',
                border: m.role === 'assistant' ? '0.5px solid #e2e8f0' : 'none',
                fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>

              {/* Tabla de datos si existen */}
              {m.data && m.data.length > 0 && (
                <div style={{ maxWidth: '95%', overflowX: 'auto', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 10, width: '100%' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {Object.keys(m.data[0]).map(col => (
                          <th key={col} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#94a3b8', borderBottom: '0.5px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {m.data.slice(0, 20).map((row, ri) => (
                        <tr key={ri} style={{ borderBottom: '0.5px solid #f1f5f9' }}>
                          {Object.values(row).map((val, vi) => (
                            <td key={vi} style={{ padding: '8px 12px', color: '#475569', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {val === null || val === undefined ? '—' : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {m.data.length > 20 && (
                    <div style={{ padding: '8px 12px', fontSize: 11, color: '#94a3b8' }}>Mostrando 20 de {m.data.length} resultados</div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ padding: '12px 16px', background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: '2px 12px 12px 12px', fontSize: 13, color: '#94a3b8' }}>
                Consultando base de datos…
                <span style={{ display: 'inline-block', animation: 'blink 1s infinite' }}>▊</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: '0.5px solid #e2e8f0', padding: '14px 20px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu consulta… (Enter para enviar)"
            rows={1}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 14px', border: '0.5px solid #e2e8f0', borderRadius: 10,
              fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
              background: loading ? '#f8fafc' : '#fff',
            }}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 120) + 'px'
            }}
          />
          <button onClick={() => sendQuery(input)} disabled={loading || !input.trim()} style={{
            background: loading || !input.trim() ? '#f1f5f9' : '#00113a',
            color: loading || !input.trim() ? '#94a3b8' : '#fff',
            border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 12, fontWeight: 700,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', flexShrink: 0,
            transition: 'all 0.15s',
          }}>
            {loading ? '⏳' : 'Enviar →'}
          </button>
        </div>
      </div>

      <style>{`@keyframes blink { 0%,100% { opacity: 1 } 50% { opacity: 0 } }`}</style>
    </div>
  )
}
