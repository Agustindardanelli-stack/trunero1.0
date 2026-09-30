-- Turnea · esquema de base de datos (Supabase / PostgreSQL)
-- Pegalo completo en Supabase → SQL Editor → Run.
--
-- Seguridad: RLS activado y SIN políticas. Todo el acceso pasa por el servidor de Next.js
-- con la service role key, así ningún dato de clientes queda expuesto a la API pública.

create extension if not exists btree_gist;

-- Configuración del negocio (una sola fila)
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  business_name text not null,
  tagline text not null default '',
  address text not null default '',
  whatsapp text not null default '',
  hours jsonb not null,
  slot_step_min int not null default 15 check (slot_step_min between 5 and 120),
  min_advance_min int not null default 60 check (min_advance_min >= 0),
  max_days_ahead int not null default 14 check (max_days_ahead between 1 and 90),
  hold_min int not null default 15 check (hold_min between 5 and 60),
  cancel_limit_hours int not null default 12 check (cancel_limit_hours >= 0)
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  description text not null default '',
  duration_min int not null check (duration_min between 5 and 480),
  price int not null check (price >= 0),
  deposit int not null default 0 check (deposit >= 0 and deposit <= price),
  active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  reason text not null default ''
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references services (id) on delete restrict,
  service_name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  customer_name text not null check (char_length(customer_name) between 2 and 80),
  customer_phone text not null check (customer_phone ~ '^549[0-9]{10}$'),
  status text not null check (status in (
    'pendiente_pago', 'confirmado', 'asistio', 'ausente', 'cancelado', 'expirado', 'reembolsar'
  )),
  deposit int not null default 0 check (deposit >= 0),
  payment_id text unique,
  paid_at timestamptz,
  hold_until timestamptz,
  reminded_at timestamptz,
  manage_token_hash text not null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (status <> 'pendiente_pago' or hold_until is not null),

  -- La garantía de que nunca haya dos turnos superpuestos, incluso con reservas simultáneas.
  constraint sin_superposicion exclude using gist (
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pendiente_pago', 'confirmado', 'asistio', 'ausente'))
);

create index if not exists bookings_starts_at_idx on bookings (starts_at);
create index if not exists bookings_pending_idx on bookings (hold_until) where status = 'pendiente_pago';

-- Libera los horarios de quienes no pagaron la seña a tiempo.
create or replace function expirar_reservas() returns int
language sql as $$
  with x as (
    update bookings set status = 'expirado'
    where status = 'pendiente_pago' and hold_until <= now()
    returning 1
  )
  select count(*)::int from x;
$$;

alter table settings enable row level security;
alter table services enable row level security;
alter table blocks enable row level security;
alter table bookings enable row level security;

revoke all on function expirar_reservas() from public, anon, authenticated;
grant execute on function expirar_reservas() to service_role;

-- Datos iniciales (editables desde el panel)
insert into settings (business_name, tagline, address, whatsapp, hours)
values (
  'Mi negocio',
  'Reservá tu turno online',
  'Río Cuarto, Córdoba',
  '5493580000000',
  '{"0":[],"1":[],"2":[{"from":"09:00","to":"13:00"},{"from":"16:00","to":"20:30"}],"3":[{"from":"09:00","to":"13:00"},{"from":"16:00","to":"20:30"}],"4":[{"from":"09:00","to":"13:00"},{"from":"16:00","to":"20:30"}],"5":[{"from":"09:00","to":"13:00"},{"from":"16:00","to":"20:30"}],"6":[{"from":"09:00","to":"14:00"}]}'
)
on conflict (id) do nothing;

insert into services (name, description, duration_min, price, deposit, sort_order)
select * from (values
  ('Corte', 'Corte a tijera o máquina, lavado y peinado.', 30, 12000, 4000, 1),
  ('Corte + barba', 'Corte completo y perfilado de barba.', 45, 16000, 5000, 2),
  ('Barba', 'Perfilado y arreglo de barba.', 20, 7000, 0, 3)
) v
where not exists (select 1 from services);
