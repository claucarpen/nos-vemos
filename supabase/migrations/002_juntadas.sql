-- v1 de Nos Vemos: juntadas, votación y cierre por quórum (spec 003).
-- Acceso solo por funciones `security definer`: `anon` y `authenticated` no tocan las tablas
-- directo (salvo `authenticated`, que lee su propia fila de `perfiles`). La tabla `leads` no se toca.
-- Los errores de negocio se lanzan con un mensaje-clave estable (p. ej. 'juntada_no_abierta');
-- la app lo traduce en `src/lib/errores.ts`.

create extension if not exists pgcrypto with schema extensions;

-- Tablas -------------------------------------------------------------------------------------

create table public.tipos_evento (
  id text primary key,
  nombre text not null,
  quorum_default int not null check (quorum_default between 2 and 10),
  maximo_default int not null check (maximo_default between 2 and 10)
);

insert into public.tipos_evento (id, nombre, quorum_default, maximo_default)
values ('cena', 'Cena o reunión', 4, 10);

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  email text,
  lead_id uuid references public.leads (id) on delete set null,
  creado_en timestamptz not null default now()
);

create table public.juntadas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[A-Za-z0-9_-]{22,}$'),
  tipo text not null default 'cena' references public.tipos_evento (id),
  titulo text not null check (char_length(titulo) between 1 and 80),
  organizador_id uuid not null references public.perfiles (id),
  quorum int not null check (quorum between 2 and 10),
  maximo int not null default 10 check (maximo between 2 and 10),
  tamano_grupo int not null check (tamano_grupo between 2 and 10),
  estado text not null default 'abierta' check (estado in ('abierta', 'cerrada', 'cancelada')),
  opcion_ganadora_id uuid,
  creada_en timestamptz not null default now(),
  cerrada_en timestamptz,
  check (quorum <= maximo),
  check (quorum <= tamano_grupo)
);

create table public.opciones (
  id uuid primary key default gen_random_uuid(),
  juntada_id uuid not null references public.juntadas (id) on delete cascade,
  inicio timestamptz not null,
  unique (juntada_id, inicio)
);

alter table public.juntadas
  add constraint juntadas_opcion_ganadora_fk foreign key (opcion_ganadora_id) references public.opciones (id);

create table public.participantes (
  juntada_id uuid not null references public.juntadas (id) on delete cascade,
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  unido_en timestamptz not null default clock_timestamp(),
  primary key (juntada_id, perfil_id)
);

create table public.disponibilidad (
  opcion_id uuid not null references public.opciones (id) on delete cascade,
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  primary key (opcion_id, perfil_id)
);

create table public.movimientos (
  id bigint generated always as identity primary key,
  perfil_id uuid not null references public.perfiles (id) on delete cascade,
  juntada_id uuid not null references public.juntadas (id) on delete cascade,
  tipo text not null check (tipo in ('creo_juntada', 'se_unio', 'voto', 'confirmado', 'cancelo')),
  creado_en timestamptz not null default clock_timestamp()
);

create index movimientos_juntada_tipo_idx on public.movimientos (juntada_id, tipo);

-- RLS y permisos -----------------------------------------------------------------------------
-- Supabase da `grant all` por defecto a `anon` y `authenticated` sobre lo nuevo de `public`:
-- se revoca todo y RLS queda como segunda barrera.

alter table public.tipos_evento enable row level security;
alter table public.perfiles enable row level security;
alter table public.juntadas enable row level security;
alter table public.opciones enable row level security;
alter table public.participantes enable row level security;
alter table public.disponibilidad enable row level security;
alter table public.movimientos enable row level security;

revoke all on table
  public.tipos_evento, public.perfiles, public.juntadas, public.opciones,
  public.participantes, public.disponibilidad, public.movimientos
  from anon, authenticated;

grant select on table public.perfiles to authenticated;

create policy "cada uno lee su perfil"
  on public.perfiles
  for select
  to authenticated
  using (id = (select auth.uid()));

-- Funciones ----------------------------------------------------------------------------------

