-- Landing platform schema. Safe to run in the Supabase SQL editor.

create extension if not exists "pgcrypto";

do $$ begin
  create type site_status as enum ('live', 'maintenance', 'blocked', 'draft');
exception when duplicate_object then null; end $$;

do $$ begin
  create type domain_status as enum ('pending', 'verified', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type email_status as enum ('pending', 'sent', 'failed', 'skipped');
exception when duplicate_object then null; end $$;

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  created_at timestamptz not null default now()
);
create unique index if not exists admins_email_idx on admins (email);

create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  status site_status not null default 'draft',
  maintenance_title text,
  maintenance_message text,
  active_version_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists sites_slug_idx on sites (slug);

create table if not exists site_versions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  label text,
  storage_prefix text not null,
  file_count integer not null default 0,
  total_bytes bigint not null default 0,
  uploaded_by text,
  created_at timestamptz not null default now()
);
create index if not exists site_versions_site_idx on site_versions (site_id);

create table if not exists site_files (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references site_versions(id) on delete cascade,
  path text not null,
  content_type text not null,
  size integer not null,
  etag text not null
);
create unique index if not exists site_files_version_path_idx on site_files (version_id, path);

create table if not exists site_settings (
  site_id uuid primary key references sites(id) on delete cascade,
  brand_name text,
  email text,
  phone text,
  whatsapp text,
  address text,
  socials jsonb not null default '{}'::jsonb,
  form_recipients text[] not null default '{}',
  form_subject text,
  custom jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists global_settings (
  id text primary key default 'default',
  brand_name text,
  email text,
  phone text,
  whatsapp text,
  address text,
  socials jsonb not null default '{}'::jsonb,
  form_recipients text[] not null default '{}',
  form_subject text,
  custom jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists domains (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  hostname text not null,
  status domain_status not null default 'pending',
  render_domain_id text,
  dns_target text,
  is_primary boolean not null default false,
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists domains_hostname_idx on domains (hostname);
create index if not exists domains_site_idx on domains (site_id);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  form_name text,
  name text,
  email text,
  phone text,
  message text,
  data jsonb not null default '{}'::jsonb,
  page_url text,
  referrer text,
  ip text,
  user_agent text,
  email_status email_status not null default 'pending',
  email_error text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists submissions_site_created_idx on submissions (site_id, created_at desc);

-- The app talks to Postgres with the service role, so RLS is enabled purely as a
-- backstop against the anon key ever reaching these tables.
alter table admins           enable row level security;
alter table sites            enable row level security;
alter table site_versions    enable row level security;
alter table site_files       enable row level security;
alter table site_settings    enable row level security;
alter table global_settings  enable row level security;
alter table domains          enable row level security;
alter table submissions      enable row level security;
