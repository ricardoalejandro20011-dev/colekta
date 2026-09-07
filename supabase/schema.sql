-- ══════════════════════════════════════════════════════════════════════════
-- COLEKTA — Esquema de base de datos (Supabase / Postgres)
-- Toda escuela cobra a tiempo.
--
-- Ejecuta este archivo COMPLETO en:  Supabase Dashboard > SQL Editor > New query
-- Es idempotente: lo puedes correr varias veces sin romper nada.
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ──────────────────────────────────────────────────────────────────────────
do $$ begin
  create type public.school_nivel as enum
    ('kinder','primaria','secundaria','prepa','universidad','academia','otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.school_plan as enum ('inicio','crecimiento','pro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.student_status as enum ('activo','baja','egresado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pendiente','pagado','atrasado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.wa_log_status as enum ('en_cola','enviado','fallado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_role as enum ('owner','admin','staff');
exception when duplicate_object then null; end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. TABLAS
-- ──────────────────────────────────────────────────────────────────────────

-- 2.1 schools ─────────────────────────────────────────────────────────────
create table if not exists public.schools (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  slug                      text not null unique,
  logo_url                  text,
  nivel                     public.school_nivel not null default 'otro',
  whatsapp                  text,
  plan                      public.school_plan not null default 'inicio',
  rfc                       text,
  -- Integraciones por escuela (si están vacías se usa el fallback del .env)
  mp_access_token           text,
  mp_public_key             text,
  whatsapp_token            text,
  whatsapp_phone_number_id  text,
  -- Configuración de cobranza
  dia_vencimiento           smallint not null default 5
                              check (dia_vencimiento between 1 and 28),
  recordatorios_dias        smallint[] not null default '{1,5,10}',
  onboarding_completo       boolean not null default false,
  -- Quién la creó. Sin esta columna, el INSERT ... RETURNING del onboarding
  -- fallaría: en ese instante el perfil todavía no tiene school_id y la
  -- política de SELECT no dejaría devolver la fila recién insertada.
  created_by                uuid default auth.uid() references auth.users(id) on delete set null,
  created_at                timestamptz not null default now()
);

-- Por si la tabla ya existía de una versión anterior del esquema.
alter table public.schools
  add column if not exists created_by uuid default auth.uid() references auth.users(id) on delete set null;

comment on column public.schools.dia_vencimiento is
  'Día del mes en que vence la colegiatura. Se usa al generar el ciclo.';
comment on column public.schools.recordatorios_dias is
  'Días del mes en que se disparan recordatorios automáticos (plan Crecimiento/Pro).';

-- 2.2 profiles (usuarios del equipo ligados a una escuela) ────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  school_id  uuid references public.schools(id) on delete cascade,
  nombre     text,
  email      text,
  role       public.member_role not null default 'owner',
  created_at timestamptz not null default now()
);

create index if not exists profiles_school_idx on public.profiles(school_id);

-- 2.3 groups ──────────────────────────────────────────────────────────────
-- Un grupo es CUALQUIER agrupación: "1ro A", "Avanzados Lunes",
-- "Cinta Negra", "Semestre 3", "Maternal". Nada hardcodeado.
create table if not exists public.groups (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools(id) on delete cascade,
  nombre           text not null,
  nivel_educativo  text,
  monto_default    numeric(12,2) not null default 0,
  orden            int not null default 0,
  created_at       timestamptz not null default now(),
  unique (school_id, nombre)
);

create index if not exists groups_school_idx on public.groups(school_id);

-- 2.4 students ────────────────────────────────────────────────────────────
create table if not exists public.students (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools(id) on delete cascade,
  group_id       uuid references public.groups(id) on delete set null,
  nombre_alumno  text not null,
  nombre_tutor   text not null,
  whatsapp_tutor text not null,
  email_tutor    text,
  monto_custom   numeric(12,2),
  matricula      text,
  notas          text,
  status         public.student_status not null default 'activo',
  created_at     timestamptz not null default now()
);

create index if not exists students_school_idx  on public.students(school_id);
create index if not exists students_group_idx   on public.students(group_id);
create index if not exists students_status_idx  on public.students(school_id, status);
-- Búsqueda global por alumno o tutor
create index if not exists students_search_idx on public.students
  using gin (to_tsvector('spanish', nombre_alumno || ' ' || nombre_tutor));

comment on column public.students.monto_custom is
  'Si es NULL se usa groups.monto_default. Sirve para becados o descuentos.';

-- 2.5 concepts ────────────────────────────────────────────────────────────
create table if not exists public.concepts (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools(id) on delete cascade,
  nombre        text not null,
  es_recurrente boolean not null default true,
  monto_fijo    numeric(12,2),
  created_at    timestamptz not null default now(),
  unique (school_id, nombre)
);

create index if not exists concepts_school_idx on public.concepts(school_id);

comment on column public.concepts.monto_fijo is
  'Si tiene valor, este concepto cobra lo mismo a todos (ej. Inscripción $2,500) '
  'e ignora monto_custom / monto_default. Típico de Uniforme, Examen, Curso de verano.';

-- 2.6 payments ────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  school_id           uuid not null references public.schools(id) on delete cascade,
  student_id          uuid not null references public.students(id) on delete cascade,
  concept_id          uuid not null references public.concepts(id) on delete cascade,
  ciclo               text not null,                    -- 'YYYY-MM'
  monto_concepto      numeric(12,2) not null,           -- lo limpio que recibe la escuela
  monto_total_cobrado numeric(12,2) not null,           -- lo que paga el tutor (con comisión)
  mp_payment_id       text,
  mp_preference_id    text,
  mp_init_point       text,
  mp_status           text,
  status              public.payment_status not null default 'pendiente',
  fecha_pago          timestamptz,
  fecha_vencimiento   date not null,
  link_token          uuid not null unique default gen_random_uuid(),
  metodo_pago         text,                             -- 'mercado_pago' | 'manual'
  nota_manual         text,
  created_at          timestamptz not null default now(),
  -- Un alumno no puede tener dos veces el mismo concepto en el mismo ciclo
  unique (student_id, concept_id, ciclo)
);

