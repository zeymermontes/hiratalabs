-- Plataforma de comercio: tipo de sitio, miembros por sitio y sistema de módulos
-- (plugins que el super admin vende como extras o deja gratis, y que el dueño
-- de cada sitio puede prender o apagar según lo permita el catálogo).
--
-- Todo es aditivo: los sitios existentes quedan como kind = 'landing' y, sin
-- filas en site_modules, cada módulo toma el default que dicta el código, que
-- reproduce el comportamiento actual.

do $$ begin
  create type site_kind as enum ('landing', 'store');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_role as enum ('owner', 'staff');
exception when duplicate_object then null; end $$;

do $$ begin
  create type module_tier as enum ('free', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type module_request_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

alter table sites add column if not exists kind site_kind not null default 'landing';
alter table sites add column if not exists theme jsonb;

create table if not exists site_members (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  email text not null,
  user_id uuid,
  name text,
  role member_role not null default 'owner',
  invited_by text,
  created_at timestamptz not null default now()
);
create unique index if not exists site_members_site_email_idx on site_members (site_id, email);
create index if not exists site_members_email_idx on site_members (email);
alter table site_members enable row level security;

create table if not exists modules_catalog (
  key text primary key,
  available boolean not null default true,
  tier module_tier,
  price_label text,
  owner_can_toggle boolean,
  notes text,
  updated_at timestamptz not null default now()
);
alter table modules_catalog enable row level security;

create table if not exists site_modules (
  site_id uuid not null references sites(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  enabled_by text,
  updated_at timestamptz not null default now()
);
create unique index if not exists site_modules_pk on site_modules (site_id, module_key);
alter table site_modules enable row level security;

create table if not exists module_requests (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  module_key text not null,
  requested_by text not null,
  message text,
  status module_request_status not null default 'pending',
  resolved_by text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists module_requests_site_idx on module_requests (site_id, status);
alter table module_requests enable row level security;
