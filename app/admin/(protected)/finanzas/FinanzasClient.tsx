'use client'

import { useState, useRef, useEffect } from 'react'

type Payment = {
  id: string; lead_id: string; amount: number; status: string; method: string
  description: string | null; fecha: string; comprobante_url?: string | null
  payment_month?: string | null; due_date?: string | null; payment_number?: number | null
  lead: { nombre: string; folio: string | null; servicio: string | null; estimated_value: number | null; contract_value?: number | null } | null
}
type Lead = {
  id: string; nombre: string; folio: string | null; servicio: string | null
  estimated_value: number | null; contract_value?: number | null; payment_status: string | null
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const METHOD_LABELS: Record<string,string> = { transferencia:'Transferencia', efectivo:'Efectivo', tarjeta:'Tarjeta', cheque:'Cheque', otro:'Otro' }

function fmtMoney(n: number|null|undefined) {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(n)
}
function fmtDate(d: string|null|undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'})
}

export default function FinanzasClient({ payments: initPayments, leads }: { payments: Payment[]; leads: Lead[] }) {
  const [payments, setPayments] = useState(initPayments)
  const [showForm, setShowForm] = useState(false)
  const [editPay, setEditPay]   = useState<Payment|null>(null)
  const [filter, setFilter]     = useState('todos')
  const [saving, setSaving]     = useState(false)
  const [uploadingComp, setUploadingComp] = useState(false)
  const [toast, setToast]       = useState<string|null>(null)
  const compInputRef = useRef<HTMLInputElement>(null)

  // Hydration fix: all Date-dependent values live here, set after mount
  const [mounted, setMounted] = useState(false)
  const [hoy, setHoy] = useState({ fecha: '', mes: '', mesKey: '0000-00', anio: 0 })

  useEffect(() => {
    const d   = new Date()
    const mes = MESES[d.getMonth()] + ' ' + d.getFullYear()
    const mk  = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
    setHoy({ fecha: d.toISOString().slice(0, 10), mes, mesKey: mk, anio: d.getFullYear() })
    setMounted(true)
  }, [])

  const [form, setForm] = useState({
    lead_id:'', amount:'', method:'transferencia', description:'',
    fecha: '', status:'pagado',
    comprobante_url:'', payment_month: '',
    due_date:'', payment_number:'',
  })

  // Once mounted, fill in the date fields if form is empty
  useEffect(() => {
    if (mounted) {
      setForm(f => ({
        ...f,
        fecha: f.fecha || hoy.fecha,
        payment_month: f.payment_month || hoy.mes,
      }))
    }
  }, [mounted]) // eslint-disable-line

  function showMsg(msg: string) { setToast(msg); setTimeout(()=>setToast(null),3000) }

  const ingresoTotal   = payments.filter(p=>p.status==='pagado').reduce((s,p)=>s+p.amount,0)
  const ingresoMes     = mounted
    ? payments.filter(p=>p.status==='pagado'&&p.fecha.startsWith(hoy.mesKey)).reduce((s,p)=>s+p.amount,0)
    : 0
  const pendienteTotal = payments.filter(p=>p.status==='pendiente').reduce((s,p)=>s+p.amount,0)

  // Monthly chart — computed only client-side
  const meses: Record<string,number> = {}
  if (mounted) {
    const base = new Date(hoy.anio, new Date().getMonth(), 1)
    for (let i = 5; i >= 0; i--) {
      const dd = new Date(base.getFullYear(), base.getMonth() - i, 1)
      meses[dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')] = 0
    }
    payments.filter(p=>p.status==='pagado').forEach(p=>{
      const k = p.fecha.slice(0,7); if(k in meses) meses[k] += p.amount
    })
  }
  const maxMes = Math.max(...Object.values(meses), 1)

  const byLead: Record<string,{ nombre:string; folio:string|null; pagado:number; pendiente:number; contractValue:number|null; payments:Payment[] }> = {}
  payments.forEach(p=>{
    if (!byLead[p.lead_id]) byLead[p.lead_id] = {
      nombre: p.lead?.nombre??'—', folio: p.lead?.folio??null,
      pagado:0, pendiente:0,
      contractValue: p.lead?.contract_value??p.lead?.estimated_value??null,
      payments:[],
    }
    if (p.status==='pagado')    byLead[p.lead_id].pagado    += p.amount
    if (p.status==='pendiente') byLead[p.lead_id].pendiente += p.amount
    byLead[p.lead_id].payments.push(p)
  })

  const filtered = filter==='todos' ? payments : payments.filter(p=>p.status===filter)

  async function uploadComprobante(file: File) {
    setUploadingComp(true)
    try {
      const fd = new FormData(); fd.append('file',file)
      const res = await fetch('/api/upload',{method:'POST',body:fd})
      const data = await res.json()
      if (res.ok && data.url) { setForm(p=>({...p,comprobante_url:data.url})); showMsg('Comprobante adjuntado ✓') }
      else showMsg('Error subiendo comprobante')
    } finally { setUploadingComp(false) }
  }

  function openEdit(p: Payment) {
    setEditPay(p)
    setForm({
      lead_id:p.lead_id, amount:String(p.amount), method:p.method,
      description:p.description??'', fecha:p.fecha.slice(0,10), status:p.status,
      comprobante_url:p.comprobante_url??'', payment_month:p.payment_month??hoy.mes,
      due_date:p.due_date?.slice(0,10)??'', payment_number:String(p.payment_number??''),
    })
    setShowForm(true)
  }
  function openNew() {
    setEditPay(null)
    setForm({ lead_id:'', amount:'', method:'transferencia', description:'', fecha:hoy.fecha, status:'pagado', comprobante_url:'', payment_month:hoy.mes, due_date:'', payment_number:'' })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.lead_id || !form.amount) return
    setSaving(true)
    try {
      const body = {
        ...form,
        amount: parseFloat(form.amount),
        payment_number: form.payment_number ? parseInt(form.payment_number) : null,
        due_date: form.due_date || null,
      }
      if (editPay) {
        const res  = await fetch(`/api/admin/payments/${editPay.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
        const data = await res.json()
        if (res.ok) { setPayments(prev=>prev.map(p=>p.id===editPay.id?{...p,...body,amount:parseFloat(form.amount)}:p)); showMsg('Actualizado ✓') }
        else showMsg(data.error??'Error')
      } else {
        const res  = await fetch('/api/admin/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
        const data = await res.json()
        if (res.ok && data.payment) {
          const lead = leads.find(l=>l.id===form.lead_id)
          setPayments(prev=>[{...data.payment,lead:lead?{nombre:lead.nombre,folio:lead.folio,servicio:lead.servicio,estimated_value:lead.estimated_value,contract_value:lead.contract_value}:null},...prev])
          showMsg('Registrado ✓')
        } else showMsg(data.error??'Error')
      }
      setShowForm(false); setEditPay(null)
      setForm({ lead_id:'', amount:'', method:'transferencia', description:'', fecha:hoy.fecha, status:'pagado', comprobante_url:'', payment_month:hoy.mes, due_date:'', payment_number:'' })
    } finally { setSaving(false) }
  }

  async function deletePay(id: string) {
    if (!confirm('¿Eliminar este pago?')) return
    const res = await fetch(`/api/admin/payments/${id}`,{method:'DELETE'})
    if (res.ok) { setPayments(prev=>prev.filter(p=>p.id!==id)); showMsg('Eliminado') }
  }

  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', border:'0.5px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box', background:'#fff' }
  const lbl: React.CSSProperties = { fontSize:10, fontWeight:700, letterSpacing:'1.2px', textTransform:'uppercase' as const, color:'#94a3b8', display:'block', marginBottom:5 }

  return (
    <div style={{maxWidth:1200}}>
      {toast && <div style={{position:'fixed',top:24,right:24,zIndex:9999,background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#15803d',padding:'12px 20px',borderRadius:10,fontSize:13,fontWeight:600,boxShadow:'0 8px 24px rgba(0,0,0,0.12)'}}>✓ {toast}</div>}

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28,flexWrap:'wrap',gap:12}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:800,color:'#00113a',margin:0}}>Finanzas</h1>
          <p style={{fontSize:13,color:'#64748b',margin:'3px 0 0'}}>Contratos, pagos múltiples e ingresos</p>
        </div>
        <button onClick={openNew} style={{background:'#00113a',color:'#fff',border:'none',borderRadius:9,padding:'10px 20px',fontSize:12,fontWeight:700,cursor:'pointer'}}>+ Registrar pago</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
        <div style={{background:'#00113a',borderRadius:14,padding:'22px 24px',color:'#fff'}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'rgba(255,255,255,0.5)',marginBottom:8}}>Ingresos totales</div>
          <div style={{fontSize:28,fontWeight:900,letterSpacing:'-1px'}}>{fmtMoney(ingresoTotal)}</div>
        </div>
        <div style={{background:'#fff',border:'0.5px solid #e2e8f0',borderRadius:14,padding:'22px 24px'}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'#94a3b8',marginBottom:8}}>Este mes</div>
          <div style={{fontSize:28,fontWeight:900,color:'#10b981',letterSpacing:'-1px'}}>{mounted ? fmtMoney(ingresoMes) : '—'}</div>
        </div>
        <div style={{background:pendienteTotal>0?'#fef9ec':'#fff',border:`0.5px solid ${pendienteTotal>0?'#fcd34d':'#e2e8f0'}`,borderRadius:14,padding:'22px 24px'}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:'1.5px',textTransform:'uppercase',color:'#94a3b8',marginBottom:8}}>Por cobrar</div>
          <div style={{fontSize:28,fontWeight:900,color:pendienteTotal>0?'#d97706':'#10b981',letterSpacing:'-1px'}}>{fmtMoney(pendienteTotal)}</div>
        </div>
      </div>

      <div style={{background:'#fff',border:'0.5px solid #e2e8f0',borderRadius:14,padding:24,marginBottom:20}}>
        <div style={{fontWeight:800,fontSize:14,color:'#00113a',marginBottom:20}}>Flujo mensual</div>
        {mounted ? (
          <div style={{display:'flex',alignItems:'flex-end',gap:10,height:90}}>
            {Object.entries(meses).map(([mes,val])=>{
              const pct=(val/maxMes)*100
              const label=new Date(mes+'-02').toLocaleDateString('es-EC',{month:'short'})
              return (
                <div key={mes} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,height:'100%'}}>
                  {val>0 && <div style={{fontSize:9,color:'#64748b',fontWeight:700}}>${Math.round(val)}</div>}
                  <div style={{flex:1,width:'100%',display:'flex',alignItems:'flex-end'}}>
                    <div style={{width:'100%',background:val>0?'#2552ca':'#e2e8f0',borderRadius:'4px 4px 0 0',height:`${Math.max(pct,3)}%`}} />
                  </div>
                  <div style={{fontSize:9,color:'#94a3b8',fontWeight:700,textTransform:'uppercase'}}>{label}</div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{height:90,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontSize:12,color:'#94a3b8'}}>Cargando…</span>
          </div>
        )}
      </div>

      {Object.keys(byLead).length>0 && (
        <div style={{background:'#fff',border:'0.5px solid #e2e8f0',borderRadius:14,padding:24,marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:14,color:'#00113a',marginBottom:16}}>Resumen por cliente — progreso de contrato</div>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {Object.entries(byLead).map(([lid,info])=>{
              const cv=info.contractValue
              const pct=cv&&cv>0?Math.min((info.pagado/cv)*100,100):0
              return (
                <div key={lid}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:5,flexWrap:'wrap',gap:4}}>
                    <span style={{fontSize:13,fontWeight:700,color:'#0f172a'}}>{info.nombre} {info.folio&&<span style={{fontSize:10,fontFamily:'monospace',color:'#94a3b8'}}>({info.folio})</span>}</span>
                    <div style={{display:'flex',gap:12,fontSize:12,flexWrap:'wrap'}}>
                      <span style={{color:'#10b981',fontWeight:700}}>Cobrado: {fmtMoney(info.pagado)}</span>
                      {cv&&<span style={{color:'#64748b'}}>/ {fmtMoney(cv)} acordado</span>}
                      {cv&&info.pagado<cv&&<span style={{color:'#d97706',fontWeight:700}}>Falta: {fmtMoney(cv-info.pagado)}</span>}
                    </div>
                  </div>
                  {cv&&cv>0&&(
                    <div style={{height:8,background:'#f1f5f9',borderRadius:4,overflow:'hidden',marginBottom:6}}>
                      <div style={{height:'100%',width:`${pct}%`,background:pct>=100?'#10b981':'#2552ca',borderRadius:4}} />
                    </div>
                  )}
                  <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                    {info.payments.sort((a,b)=>(a.payment_number??99)-(b.payment_number??99)).map(p=>(
                      <span key={p.id} onClick={()=>openEdit(p)} title="Clic para editar"
                        style={{fontSize:10,padding:'3px 9px',borderRadius:10,background:p.status==='pagado'?'#f0fdf4':'#fef9ec',color:p.status==='pagado'?'#10b981':'#d97706',fontWeight:700,border:`0.5px solid ${p.status==='pagado'?'#bbf7d0':'#fde68a'}`,cursor:'pointer'}}>
                        {p.payment_month||('Pago '+(p.payment_number??''))} · {fmtMoney(p.amount)}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showForm && (
        <div style={{background:'#fff',border:'0.5px solid #e2e8f0',borderRadius:14,padding:28,marginBottom:20}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:800,color:'#00113a',margin:0}}>{editPay?'Editar pago':'Registrar pago'}</h3>
            <button onClick={()=>{setShowForm(false);setEditPay(null)}} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#94a3b8'}}>×</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
              <div>
                <label style={lbl}>Cliente *</label>
                <select value={form.lead_id} onChange={e=>setForm(p=>({...p,lead_id:e.target.value}))} style={inp} required>
                  <option value="">Seleccionar…</option>
                  {leads.map(l=><option key={l.id} value={l.id}>{l.nombre}{l.folio?` (${l.folio})`:''}{l.contract_value?` — $${l.contract_value} acordado`:''}</option>)}
                </select>
                {form.lead_id&&(()=>{
                  const lead=leads.find(l=>l.id===form.lead_id)
                  const cv=lead?.contract_value??lead?.estimated_value
                  if(!cv) return null
                  const paid=payments.filter(p=>p.lead_id===form.lead_id&&p.status==='pagado').reduce((s,p)=>s+p.amount,0)
                  return <div style={{marginTop:6,fontSize:11,color:'#64748b',background:'#f8fafc',padding:'6px 10px',borderRadius:6}}>Acordado: <strong>{fmtMoney(cv)}</strong> · Cobrado: <strong style={{color:'#10b981'}}>{fmtMoney(paid)}</strong> · Pendiente: <strong style={{color:'#d97706'}}>{fmtMoney(Math.max(cv-paid,0))}</strong></div>
                })()}
              </div>
              <div>
                <label style={lbl}>Monto del pago (USD) *</label>
                <input type="number" step="0.01" min="0" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} style={inp} required placeholder="0.00" />
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
              <div>
                <label style={lbl}>Mes del pago</label>
                <input type="text" value={form.payment_month} onChange={e=>setForm(p=>({...p,payment_month:e.target.value}))} style={inp} placeholder={hoy.mes||'Ej: Abril 2026'} />
                <div style={{display:'flex',gap:3,marginTop:5,flexWrap:'wrap'}}>
                  {MESES.map(m=><button key={m} type="button" onClick={()=>setForm(p=>({...p,payment_month:`${m} ${hoy.anio||new Date().getFullYear()}`}))} style={{fontSize:9,padding:'2px 6px',borderRadius:8,border:'0.5px solid #e2e8f0',background:form.payment_month?.startsWith(m)?'#00113a':'#f8fafc',color:form.payment_month?.startsWith(m)?'#fff':'#64748b',cursor:'pointer'}}>{m.slice(0,3)}</button>)}
                </div>
              </div>
              <div>
                <label style={lbl}>Nº de cuota / pago</label>
                <input type="number" min="1" value={form.payment_number} onChange={e=>setForm(p=>({...p,payment_number:e.target.value}))} style={inp} placeholder="1=Anticipo, 2, 3…" />
              </div>
              <div>
                <label style={lbl}>Fecha límite (cuándo debe pagar)</label>
                <input type="date" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))} style={inp} />
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:14}}>
              <div>
                <label style={lbl}>Método</label>
                <select value={form.method} onChange={e=>setForm(p=>({...p,method:e.target.value}))} style={inp}>
                  {Object.entries(METHOD_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Estado</label>
                <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={inp}>
                  <option value="pagado">✓ Pagado</option>
                  <option value="pendiente">⏳ Pendiente</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Fecha en que pagó</label>
                <input type="date" value={form.fecha} onChange={e=>setForm(p=>({...p,fecha:e.target.value}))} style={inp} />
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={lbl}>Descripción / Notas del pago</label>
              <input type="text" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="ej: Anticipo 50% · se abonaron $275 de $550" style={inp} />
            </div>
            <div style={{marginBottom:18}}>
              <label style={lbl}>Comprobante (imagen de transferencia, recibo)</label>
              {form.comprobante_url?(
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <a href={form.comprobante_url} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'#2552ca',textDecoration:'none',fontWeight:600}}>Ver comprobante ↗</a>
                  <button type="button" onClick={()=>setForm(p=>({...p,comprobante_url:''}))} style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:13}}>× Quitar</button>
                </div>
              ):(
                <div onClick={()=>compInputRef.current?.click()} style={{border:'1.5px dashed #e2e8f0',borderRadius:8,padding:'12px',textAlign:'center',cursor:'pointer',background:'#f8fafc',fontSize:12,color:'#64748b'}}>
                  {uploadingComp?'Subiendo…':'📎 Adjuntar comprobante de pago'}
                </div>
              )}
              <input ref={compInputRef} type="file" accept="image/*,application/pdf" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadComprobante(f)}} />
            </div>
            <div style={{display:'flex',gap:10}}>
              <button type="submit" disabled={saving} style={{background:'#00113a',color:'#fff',border:'none',borderRadius:8,padding:'10px 24px',fontSize:12,fontWeight:700,cursor:'pointer'}}>{saving?'Guardando…':editPay?'Actualizar pago':'Registrar pago'}</button>
              <button type="button" onClick={()=>{setShowForm(false);setEditPay(null)}} style={{background:'#f1f5f9',color:'#475569',border:'none',borderRadius:8,padding:'10px 18px',fontSize:12,fontWeight:700,cursor:'pointer'}}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div style={{background:'#fff',border:'0.5px solid #e2e8f0',borderRadius:14,overflow:'hidden'}}>
        <div style={{padding:'16px 20px',borderBottom:'0.5px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
          <span style={{fontWeight:800,fontSize:14,color:'#00113a'}}>Historial de pagos</span>
          <div style={{display:'flex',gap:6}}>
            {['todos','pagado','pendiente'].map(s=>(
              <button key={s} onClick={()=>setFilter(s)} style={{padding:'5px 14px',borderRadius:20,fontSize:11,fontWeight:700,border:'0.5px solid #e2e8f0',cursor:'pointer',background:filter===s?'#00113a':'#fff',color:filter===s?'#fff':'#64748b'}}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
            ))}
          </div>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{background:'#f8fafc'}}>
                {['#','Cliente','Mes','Monto','Estado','Método','Fecha pago','Fecha límite','Notas','Comprobante',''].map(h=>(
                  <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:10,fontWeight:700,letterSpacing:'1px',textTransform:'uppercase',color:'#94a3b8',borderBottom:'0.5px solid #e2e8f0',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p=>{
                // Date comparison only in client to avoid hydration mismatch
                const vencido = mounted && p.due_date && new Date(p.due_date) < new Date() && p.status!=='pagado'
                return (
                  <tr key={p.id} style={{borderBottom:'0.5px solid #f1f5f9'}}>
                    <td style={{padding:'10px 12px',fontSize:11,color:'#94a3b8',fontWeight:700}}>{p.payment_number?`#${p.payment_number}`:'—'}</td>
                    <td style={{padding:'10px 12px'}}>
                      <div style={{fontSize:13,fontWeight:700,color:'#0f172a',whiteSpace:'nowrap'}}>{p.lead?.nombre??'—'}</div>
                      {p.lead?.folio&&<div style={{fontSize:10,color:'#94a3b8',fontFamily:'monospace'}}>{p.lead.folio}</div>}
                    </td>
                    <td style={{padding:'10px 12px',fontSize:12,color:'#475569',whiteSpace:'nowrap'}}>{p.payment_month??'—'}</td>
                    <td style={{padding:'10px 12px',fontSize:14,fontWeight:800,color:p.status==='pagado'?'#10b981':'#d97706',whiteSpace:'nowrap'}}>{fmtMoney(p.amount)}</td>
                    <td style={{padding:'10px 12px'}}>
                      <span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20,background:p.status==='pagado'?'#f0fdf4':'#fef9ec',color:p.status==='pagado'?'#10b981':'#d97706'}}>{p.status==='pagado'?'✓ PAGADO':'⏳ PENDIENTE'}</span>
                    </td>
                    <td style={{padding:'10px 12px',fontSize:12,color:'#475569'}}>{METHOD_LABELS[p.method]??p.method}</td>
                    <td style={{padding:'10px 12px',fontSize:12,color:'#64748b',whiteSpace:'nowrap'}}>{fmtDate(p.fecha)}</td>
                    <td style={{padding:'10px 12px',fontSize:12,whiteSpace:'nowrap',color:vencido?'#ef4444':'#64748b',fontWeight:vencido?700:400}}>
                      {p.due_date?fmtDate(p.due_date):'—'}{vencido&&<span style={{fontSize:9,marginLeft:4}}>⚠️ VENCIDO</span>}
                    </td>
                    <td style={{padding:'10px 12px',fontSize:12,color:'#475569',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.description??'—'}</td>
                    <td style={{padding:'10px 12px'}}>{p.comprobante_url?<a href={p.comprobante_url} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:'#2552ca',textDecoration:'none',fontWeight:600}}>Ver ↗</a>:<span style={{fontSize:11,color:'#cbd5e1'}}>—</span>}</td>
                    <td style={{padding:'10px 12px'}}>
                      <div style={{display:'flex',gap:5}}>
                        <button onClick={()=>openEdit(p)} style={{fontSize:11,color:'#2552ca',background:'#eff6ff',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontWeight:700}}>Editar</button>
                        <button onClick={()=>deletePay(p.id)} style={{fontSize:11,color:'#ef4444',background:'#fef2f2',border:'none',borderRadius:6,padding:'4px 8px',cursor:'pointer',fontWeight:700}}>×</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length===0&&<tr><td colSpan={11} style={{padding:'32px',textAlign:'center',color:'#94a3b8',fontSize:13}}>No hay pagos registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
