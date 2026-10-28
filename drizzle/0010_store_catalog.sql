-- Módulo catálogo: productos, variantes, categorías, campos de personalización
-- y contenido de portada (banners y secciones). Todo cuelga de sites.id y los
-- precios se guardan en centavos MXN (integer). Debe reflejar exactamente
-- src/modules/catalog/schema.ts.
--
-- Aditivo e idempotente: se puede correr varias veces sin romper nada.

do $$ begin
  create type product_status as enum ('draft', 'active', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type customization_field_type as enum ('text', 'textarea', 'number', 'dropdown', 'file');
exception when duplicate_object then null; end $$;

do $$ begin
  create type banner_position as enum ('hero', 'strip', 'category');
exception when duplicate_object then null; end $$;

do $$ begin
  create type home_section_type as enum (
    'hero_banners', 'featured_products', 'category_grid', 'banner_strip', 'cta_band', 'carousel', 'custom_html'
  );
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------------ categorías
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  parent_id uuid,
  sort_order integer not null default 0,
  image_url text,
  show_in_header boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists categories_site_slug_idx on categories (site_id, slug);
create index if not exists categories_site_idx on categories (site_id);
alter table categories enable row level security;

-- ------------------------------------------------------------------- productos
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  price_cents integer not null default 0,
  compare_at_cents integer,
  status product_status not null default 'draft',
  images jsonb not null default '[]'::jsonb,
  stock integer,
  sku text,
  is_customizable boolean not null default false,
  requires_file boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists products_site_slug_idx on products (site_id, slug);
create index if not exists products_site_status_idx on products (site_id, status);
alter table products enable row level security;

-- Relación N:N producto-categoría.
create table if not exists product_categories (
  product_id uuid not null references products(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade
);
create unique index if not exists product_categories_pk on product_categories (product_id, category_id);
create index if not exists product_categories_category_idx on product_categories (category_id);
alter table product_categories enable row level security;

-- ------------------------------------------------------------------- variantes
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  price_delta_cents integer not null default 0,
  sku text,
  stock integer,
  sort_order integer not null default 0
);
create index if not exists product_variants_product_idx on product_variants (product_id);
alter table product_variants enable row level security;

-- ------------------------------------------------- campos de personalización
create table if not exists customization_fields (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  type customization_field_type not null,
  name text not null,
  label text not null,
  required boolean not null default false,
  options jsonb,
  variant_ids uuid[],
  sort_order integer not null default 0
);
create unique index if not exists customization_fields_product_name_idx on customization_fields (product_id, name);
alter table customization_fields enable row level security;

-- --------------------------------------------------------------------- portada
create table if not exists banners (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  title text not null,
  subtitle text,
  image_url text not null,
  mobile_image_url text,
  link_url text,
  cta_label text,
  position banner_position not null default 'hero',
  sort_order integer not null default 0,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz
);
create index if not exists banners_site_idx on banners (site_id, position);
alter table banners enable row level security;

create table if not exists home_sections (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  type home_section_type not null,
  title text,
  config jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  active boolean not null default true
);
create index if not exists home_sections_site_idx on home_sections (site_id);
alter table home_sections enable row level security;
