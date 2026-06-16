-- ============================================
-- supabase/ar_schema.sql
-- Esquema WebAR para Artia
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- ── Extensión UUID ────────────────────────────
create extension if not exists "pgcrypto";

-- ── Enum tipos ────────────────────────────────
create type ar_experience_status as enum ('draft', 'active', 'paused', 'archived');
create type ar_occasion_type as enum (
  'fathers_day', 'mothers_day', 'birthday', 'anniversary',
  'valentines', 'christmas', 'graduation', 'custom'
);
create type ar_model_type as enum ('3d_glb', '2d_image', 'video');
create type ar_frame_style as enum ('none', 'elegant', 'floral', 'minimal', 'luxury');

-- ── Campañas ─────────────────────────────────
create table if not exists ar_campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  occasion    ar_occasion_type not null default 'custom',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── Experiencias AR ───────────────────────────
create table if not exists ar_experiences (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,           -- URL pública: /ar/[slug]
  title              text not null,
  message            text not null default '',
  recipient_name     text not null default '',
  occasion           ar_occasion_type not null default 'birthday',
  status             ar_experience_status not null default 'draft',

  -- Visual
  bg_image           text,
  bg_color           text not null default '#0a0a0f',
  primary_color      text not null default '#c084fc',
  secondary_color    text not null default '#818cf8',
  font_family        text not null default 'Playfair Display',
  frame_style        ar_frame_style not null default 'elegant',

  -- Modelo 3D
  model_url          text,
  model_ios_url      text,
  model_type         ar_model_type not null default '3d_glb',
  model_alt          text not null default 'Tu regalo en realidad aumentada',

  -- CTA button
  cta_text           text not null default 'Abrir Cámara',
  cta_color          text not null default '#c084fc',
  cta_text_color     text not null default '#ffffff',
  cta_border_radius  integer not null default 999,
  cta_icon           text not null default 'camera',

  -- Audio
  audio_url          text,
  audio_autoplay     boolean not null default false,

  -- Relaciones
  campaign_id        uuid references ar_campaigns(id) on delete set null,

  -- QR / URL pública
  qr_code_url        text,
  public_url         text,

  -- Métricas
  scan_count         integer not null default 0,
  ar_launch_count    integer not null default 0,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users(id) on delete set null
);

create index if not exists ar_experiences_slug_idx     on ar_experiences(slug);
create index if not exists ar_experiences_status_idx   on ar_experiences(status);
create index if not exists ar_experiences_campaign_idx on ar_experiences(campaign_id);

-- ── Assets ────────────────────────────────────
create table if not exists ar_assets (
  id            uuid primary key default gen_random_uuid(),
  experience_id uuid not null references ar_experiences(id) on delete cascade,
  file_name     text not null,
  file_url      text not null,
  file_type     text not null check (file_type in ('glb','usdz','image','audio','video')),
  file_size     bigint not null default 0,
  mime_type     text not null default '',
  created_at    timestamptz not null default now()
);

create index if not exists ar_assets_experience_idx on ar_assets(experience_id);

-- ── Eventos (analytics) ───────────────────────
create table if not exists ar_events (
  id            uuid primary key default gen_random_uuid(),
  experience_id uuid not null references ar_experiences(id) on delete cascade,
  event_type    text not null check (event_type in ('scan','page_view','ar_launch','share')),
  user_agent    text,
  ip_hash       text,
  created_at    timestamptz not null default now()
);

create index if not exists ar_events_experience_idx on ar_events(experience_id);
create index if not exists ar_events_type_idx       on ar_events(event_type);

-- ── Trigger updated_at ───────────────────────
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger ar_experiences_updated_at
  before update on ar_experiences
  for each row execute function update_updated_at_column();

create trigger ar_campaigns_updated_at
  before update on ar_campaigns
  for each row execute function update_updated_at_column();

-- ── RLS ──────────────────────────────────────
alter table ar_experiences enable row level security;
alter table ar_assets      enable row level security;
alter table ar_campaigns   enable row level security;
alter table ar_events      enable row level security;

-- Admins autenticados: acceso total
create policy "admin_full_access_experiences" on ar_experiences
  for all using (auth.role() = 'authenticated');

create policy "admin_full_access_assets" on ar_assets
  for all using (auth.role() = 'authenticated');

create policy "admin_full_access_campaigns" on ar_campaigns
  for all using (auth.role() = 'authenticated');

-- Público: solo leer experiencias activas (para la página del cliente)
create policy "public_read_active_experiences" on ar_experiences
  for select using (status = 'active');

-- Público: insertar eventos de analytics
create policy "public_insert_events" on ar_events
  for insert with check (true);

-- Público: leer assets de experiencias activas
create policy "public_read_assets" on ar_assets
  for select using (
    exists (
      select 1 from ar_experiences e
      where e.id = ar_assets.experience_id
      and e.status = 'active'
    )
  );

-- ── Storage bucket para modelos 3D ───────────
-- Ejecutar después de crear el bucket "ar-assets" en Storage:
-- insert into storage.buckets (id, name, public) values ('ar-assets', 'ar-assets', true);

-- Policy storage: admins suben, todos leen
create policy "ar_assets_admin_upload" on storage.objects
  for insert with check (
    bucket_id = 'ar-assets' and auth.role() = 'authenticated'
  );

create policy "ar_assets_public_read" on storage.objects
  for select using (bucket_id = 'ar-assets');

create policy "ar_assets_admin_delete" on storage.objects
  for delete using (
    bucket_id = 'ar-assets' and auth.role() = 'authenticated'
  );

-- ── Función incrementar scan_count ───────────
create or replace function increment_ar_scan(exp_id uuid)
returns void language plpgsql security definer as $$
begin
  update ar_experiences set scan_count = scan_count + 1 where id = exp_id;
  insert into ar_events (experience_id, event_type) values (exp_id, 'scan');
end;
$$;

create or replace function increment_ar_launch(exp_id uuid)
returns void language plpgsql security definer as $$
begin
  update ar_experiences set ar_launch_count = ar_launch_count + 1 where id = exp_id;
  insert into ar_events (experience_id, event_type) values (exp_id, 'ar_launch');
end;
$$;
