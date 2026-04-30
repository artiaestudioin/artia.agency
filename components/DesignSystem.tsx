// components/DesignSystem.tsx
// Sistema de diseño unificado para todo el CRM Artia

export const COLORS = {
  primary:   '#00113a',
  secondary: '#2552ca',
  accent:    '#667eea',
  success:   '#10b981',
  warning:   '#f59e0b',
  danger:    '#ef4444',
  info:      '#3b82f6',
  
  // Gradientes
  gradientPrimary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  gradientDark:    'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
  gradientSuccess: 'linear-gradient(135deg, #10b981, #059669)',
  gradientDanger:  'linear-gradient(135deg, #ef4444, #dc2626)',
  
  // Backgrounds
  bgMain:     '#f1f5f9',
  bgCard:     '#ffffff',
  bgHover:    '#f8fafc',
  bgDark:     '#00113a',
  
  // Text
  textPrimary:   '#0f172a',
  textSecondary: '#475569',
  textMuted:     '#94a3b8',
  textLight:     '#cbd5e1',
  
  // Borders
  borderLight: '#e2e8f0',
  borderHover: '#cbd5e1',
}

export const ESTADO_CONFIG: Record<string, { 
  bg: string; text: string; dot: string; label: string; border: string 
}> = {
  nuevo:      { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6', label: 'Nuevo',      border: '#bfdbfe' },
  contactado: { bg: '#fefce8', text: '#92400e', dot: '#f59e0b', label: 'Contactado', border: '#fde68a' },
  en_proceso: { bg: '#f0fdf4', text: '#166534', dot: '#22c55e', label: 'En proceso', border: '#bbf7d0' },
  cerrado:    { bg: '#dcfce7', text: '#14532d', dot: '#16a34a', label: 'Cerrado ✓',  border: '#bbf7d0' },
  perdido:    { bg: '#fef2f2', text: '#991b1b', dot: '#ef4444', label: 'Perdido',    border: '#fecaca' },
  pagado:     { bg: '#dcfce7', text: '#166534', dot: '#22c55e', label: 'Pagado',     border: '#bbf7d0' },
  pendiente:  { bg: '#fef3c7', text: '#92400e', dot: '#f59e0b', label: 'Pendiente',  border: '#fde68a' },
  vencido:    { bg: '#fee2e2', text: '#991b1b', dot: '#ef4444', label: 'Vencido',    border: '#fecaca' },
  activo:     { bg: '#dbeafe', text: '#1e40af', dot: '#3b82f6', label: 'Activo',     border: '#bfdbfe' },
  completado: { bg: '#dcfce7', text: '#166534', dot: '#22c55e', label: 'Completado', border: '#bbf7d0' },
}

export const SHADOWS = {
  sm: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
  md: '0 4px 20px rgba(0,0,0,0.06)',
  lg: '0 8px 40px rgba(0,0,0,0.08)',
  xl: '0 12px 60px rgba(0,0,0,0.12)',
  hover: '0 8px 24px rgba(0,0,0,0.09)',
}

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  '2xl': 20,
}

// ─── Helpers visuales ───────────────────────────────────────────

export function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

export function avatarColor(name: string): string {
  const palette = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6','#f97316','#06b6d4']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % palette.length
  return palette[hash]
}

export function fmtMoney(n: number | null | undefined): string {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n)
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  const [y, m, day] = d.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function relTime(d: string): string {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

// ─── Componentes base reutilizables ─────────────────────────────

export function Card({ children, className = '', style = {} }: { 
  children: React.ReactNode; className?: string; style?: React.CSSProperties 
}) {
  return (
    <div className={`artia-card ${className}`} style={{
      background: COLORS.bgCard,
      borderRadius: BORDER_RADIUS.lg,
      border: `1px solid ${COLORS.borderLight}`,
      boxShadow: SHADOWS.sm,
      transition: 'box-shadow 0.2s, transform 0.2s',
      ...style,
    }}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, action, accent = COLORS.gradientDark }: { 
  title: string; subtitle?: string; action?: React.ReactNode; accent?: string 
}) {
  return (
    <div style={{
      padding: '16px 20px 14px',
      background: accent,
      color: 'white',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    }}>
      <div>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 8 }}>
          {title}
        </h3>
        {subtitle && <p style={{ fontSize: '0.8rem', opacity: 0.8, margin: 0 }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function CardBody({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ padding: '20px 24px', ...style }}>{children}</div>
}

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  disabled = false,
  onClick,
  style = {},
}: {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  onClick?: () => void
  style?: React.CSSProperties
}) {
  const variants = {
    primary:   { bg: COLORS.primary, color: '#fff', border: 'none' },
    secondary: { bg: '#fff', color: COLORS.textSecondary, border: `1px solid ${COLORS.borderLight}` },
    success:   { bg: COLORS.gradientSuccess, color: '#fff', border: 'none' },
    danger:    { bg: COLORS.gradientDanger, color: '#fff', border: 'none' },
    ghost:     { bg: 'transparent', color: COLORS.textSecondary, border: 'none' },
  }
  
  const sizes = {
    sm: { padding: '6px 12px', fontSize: '0.75rem' },
    md: { padding: '9px 16px', fontSize: '0.8rem' },
    lg: { padding: '12px 24px', fontSize: '0.9rem' },
  }
  
  const v = variants[variant]
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="artia-btn"
      style={{
        background: v.bg,
        color: v.color,
        border: v.border,
        borderRadius: BORDER_RADIUS.md,
        padding: sizes[size].padding,
        fontSize: sizes[size].fontSize,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

export function Badge({ 
  children, 
  variant = 'default',
  size = 'sm'
}: { 
  children: React.ReactNode; 
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
}) {
  const variants = {
    default: { bg: COLORS.bgHover, color: COLORS.textSecondary, border: COLORS.borderLight },
    success: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
    warning: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
    danger:  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    info:    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  }
  
  const sizes = {
    sm: { padding: '2px 8px', fontSize: '0.65rem' },
    md: { padding: '4px 10px', fontSize: '0.75rem' },
  }
  
  const v = variants[variant]
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      background: v.bg,
      color: v.color,
      border: `1px solid ${v.border}`,
      borderRadius: 50,
      padding: sizes[size].padding,
      fontSize: sizes[size].fontSize,
      fontWeight: 800,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const config = ESTADO_CONFIG[status] || ESTADO_CONFIG.nuevo
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      background: config.bg,
      color: config.text,
      fontSize: '0.65rem',
      fontWeight: 800,
      padding: '3px 9px',
      borderRadius: 6,
      border: `1px solid ${config.border}`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: config.dot }} />
      {config.label}
    </span>
  )
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 28, md: 34, lg: 44 }
  const s = sizes[size]
  
  return (
    <div style={{
      width: s,
      height: s,
      borderRadius: size === 'lg' ? 12 : 9,
      background: avatarColor(name),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size === 'lg' ? 14 : 11,
      fontWeight: 800,
      color: '#fff',
      flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  )
}

export function ProgressBar({ 
  value, 
  max = 100, 
  color = COLORS.accent,
  height = 6,
  showLabel = true
}: { 
  value: number; 
  max?: number; 
  color?: string;
  height?: number;
  showLabel?: boolean
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  
  return (
    <div>
      <div style={{
        height,
        background: '#f1f5f9',
        borderRadius: height / 2,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: pct >= 100 ? COLORS.gradientSuccess : color,
          borderRadius: height / 2,
          transition: 'width 0.5s ease',
        }} />
      </div>
      {showLabel && (
        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: COLORS.textMuted, marginTop: 3, whiteSpace: 'nowrap' }}>
          {Math.round(pct)}% · {fmtMoney(value)}
        </div>
      )}
    </div>
  )
}

