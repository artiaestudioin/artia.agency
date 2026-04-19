-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: email_templates
-- Guarda las plantillas creadas con GrapesJS
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.email_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  html        text not null default '',      -- HTML final para enviar
  gjs_data    jsonb not null default '{}',  -- Estado interno de GrapesJS (para edición)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Solo el service_role (backend) puede leer/escribir. Ningún usuario anónimo.
alter table public.email_templates enable row level security;

create policy "Solo admin autenticado"
  on public.email_templates
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLA: email_sends
-- Registro de cada email enviado (auditoría)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.email_sends (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid references public.email_templates(id) on delete set null,
  template_name text not null default '',
  sent_to       text not null,
  subject       text not null,
  resend_id     text,                         -- ID devuelto por Resend
  sent_at       timestamptz not null default now()
);

alter table public.email_sends enable row level security;

create policy "Solo admin autenticado"
  on public.email_sends
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────────────────
-- VARIABLE ENV A AÑADIR EN VERCEL:
--   RESEND_API_KEY = re_xxxxxxxxxxxx
-- ─────────────────────────────────────────────────────────────────────────────
