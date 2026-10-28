-- Módulo pedidos: compradores, direcciones, carritos, pedidos, historial de
-- estado y bitácora de correos. Todo por tienda (site_id). Dinero en centavos.
-- Requiere 0010 (catálogo: products, product_variants).

do $$ begin
  create type order_status as enum ('pending', 'paid', 'in_production', 'ready', 'shipped', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fulfillment_kind as enum ('ship', 'pickup');
exception when duplicate_object then null; end $$;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  user_id uuid not null,
  email text not null,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);
create unique index if not exists customers_site_user_idx on customers (site_id, user_id);
create unique index if not exists customers_site_email_idx on customers (site_id, email);
create index if not exists customers_site_idx on customers (site_id);
alter table customers enable row level security;

create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  label text not null,
  recipient text not null,
  street text not null,
  ext_number text,
  int_number text,
  neighborhood text,
  city text not null,
  state text not null,
  zip text not null,
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists addresses_site_idx on addresses (site_id);
create index if not exists addresses_customer_idx on addresses (customer_id);
alter table addresses enable row level security;

create table if not exists carts (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  customer_id uuid references customers(id) on delete cascade,
  guest_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists carts_site_idx on carts (site_id);
create unique index if not exists carts_site_customer_idx on carts (site_id, customer_id) where customer_id is not null;
create unique index if not exists carts_site_guest_idx on carts (site_id, guest_id) where guest_id is not null;
alter table carts enable row level security;

create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete cascade,
  quantity integer not null default 1,
  unit_price_cents integer not null default 0,
  customization jsonb,
  uploaded_file_url text,
  created_at timestamptz not null default now()
);
create index if not exists cart_items_cart_idx on cart_items (cart_id);
alter table cart_items enable row level security;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  number integer not null,
  customer_id uuid references customers(id) on delete set null,
  email text not null,
  full_name text not null,
  phone text,
  status order_status not null default 'pending',
  subtotal_cents integer not null default 0,
  discount_cents integer not null default 0,
  shipping_cents integer not null default 0,
  total_cents integer not null default 0,
  fulfillment fulfillment_kind not null default 'ship',
  address_snapshot jsonb,
  branch_id uuid,
  payment_provider text,
  payment_id text,
  payment_status text,
  payment_status_detail text,
  notes text,
  tracking_carrier text,
  tracking_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);
create unique index if not exists orders_site_number_idx on orders (site_id, number);
create index if not exists orders_site_created_idx on orders (site_id, created_at);
create index if not exists orders_site_status_idx on orders (site_id, status);
create index if not exists orders_customer_idx on orders (customer_id);
alter table orders enable row level security;

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  variant_name text,
  quantity integer not null default 1,
  unit_price_cents integer not null default 0,
  customization jsonb,
  uploaded_file_url text,
  meta jsonb
);
create index if not exists order_items_order_idx on order_items (order_id);
alter table order_items enable row level security;

create table if not exists order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status order_status not null,
  note text,
  changed_by text,
  created_at timestamptz not null default now()
);
create index if not exists order_status_history_order_idx on order_status_history (order_id);
alter table order_status_history enable row level security;

create table if not exists order_email_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  kind text not null,
  to_email text not null,
  ok boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists order_email_log_order_idx on order_email_log (order_id);
alter table order_email_log enable row level security;
