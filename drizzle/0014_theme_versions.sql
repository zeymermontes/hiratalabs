-- Motor de temas: versiones del tema de cada tienda (borrador, publicada y archivadas).
-- Aditiva e idempotente. Las tiendas sin filas aquí siguen usando sites.theme + home_sections.

do $$ begin
  create type theme_version_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

create table if not exists theme_versions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  status theme_version_status not null default 'draft',
  doc jsonb not null,
  label text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists theme_versions_site_idx on theme_versions (site_id, status, updated_at desc);
-- Un solo borrador y una sola publicada por tienda.
create unique index if not exists theme_versions_one_draft on theme_versions (site_id) where status = 'draft';
create unique index if not exists theme_versions_one_published on theme_versions (site_id) where status = 'published';
alter table theme_versions enable row level security;
