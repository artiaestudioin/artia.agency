import Link from 'next/link'

export default function ClientNotFound() {
  return (
    <div style={{ minHeight: '100vh', background: '#00113a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <img src="https://qnslgtbsilqhcyitskuv.supabase.co/storage/v1/object/public/emails-assets/ARTIA%20blanco.png" alt="ARTIA" height="32" style={{ height: 32, width: 'auto', marginBottom: 32 }} />
        <div style={{ fontSize: 48, fontWeight: 900, color: 'rgba(255,255,255,0.15)', marginBottom: 16 }}>404</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Código no encontrado</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 28px' }}>
          El código de acceso ingresado no existe o ha vencido.
        </p>
        <Link href="/client" style={{ background: '#2552ca', color: '#fff', padding: '12px 24px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          Intentar de nuevo
        </Link>
      </div>
    </div>
  )
}
