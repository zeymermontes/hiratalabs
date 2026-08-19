-- AI quote-assistant chat: platform provider keys, per-site configuration,
-- and a usage log that backs the monthly cap.

do $$ begin
  create type ai_provider as enum ('anthropic', 'openai', 'google', 'groq');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_key_mode as enum ('platform', 'own');
exception when duplicate_object then null; end $$;

create table if not exists ai_keys (
  id uuid primary key default gen_random_uuid(),
  provider ai_provider not null,
  label text not null,
  secret text not null,
  hint text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ai_keys_provider_idx on ai_keys (provider);

create table if not exists site_chat (
  site_id uuid primary key references sites(id) on delete cascade,
  enabled boolean not null default false,
  replaces_form boolean not null default false,
  key_mode ai_key_mode not null default 'platform',
  provider ai_provider not null default 'anthropic',
  model text,
  own_secret text,
  own_hint text,
  launcher_label text,
  welcome text,
  business_context text,
  service_options text[] not null default '{}',
  monthly_limit integer not null default 500,
  updated_at timestamptz not null default now()
);

create table if not exists ai_usage (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  provider ai_provider not null,
  model text,
  ok boolean not null default true,
  error text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_site_created_idx on ai_usage (site_id, created_at desc);

alter table ai_keys  enable row level security;
alter table site_chat enable row level security;
alter table ai_usage enable row level security;
