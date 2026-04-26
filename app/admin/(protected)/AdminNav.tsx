'use client'

import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/admin',          label: 'Dashboard' },
  { href: '/admin/leads',    label: 'Leads' },
  { href: '/admin/pipeline', label: 'Pipeline' },
  { href: '/admin/cliente',  label: 'Clientes' },
  null, // divider
  { href: '/admin/proyectos', label: 'Proyectos' },
  { href: '/admin/imagenes',  label: 'Media' },
  null, // divider
  { href: '/admin/emails',   label: 'Emails' },
  null, // divider
  { href: '/admin/finanzas', label: 'Finanzas' },
  { href: '/admin/ia',       label: 'IA' },
]

export default function AdminNav({ email }: { email: string }) {
  const pathname = usePathname()

  return (
    <nav style={{
      background: '#00113a',
      padding: '0 20px',
      height: 52,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <a href="/admin" style={{
          color: '#fff', fontWeight: 900, fontSize: 13,
          letterSpacing: '-0.3px', marginRight: 14,
          textDecoration: 'none', flexShrink: 0,
        }}>
          ARTIA <span style={{ color: '#6b8cff', fontWeight: 400 }}>CRM</span>
        </a>

        {NAV_LINKS.map((link, i) => {
          if (link === null) {
            return (
              <div key={`div-${i}`} style={{
                width: 1, height: 16,
                background: 'rgba(255,255,255,0.1)',
                margin: '0 6px',
                flexShrink: 0,
              }} />
            )
          }

          // Activo exacto para dashboard, prefijo para el resto
          const isActive = link.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(link.href)

          return (
            <a
              key={link.href}
              href={link.href}
              style={{
                color: isActive ? '#fff' : 'rgba(179,197,255,0.75)',
                fontSize: 12,
                textDecoration: 'none',
                fontWeight: isActive ? 700 : 500,
                padding: '4px 9px',
                borderRadius: 6,
                whiteSpace: 'nowrap',
                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
              }}
            >
              {link.label}
            </a>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <a
          href="/client"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11,
            color: 'rgba(179,197,255,0.5)',
            textDecoration: 'none',
            padding: '4px 10px',
            border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
          }}
        >
          Portal cliente ↗
        </a>
        <span style={{ color: 'rgba(179,197,255,0.4)', fontSize: 11 }}>
          {email}
        </span>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.65)',
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            Salir
          </button>
        </form>
      </div>
    </nav>
  )
}