export function EmptyState({ icon = '📭', title = 'Sin registros', subtitle }: { 
  icon?: string; title?: string; subtitle?: string 
}) {
  return (
    <div style={{ textAlign: 'center', padding: '50px 20px', color: COLORS.textMuted }}>
      <div style={{ fontSize: '3rem', marginBottom: 12, opacity: 0.4 }}>{icon}</div>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: COLORS.textSecondary, marginBottom: 6 }}>
        {title}
      </h3>
      {subtitle && <p style={{ fontSize: '0.85rem', margin: 0 }}>{subtitle}</p>}
    </div>
  )
}

export function SearchInput({ 
  value, 
  onChange, 
  placeholder = 'Buscar...',
  onSubmit
}: { 
  value: string; 
  onChange: (v: string) => void; 
  placeholder?: string;
  onSubmit?: () => void;
}) {
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSubmit?.()}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 14px 10px 38px',
          border: `1px solid ${COLORS.borderLight}`,
          borderRadius: BORDER_RADIUS.md,
          fontSize: 13,
          outline: 'none',
          background: COLORS.bgCard,
          transition: 'all 0.2s',
          boxSizing: 'border-box',
        }}
      />
      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, opacity: 0.5 }}>
        🔍
      </span>
    </div>
  )
}

export function FilterTabs({ 
  options, 
  active, 
  onChange 
}: { 
  options: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map(opt => {
        const isActive = active === opt.key
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              border: `2px solid ${isActive ? COLORS.primary : COLORS.borderLight}`,
              background: isActive ? COLORS.primary : COLORS.bgCard,
              color: isActive ? '#fff' : COLORS.textSecondary,
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span style={{
                background: isActive ? 'rgba(255,255,255,0.25)' : COLORS.bgHover,
                color: isActive ? '#fff' : COLORS.textMuted,
                borderRadius: 10,
                padding: '0 6px',
                fontSize: 10,
                fontWeight: 800,
              }}>
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Estilos globales CSS ───────────────────────────────────────

export const GLOBAL_STYLES = `
  .artia-card {
    transition: box-shadow 0.2s, transform 0.2s;
  }
  .artia-card:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.09);
  }
  .artia-btn {
    transition: all 0.15s;
  }
  .artia-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .artia-table-row {
    transition: background 0.12s;
  }
  .artia-table-row:hover {
    background: #fafbff !important;
  }
  .artia-fade-in {
    animation: artiaFadeIn 0.4s ease-out;
  }
  @keyframes artiaFadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .artia-slide-in {
    animation: artiaSlideIn 0.3s ease-out;
  }
  @keyframes artiaSlideIn {
    from { opacity: 0; transform: translateX(-20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  /* Responsive utilities */
  @media (max-width: 1024px) {
    .artia-grid-2 { grid-template-columns: 1fr !important; }
    .artia-grid-3 { grid-template-columns: repeat(2, 1fr) !important; }
    .artia-sidebar { order: -1; }
  }
  @media (max-width: 768px) {
    .artia-grid-3 { grid-template-columns: 1fr !important; }
    .artia-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
    .artia-grid-6 { grid-template-columns: repeat(2, 1fr) !important; }
    .artia-hide-mobile { display: none !important; }
  }
  @media (min-width: 769px) {
    .artia-hide-desktop { display: none !important; }
  }
`