-- Crea el perfil del usuario con sesión (nombre y email de Google) y lo vincula a su lead.
create function public.asegurar_perfil()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_user auth.users%rowtype;
begin
  if v_uid is null then raise exception 'sin_sesion'; end if;
  select * into v_user from auth.users u where u.id = v_uid;
  if not found then raise exception 'sin_sesion'; end if;

  insert into public.perfiles (id, nombre, email, lead_id)
  values (
    v_uid,
    left(coalesce(
      nullif(btrim(v_user.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(v_user.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(v_user.email, '@', 1), ''),
      'Player'
    ), 80),
    v_user.email,
    (select l.id from public.leads l where lower(l.email) = lower(v_user.email) limit 1)
  )
  on conflict (id) do update
    set lead_id = coalesce(public.perfiles.lead_id, excluded.lead_id),
        email = coalesce(excluded.email, public.perfiles.email);
end;
$$;

-- Valida, crea la juntada con sus opciones, suma al organizador y devuelve el código.
create function public.crear_juntada(titulo text, quorum int, tamano_grupo int, inicios timestamptz[])
returns text
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_titulo text := btrim(coalesce(crear_juntada.titulo, ''));
  v_n int := coalesce(cardinality(crear_juntada.inicios), 0);
  v_maximo int;
  v_id uuid;
  v_codigo text;
begin
  if v_uid is null then raise exception 'sin_sesion'; end if;
  perform public.asegurar_perfil();

  if char_length(v_titulo) not between 1 and 80 then raise exception 'titulo_invalido'; end if;
  if crear_juntada.tamano_grupo is null or crear_juntada.tamano_grupo not between 2 and 10 then
    raise exception 'tamano_invalido';
  end if;
  select t.maximo_default into v_maximo from public.tipos_evento t where t.id = 'cena';
  if crear_juntada.quorum is null or crear_juntada.quorum not between 2 and 10
     or crear_juntada.quorum > crear_juntada.tamano_grupo or crear_juntada.quorum > v_maximo then
    raise exception 'quorum_invalido';
  end if;
  if v_n not between 2 and 10 then raise exception 'cantidad_opciones'; end if;
  if exists (select 1 from unnest(crear_juntada.inicios) i where i is null or i <= now()) then
    raise exception 'opcion_pasada';
  end if;
  if (select count(distinct i) from unnest(crear_juntada.inicios) i) <> v_n then
    raise exception 'opciones_repetidas';
  end if;

  -- 128 bits aleatorios en base64url: 22 caracteres.
  v_codigo := translate(rtrim(encode(extensions.gen_random_bytes(16), 'base64'), '='), '+/', '-_');

  insert into public.juntadas (codigo, tipo, titulo, organizador_id, quorum, maximo, tamano_grupo)
  values (v_codigo, 'cena', v_titulo, v_uid, crear_juntada.quorum, v_maximo, crear_juntada.tamano_grupo)
  returning id into v_id;

  insert into public.opciones (juntada_id, inicio)
  select v_id, i from unnest(crear_juntada.inicios) i;

  insert into public.participantes (juntada_id, perfil_id) values (v_id, v_uid);
  insert into public.movimientos (perfil_id, juntada_id, tipo) values (v_uid, v_id, 'creo_juntada');

  return v_codigo;
end;
$$;

-- Lo único que ve alguien sin sesión (o que todavía no se unió): título, organizador y estado.
create function public.juntada_publica(codigo text)
returns table (titulo text, organizador text, estado text)
language sql
stable
security definer
set search_path = ''
as $$
  select j.titulo, p.nombre, j.estado
  from public.juntadas j
  join public.perfiles p on p.id = j.organizador_id
  where j.codigo = $1
$$;

-- Suma al usuario como participante. Idempotente.
create function public.unirse(codigo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_j public.juntadas%rowtype;
begin
  if v_uid is null then raise exception 'sin_sesion'; end if;
  select * into v_j from public.juntadas j where j.codigo = unirse.codigo for update;
  if not found then raise exception 'no_existe'; end if;
  if v_j.estado <> 'abierta' then raise exception 'juntada_no_abierta'; end if;
  if exists (select 1 from public.participantes pa where pa.juntada_id = v_j.id and pa.perfil_id = v_uid) then
    return;
  end if;
  if (select count(*) from public.participantes pa where pa.juntada_id = v_j.id) >= v_j.maximo then
    raise exception 'juntada_llena';
  end if;

  perform public.asegurar_perfil();
  insert into public.participantes (juntada_id, perfil_id) values (v_j.id, v_uid);
  insert into public.movimientos (perfil_id, juntada_id, tipo) values (v_uid, v_j.id, 'se_unio');
end;
$$;

-- Todo lo que ve un participante. Los participantes van solo con nombre: nunca email ni id.
create function public.detalle_juntada(codigo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_j public.juntadas%rowtype;
begin
  if v_uid is null then raise exception 'sin_sesion'; end if;
  select * into v_j from public.juntadas j where j.codigo = detalle_juntada.codigo;
  if not found then raise exception 'no_existe'; end if;
  if not exists (select 1 from public.participantes pa where pa.juntada_id = v_j.id and pa.perfil_id = v_uid) then
    raise exception 'no_participante';
  end if;

  return jsonb_build_object(
    'codigo', v_j.codigo,
    'titulo', v_j.titulo,
    'estado', v_j.estado,
    'quorum', v_j.quorum,
    'tamano_grupo', v_j.tamano_grupo,
    'maximo', v_j.maximo,
    'organizador', (select p.nombre from public.perfiles p where p.id = v_j.organizador_id),
    'soy_organizador', v_j.organizador_id = v_uid,
    'yo_vote', exists (
      select 1 from public.movimientos m
      where m.juntada_id = v_j.id and m.perfil_id = v_uid and m.tipo = 'voto'),
    'opcion_ganadora_id', v_j.opcion_ganadora_id,
    'opciones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id,
        'inicio', o.inicio,
        'votos', (select count(*) from public.disponibilidad d where d.opcion_id = o.id),
        'mia', exists (select 1 from public.disponibilidad d where d.opcion_id = o.id and d.perfil_id = v_uid)
      ) order by o.inicio)
      from public.opciones o where o.juntada_id = v_j.id), '[]'::jsonb),
    'participantes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'numero', x.numero, 'nombre', x.nombre, 'voto', x.voto, 'soy_yo', x.soy_yo
      ) order by x.numero)
      from (
        select row_number() over (order by pa.unido_en, pa.perfil_id) as numero,
               p.nombre,
               exists (select 1 from public.movimientos m
                       where m.juntada_id = v_j.id and m.perfil_id = pa.perfil_id and m.tipo = 'voto') as voto,
               pa.perfil_id = v_uid as soy_yo
        from public.participantes pa
        join public.perfiles p on p.id = pa.perfil_id
        where pa.juntada_id = v_j.id
      ) x), '[]'::jsonb)
  );
