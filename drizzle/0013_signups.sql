-- Registro público de tiendas (/start). El sitio se crea en el primer login.
do $$ begin
  create type signup_status as enum ('pending', 'done', 'expired');
exception when duplicate_object then null; end $$;

create table if not exists signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  store_name text not null,
  slug text not null,
  kind site_kind not null default 'store',
  template text not null default 'lumen',
  business text,
  status signup_status not null default 'pending',
  site_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists signups_email_idx on signups (email, status);
alter table signups enable row level security;