create index if not exists payments_school_ciclo_idx  on public.payments(school_id, ciclo);
create index if not exists payments_student_idx       on public.payments(student_id);
create index if not exists payments_status_idx        on public.payments(school_id, status);
create index if not exists payments_token_idx         on public.payments(link_token);
create index if not exists payments_mp_pref_idx       on public.payments(mp_preference_id);
create index if not exists payments_venc_idx          on public.payments(school_id, fecha_vencimiento);

comment on column public.payments.monto_concepto is
  'Monto limpio del concepto. ES LO QUE SE LE REPORTA A LA ESCUELA.';
comment on column public.payments.monto_total_cobrado is
  'monto_concepto * 1.0406 + 3.48 — la comisión de Mercado Pago la paga el tutor.';

-- 2.7 whatsapp_logs ───────────────────────────────────────────────────────
create table if not exists public.whatsapp_logs (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.schools(id) on delete cascade,
  payment_id    uuid references public.payments(id) on delete cascade,
  "to"          text not null,
  message       text not null,
  wa_message_id text,
  status        public.wa_log_status not null default 'en_cola',
  error         text,
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists wa_logs_school_idx  on public.whatsapp_logs(school_id, created_at desc);
create index if not exists wa_logs_payment_idx on public.whatsapp_logs(payment_id);
create index if not exists wa_logs_status_idx  on public.whatsapp_logs(school_id, status);

-- ──────────────────────────────────────────────────────────────────────────
-- 3. HELPERS DE SEGURIDAD
-- ──────────────────────────────────────────────────────────────────────────

-- Devuelve el school_id del usuario autenticado. SECURITY DEFINER para que
-- la política de profiles no se llame a sí misma en recursión infinita.
create or replace function public.current_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id from public.profiles where id = auth.uid()
$$;

revoke all on function public.current_school_id() from public;
grant execute on function public.current_school_id() to authenticated;

-- Genera el slug único de la escuela en la base de datos.
-- No se puede hacer desde el cliente: RLS le impide ver las escuelas de otros,
-- así que siempre creería que el slug está libre y chocaría con el UNIQUE.
create or replace function public.schools_slug_auto()
returns trigger
language plpgsql
as $$
declare
  base      text;
  candidato text;
  i         int := 1;
begin
  if new.slug is not null and length(trim(new.slug)) > 0 then
    return new;
  end if;

  base := trim(both '-' from regexp_replace(
    lower(translate(
      coalesce(new.name, 'escuela'),
      'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
      'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
    )),
    '[^a-z0-9]+', '-', 'g'
  ));

  if base is null or base = '' then
    base := 'escuela';
  end if;

  candidato := left(base, 48);

  while exists (select 1 from public.schools where slug = candidato) loop
    i := i + 1;
    candidato := left(base, 44) || '-' || i;
  end loop;

  new.slug := candidato;
  return new;
end;
$$;

drop trigger if exists schools_slug_auto_trigger on public.schools;
create trigger schools_slug_auto_trigger
  before insert on public.schools
  for each row execute function public.schools_slug_auto();

-- Crea automáticamente un profile cuando alguien se registra en auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nombre)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ──────────────────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY — aislamiento total por school_id
--    Una escuela JAMÁS ve datos de otra.
-- ──────────────────────────────────────────────────────────────────────────

alter table public.schools       enable row level security;
alter table public.profiles      enable row level security;
alter table public.groups        enable row level security;
alter table public.students      enable row level security;
alter table public.concepts      enable row level security;
alter table public.payments      enable row level security;
alter table public.whatsapp_logs enable row level security;