end;
$$;

-- Reemplaza la disponibilidad del votante y cierra la juntada si alguna opción llega al quórum:
-- gana la de más votos; si empatan, la de `inicio` más temprano. Devuelve el estado.
create function public.votar(codigo text, opciones_ids uuid[])
returns text
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_ids uuid[] := coalesce(votar.opciones_ids, '{}');
  v_j public.juntadas%rowtype;
  v_ganadora uuid;
begin
  if v_uid is null then raise exception 'sin_sesion'; end if;
  select * into v_j from public.juntadas j where j.codigo = votar.codigo for update;
  if not found then raise exception 'no_existe'; end if;
  if not exists (select 1 from public.participantes pa where pa.juntada_id = v_j.id and pa.perfil_id = v_uid) then
    raise exception 'no_participante';
  end if;
  if v_j.estado <> 'abierta' then raise exception 'juntada_no_abierta'; end if;
  if exists (
    select 1 from unnest(v_ids) x
    where x is null or not exists (select 1 from public.opciones o where o.id = x and o.juntada_id = v_j.id)
  ) then
    raise exception 'opcion_ajena';
  end if;

  delete from public.disponibilidad d
  using public.opciones o
  where d.opcion_id = o.id and o.juntada_id = v_j.id and d.perfil_id = v_uid;

  insert into public.disponibilidad (opcion_id, perfil_id)
  select distinct x, v_uid from unnest(v_ids) x;

  insert into public.movimientos (perfil_id, juntada_id, tipo) values (v_uid, v_j.id, 'voto');

  select o.id into v_ganadora
  from public.opciones o
  left join public.disponibilidad d on d.opcion_id = o.id
  where o.juntada_id = v_j.id
  group by o.id, o.inicio
  having count(d.perfil_id) >= v_j.quorum
  order by count(d.perfil_id) desc, o.inicio asc
  limit 1;

  if v_ganadora is null then return 'abierta'; end if;

  update public.juntadas j
  set estado = 'cerrada', opcion_ganadora_id = v_ganadora, cerrada_en = now()
  where j.id = v_j.id;

  insert into public.movimientos (perfil_id, juntada_id, tipo)
  select d.perfil_id, v_j.id, 'confirmado' from public.disponibilidad d where d.opcion_id = v_ganadora;

  return 'cerrada';
