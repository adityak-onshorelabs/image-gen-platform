-- Image Gen Platform — Supabase schema.
-- Run this once in Supabase → SQL Editor.
--
-- SECURITY MODEL: RLS is ENABLED on every table with NO policies.
--   - service_role key (server-only, our app) BYPASSES RLS → full access.
--   - publishable/anon key (public) is BLOCKED on every table.
-- This means the exposed NEXT_PUBLIC publishable key cannot read or write
-- any data. All access goes through our server using SUPABASE_SERVICE_ROLE_KEY.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- projects
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- --------------------------------------------------------------- templates
create table if not exists templates (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  name            text not null,
  slug            text not null,
  width           integer not null,
  height          integer not null,
  base_image_url  text,
  output_format   text not null default 'png',
  default_quality text not null default 'high',
  dpi             integer not null default 72,
  version         integer not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (project_id, slug)
);

-- ------------------------------------------------------------------ layers
create table if not exists layers (
  id             uuid primary key default gen_random_uuid(),
  template_id    uuid not null references templates(id) on delete cascade,
  name           text not null,
  type           text not null,
  is_dynamic     boolean not null default true,
  default_value  text,
  x              integer not null default 0,
  y              integer not null default 0,
  width          integer not null default 0,
  height         integer not null default 0,
  z_index        integer not null default 0,
  opacity        integer not null default 100,
  hidden         boolean not null default false,
  font_family    text,
  font_size      integer,
  font_weight    integer,
  font_color     text,
  alignment      text,
  vertical_align text,
  line_height    numeric,
  letter_spacing numeric,
  max_lines      integer,
  auto_resize    boolean,
  overflow_mode  text,
  fit_mode       text,
  border_radius  integer,
  unique (template_id, name)
);

-- ------------------------------------------------------- generated_images
create table if not exists generated_images (
  id               uuid primary key default gen_random_uuid(),
  template_id      uuid not null references templates(id) on delete cascade,
  template_version integer not null,
  image_url        text not null,
  render_payload   jsonb,
  payload_hash     text,
  format           text not null,
  duration_ms      integer,
  cached           boolean not null default false,
  created_at       timestamptz not null default now()
);

-- ------------------------------------------------------------------- fonts
create table if not exists fonts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  weight     integer not null default 400,
  style      text not null default 'normal',
  file_url   text not null,
  created_at timestamptz not null default now()
);

-- indexes for common lookups
create index if not exists templates_project_id_idx on templates(project_id);
create index if not exists layers_template_id_idx on layers(template_id);
create index if not exists generated_images_template_id_idx on generated_images(template_id);
create index if not exists generated_images_payload_hash_idx on generated_images(payload_hash);

-- ----------------------------------------------------- RLS: lock everything
alter table projects         enable row level security;
alter table templates        enable row level security;
alter table layers           enable row level security;
alter table generated_images enable row level security;
alter table fonts            enable row level security;
-- No policies created on purpose. service_role bypasses RLS; anon is blocked.
