-- Asistente de IA (ai_assist) y servidor MCP (mcp_access).
--
-- ai_usage.feature distingue qué función hizo la llamada: null = chat de
-- cotización (lo de siempre), 'assist' = asistente de redacción. La cuota
-- mensual de tokens del asistente se calcula sobre feature = 'assist'.
--
-- mcp_tokens guarda SOLO el sha256 del token; el valor crudo se enseña una vez.
-- mcp_audit registra cada llamada (herramienta, éxito, duración) por sitio.

alter table ai_usage add column if not exists feature text;
create index if not exists ai_usage_site_feature_created_idx on ai_usage (site_id, feature, created_at);

create table if not exists mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  name text not null,
  token_hash text not null,
  prefix text not null,
  scopes text[] not null default '{read}',
  created_by text,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists mcp_tokens_hash_idx on mcp_tokens (token_hash);
create index if not exists mcp_tokens_site_idx on mcp_tokens (site_id);
alter table mcp_tokens enable row level security;

create table if not exists mcp_audit (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  token_id uuid references mcp_tokens(id) on delete set null,
  tool text not null,
  ok boolean not null default true,
  ms integer,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists mcp_audit_site_created_idx on mcp_audit (site_id, created_at);
alter table mcp_audit enable row level security;
