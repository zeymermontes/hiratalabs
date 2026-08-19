-- DeepSeek as a provider, plus the model catalogue that carries the default
-- model per provider and the prices used to bill sites back.

alter type ai_provider add value if not exists 'deepseek';

create table if not exists ai_models (
  id uuid primary key default gen_random_uuid(),
  provider ai_provider not null,
  model text not null,
  label text,
  input_price_micros bigint not null default 0,
  output_price_micros bigint not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists ai_models_provider_model_idx on ai_models (provider, model);

alter table ai_models enable row level security;