-- 4.1 profiles ────────────────────────────────────────────────────────────
drop policy if exists "profiles: leer los de mi escuela" on public.profiles;
create policy "profiles: leer los de mi escuela" on public.profiles
  for select to authenticated
  using (id = auth.uid() or school_id = public.current_school_id());

drop policy if exists "profiles: editar el mio" on public.profiles;
create policy "profiles: editar el mio" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles: insertar el mio" on public.profiles;
create policy "profiles: insertar el mio" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

-- 4.2 schools ─────────────────────────────────────────────────────────────
drop policy if exists "schools: leer la mia" on public.schools;
create policy "schools: leer la mia" on public.schools
  for select to authenticated
  using (id = public.current_school_id() or created_by = auth.uid());

drop policy if exists "schools: crear" on public.schools;
create policy "schools: crear" on public.schools
  for insert to authenticated
  with check (created_by = auth.uid());  -- el onboarding la crea y se auto-asigna en profiles

drop policy if exists "schools: actualizar la mia" on public.schools;
create policy "schools: actualizar la mia" on public.schools
  for update to authenticated
  using (id = public.current_school_id() or created_by = auth.uid())
  with check (id = public.current_school_id() or created_by = auth.uid());

-- 4.3 Tablas hijas — misma política en las 5 (macro por DO block) ─────────
do $$
declare t text;
begin
  foreach t in array array['groups','students','concepts','payments','whatsapp_logs']
  loop
    execute format('drop policy if exists "%s: tenant select" on public.%I', t, t);
    execute format($f$
      create policy "%s: tenant select" on public.%I
        for select to authenticated
        using (school_id = public.current_school_id())
    $f$, t, t);

    execute format('drop policy if exists "%s: tenant insert" on public.%I', t, t);
    execute format($f$
      create policy "%s: tenant insert" on public.%I
        for insert to authenticated
        with check (school_id = public.current_school_id())
    $f$, t, t);

    execute format('drop policy if exists "%s: tenant update" on public.%I', t, t);
    execute format($f$
      create policy "%s: tenant update" on public.%I
        for update to authenticated
        using (school_id = public.current_school_id())
        with check (school_id = public.current_school_id())
    $f$, t, t);

    execute format('drop policy if exists "%s: tenant delete" on public.%I', t, t);
    execute format($f$
      create policy "%s: tenant delete" on public.%I
        for delete to authenticated
        using (school_id = public.current_school_id())
    $f$, t, t);
  end loop;
end $$;

-- NOTA IMPORTANTE SOBRE LA PÁGINA PÚBLICA /p/[token]:
-- El tutor NO está autenticado. En vez de abrir una política pública
-- (que dejaría enumerar pagos), COLEKTA lee ese pago desde el servidor con la
-- service_role key filtrando por link_token (uuid v4, no adivinable).
-- Así RLS sigue 100% cerrado para `anon`.

-- ──────────────────────────────────────────────────────────────────────────
-- 5. VISTA DE KPIs — una sola query para el dashboard
-- ──────────────────────────────────────────────────────────────────────────
create or replace view public.v_payment_rows
with (security_invoker = true) as
select
  p.id,
  p.school_id,
  p.ciclo,
  p.status,
  p.monto_concepto,
  p.monto_total_cobrado,
  p.fecha_vencimiento,
  p.fecha_pago,
  p.link_token,
  p.mp_status,
  p.mp_payment_id,
  p.metodo_pago,
  s.id            as student_id,
  s.nombre_alumno,
  s.nombre_tutor,
  s.whatsapp_tutor,
  s.email_tutor,
  s.status        as student_status,
  g.id            as group_id,
  coalesce(g.nombre, 'Sin grupo') as group_nombre,
  c.id            as concept_id,
  c.nombre        as concept_nombre
from public.payments p
join public.students s on s.id = p.student_id
left join public.groups g on g.id = s.group_id
join public.concepts c on c.id = p.concept_id;

-- ──────────────────────────────────────────────────────────────────────────
-- 6. MARCAR ATRASADOS — corre desde /api/cron/reminders o pg_cron
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.marcar_atrasados()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare afectados integer;
begin
  update public.payments
     set status = 'atrasado'
   where status = 'pendiente'
     and fecha_vencimiento < current_date;
  get diagnostics afectados = row_count;
  return afectados;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 7. STORAGE — bucket público para logos de escuelas
-- ──────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

drop policy if exists "logos: lectura publica" on storage.objects;
create policy "logos: lectura publica" on storage.objects
  for select to public
  using (bucket_id = 'logos');

drop policy if exists "logos: subir autenticado" on storage.objects;
create policy "logos: subir autenticado" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos');

drop policy if exists "logos: actualizar autenticado" on storage.objects;
create policy "logos: actualizar autenticado" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos');

-- ══════════════════════════════════════════════════════════════════════════
-- FIN. Si esto corrió sin errores, tu backend está listo.
-- ══════════════════════════════════════════════════════════════════════════