end;
$$;

-- Solo el organizador, y solo mientras está abierta.
create function public.cancelar(codigo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_j public.juntadas%rowtype;
begin
  if v_uid is null then raise exception 'sin_sesion'; end if;
  select * into v_j from public.juntadas j where j.codigo = cancelar.codigo for update;
  if not found then raise exception 'no_existe'; end if;
  if v_j.organizador_id <> v_uid then raise exception 'no_organizador'; end if;
  if v_j.estado <> 'abierta' then raise exception 'juntada_no_abierta'; end if;

  update public.juntadas j set estado = 'cancelada' where j.id = v_j.id;
  insert into public.movimientos (perfil_id, juntada_id, tipo) values (v_uid, v_j.id, 'cancelo');
end;
$$;

-- Postgres da `execute` a PUBLIC y Supabase además a `anon` y `authenticated`: se revoca y se
-- concede solo lo que corresponde.
revoke all on function public.asegurar_perfil() from public, anon, authenticated;
revoke all on function public.crear_juntada(text, int, int, timestamptz[]) from public, anon, authenticated;
revoke all on function public.juntada_publica(text) from public, anon, authenticated;
revoke all on function public.unirse(text) from public, anon, authenticated;
revoke all on function public.detalle_juntada(text) from public, anon, authenticated;
revoke all on function public.votar(text, uuid[]) from public, anon, authenticated;
revoke all on function public.cancelar(text) from public, anon, authenticated;

grant execute on function public.asegurar_perfil() to authenticated;
grant execute on function public.crear_juntada(text, int, int, timestamptz[]) to authenticated;
grant execute on function public.juntada_publica(text) to anon, authenticated;
grant execute on function public.unirse(text) to authenticated;
grant execute on function public.detalle_juntada(text) to authenticated;
grant execute on function public.votar(text, uuid[]) to authenticated;
grant execute on function public.cancelar(text) to authenticated;

-- Métricas del experimento: solo el operador, desde el panel de Supabase -----------------------

create view public.metricas_experimento
with (security_invoker = true)
as
select
  j.codigo,
  j.titulo,
  j.creada_en,
  j.tamano_grupo,
  v.votantes,
  round(v.votantes::numeric / j.tamano_grupo, 2) as tasa_voto,
  j.estado,
  round((extract(epoch from (j.cerrada_en - j.creada_en)) / 3600)::numeric, 1) as horas_hasta_cierre
from public.juntadas j
cross join lateral (
  select count(distinct m.perfil_id)::int as votantes
  from public.movimientos m
  where m.juntada_id = j.id and m.tipo = 'voto'
) v;

revoke all on table public.metricas_experimento from public, anon, authenticated;
