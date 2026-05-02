// ============================================
// types/landing.ts
// Tipos completos para el Landing Builder + CRM
// ============================================

export type LandingStatus = 'draft' | 'active' | 'paused' | 'archived'
export type OrderStatus = 'pending' | 'confirmed' | 'in_production' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded'
export type EventType = 
  | 'page_view' | 'scroll_25' | 'scroll_50' | 'scroll_75' | 'scroll_90'
  | 'click_cta' | 'click_whatsapp' | 'initiate_checkout' | 'purchase'
  | 'form_start' | 'form_submit' | 'file_upload' | 'time_on_page'
  | 'exit_intent' | 'variant_view'
export type ConversionGoal = 'purchase' | 'lead' | 'signup' | 'call' | 'custom'

export interface LandingConfig {
  headline: string
  subheadline: string
  cta_text: string
  cta_subtext: string
  product_name: string
  product_subtitle: string
  price: number
  old_price: number
  discount: string
  currency: string
  image: string
  gallery: string[]
  features: LandingFeature[]
  testimonials: LandingTestimonial[]
  whatsapp: string
  pixel_id: string
  capi_token: string
  posthog_key: string
  stock_total: number
  stock_current: number
  viewers_min: number
  viewers_max: number
  countdown_hours: number
  color_primary: string
  color_secondary: string
  gradient_hero: string
  gradient_cta: string
  meta_title: string
  meta_description: string
  meta_image: string
  form_fields: string[]
  show_stock_bar: boolean
  show_countdown: boolean
  show_testimonials: boolean
  show_features: boolean
  show_gallery: boolean
  sticky_cta: boolean
  payment_method: 'whatsapp' | 'redirect' | 'form'
  redirect_url: string | null
  custom_css: string
  custom_js: string
}

export interface LandingFeature {
  icon: string
  title: string
  desc: string
}

export interface LandingTestimonial {
  name: string
  location: string
  text: string
  rating: number
  image: string
}

export interface Landing {
  id: string
  slug: string
  name: string
  description: string | null
  config: LandingConfig
  html_content: string | null
  status: LandingStatus
  start_date: string | null
  end_date: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  conversion_goal: ConversionGoal
  views_count: number
  clicks_count: number
  conversions_count: number
  revenue_total: number
  is_variant: boolean
  parent_id: string | null
  variant_name: string | null
  traffic_split: number
  created_at: string
  updated_at: string
  created_by: string | null
}

export interface LandingVariant {
  id: string
  landing_id: string
  variant_id: string
  traffic_split: number
  winner_criteria: string
  created_at: string
}

export interface LandingEvent {
  id: string
  landing_id: string
  session_id: string | null
  event_type: EventType
  event_data: Record<string, unknown>
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  ip_hash: string | null
  user_agent: string | null
  referrer: string | null
  fbp: string | null
  fbc: string | null
  created_at: string
}

export interface LandingOrder {
  id: string
  landing_id: string | null
  variant_id: string | null
  folio: string
  name: string
  email: string | null
  phone: string
  address: string | null
  city: string | null
  country: string
  product_name: string | null
  product_id: string | null
  quantity: number
  price: number | null
  total: number | null
  currency: string
  design_description: string | null
  design_files: string[]
  status: OrderStatus
  timeline: OrderTimeline[]
  payment_status: PaymentStatus
  payment_method: string | null
  tracking_number: string | null
  tracking_url: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  meta_event_id: string | null
  email_sent: boolean
  whatsapp_sent: boolean
  created_at: string
  updated_at: string
}

export interface OrderTimeline {
  status: OrderStatus
  date: string
  note: string | null
  updated_by: string | null
}

export interface UtmLink {
  id: string
  landing_id: string
  name: string
  utm_source: string
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  full_url: string
  clicks: number
  conversions: number
  revenue: number
  created_at: string
}

export interface LandingStats {
  id: string
  slug: string
  name: string
  status: LandingStatus
  views_count: number
  clicks_count: number
  conversions_count: number
  revenue_total: number
  conversion_rate: number
  ctr: number
  total_orders: number
  pending_orders: number
  paid_orders: number
  created_at: string
}

export interface CreateLandingInput {
  slug: string
  name: string
  description?: string
  config: Partial<LandingConfig>
  status?: LandingStatus
  start_date?: string
  end_date?: string
  conversion_goal?: ConversionGoal
}

export interface UpdateLandingInput {
  name?: string
  description?: string
  config?: Partial<LandingConfig>
  html_content?: string
  status?: LandingStatus
  start_date?: string
  end_date?: string
  conversion_goal?: ConversionGoal
}

export interface CreateOrderInput {
  landing_id: string
  variant_id?: string
  name: string
  email?: string
  phone: string
  address?: string
  city?: string
  product_name?: string
  quantity?: number
  price?: number
  total?: number
  design_description?: string
  design_files?: string[]
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

export interface LandingPreviewDevice {
  type: 'mobile' | 'desktop' | 'tablet'
  width: number
  height: number
  label: string
}

export const PREVIEW_DEVICES: LandingPreviewDevice[] = [
  { type: 'mobile', width: 375, height: 812, label: 'iPhone 14' },
  { type: 'tablet', width: 768, height: 1024, label: 'iPad Mini' },
  { type: 'desktop', width: 1280, height: 800, label: 'Desktop' },
]

export const DEFAULT_LANDING_CONFIG: LandingConfig = {
  headline: 'La Taza Que Cuenta TU Historia',
  subheadline: 'Personalízala con tu foto favorita en menos de 5 minutos',
  cta_text: '¡Quiero la mía ahora!',
  cta_subtext: 'Envío gratis hoy',
  product_name: 'Taza Personalizada Premium',
  product_subtitle: 'Diseño único con tu foto, nombre o mensaje',
  price: 14.99,
  old_price: 29.99,
  discount: '50%',
  currency: '$',
  image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&h=600&fit=crop',
  gallery: [
    'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&fit=crop',
    'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?w=400&fit=crop',
  ],
  features: [
    { icon: '🎨', title: 'Diseño 100% Personalizado', desc: 'Tu foto, nombre o mensaje' },
    { icon: '✨', title: 'Calidad Premium', desc: 'Cerámica importada resistente' },
    { icon: '🚚', title: 'Envío Express', desc: 'Entrega en 24-48 horas' },
    { icon: '💝', title: 'Empaque de Regalo', desc: 'Listo para sorprender' },
  ],
  testimonials: [
    {
      name: 'María G.',
      location: 'Quito',
      text: '¡Increíble! La calidad es excelente y llegó en 2 días.',
      rating: 5,
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    },
  ],
  whatsapp: '593969937265',
  pixel_id: '',
  capi_token: '',
  posthog_key: '',
  stock_total: 50,
  stock_current: 12,
  viewers_min: 8,
  viewers_max: 34,
  countdown_hours: 24,
  color_primary: '#667eea',
  color_secondary: '#764ba2',
  gradient_hero: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  gradient_cta: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  meta_title: '',
  meta_description: '',
  meta_image: '',
  form_fields: ['name', 'phone', 'address', 'design'],
  show_stock_bar: true,
  show_countdown: true,
  show_testimonials: true,
  show_features: true,
  show_gallery: true,
  sticky_cta: true,
  payment_method: 'whatsapp',
  redirect_url: null,
  custom_css: '',
  custom_js: '',
}
