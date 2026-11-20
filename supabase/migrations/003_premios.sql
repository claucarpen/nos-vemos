-- v4 de Nos Vemos: puntos (también negativos), medallas y ranking por juntada (spec 010).
-- Sin tablas nuevas: todo se calcula a partir de `movimientos`, `participantes` y `juntadas`.
-- Los valores repiten los de `src/lib/premios.ts` (fuente única); `tests/db/premios.test.ts`
-- verifica que coincidan (010·C13). `001_leads.sql` y `002_juntadas.sql` no se tocan.

-- Valores ---------------------------------------------------------------------------------------

create function public.premios_valor(clave text)
returns int
language sql
immutable
security definer
set search_path = ''
as $$
  select case clave
    -- Suman
    when 'votar' then 10
    when 'voto_rapido' then 5
    when 'confirmado' then 20
    when 'organizar' then 30
    -- Restan
    when 'voto_tardio' then -5
    when 'te_colgaste' then -15
    when 'cambio_ultimo_momento' then -3
    when 'cancelar' then -15
    -- Ventanas y tope
    when 'horas_rapido' then 24
    when 'horas_tardio' then 72
    when 'horas_unido' then 12
    when 'horas_ultimo_momento' then 2
    when 'tope_cambios' then 3
    -- Umbrales de medallas
    when 'umbral_rayo' then 3
    when 'umbral_infaltable' then 5
    when 'umbral_anfitrion' then 3
    when 'umbral_fantasma' then 3
  end
$$;

-- Eventos de puntos ------------------------------------------------------------------------------
-- Una fila por regla que se cumple, por (persona, juntada), para las personas dadas.
-- `en`: cuándo se ganó (orden para las medallas y su juntada de origen).

create function public.premios_eventos(perfiles uuid[])
returns table (perfil_id uuid, juntada_id uuid, regla text, puntos int, en timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with p as (
    select
      pa.perfil_id, pa.juntada_id, pa.unido_en,
      j.estado, j.creada_en, j.cerrada_en, j.organizador_id,
      (select min(m.creado_en) from public.movimientos m
        where m.juntada_id = pa.juntada_id and m.perfil_id = pa.perfil_id and m.tipo = 'voto') as primer_voto,
      exists (select 1 from public.movimientos m
        where m.juntada_id = pa.juntada_id and m.perfil_id = pa.perfil_id and m.tipo = 'confirmado') as confirmado,
      (select m.creado_en from public.movimientos m
        where m.juntada_id = pa.juntada_id and m.perfil_id = pa.perfil_id and m.tipo = 'cancelo'
        order by m.id limit 1) as cancelo_en,
      -- Votos después del primero en la ventana de último momento antes del cierre.
      (select count(*)::int from (
         select m.creado_en, row_number() over (order by m.id) as k
         from public.movimientos m
         where m.juntada_id = pa.juntada_id and m.perfil_id = pa.perfil_id and m.tipo = 'voto'
       ) v
       where v.k > 1 and j.cerrada_en is not null
         and v.creado_en >= j.cerrada_en - make_interval(hours => public.premios_valor('horas_ultimo_momento'))
      ) as cambios
    from public.participantes pa
    join public.juntadas j on j.id = pa.juntada_id
    where pa.perfil_id = any (perfiles)
  )
  select perfil_id, juntada_id, 'votar', public.premios_valor('votar'), primer_voto
  from p where estado <> 'cancelada' and primer_voto is not null
  union all
  select perfil_id, juntada_id, 'voto_rapido', public.premios_valor('voto_rapido'), primer_voto
  from p where estado <> 'cancelada' and primer_voto is not null
    and primer_voto - creada_en < make_interval(hours => public.premios_valor('horas_rapido'))
  union all
  select perfil_id, juntada_id, 'voto_tardio', public.premios_valor('voto_tardio'), primer_voto
  from p where estado <> 'cancelada' and primer_voto is not null
    and primer_voto - creada_en >= make_interval(hours => public.premios_valor('horas_tardio'))
  union all
  select perfil_id, juntada_id, 'confirmado', public.premios_valor('confirmado'), cerrada_en
  from p where estado = 'cerrada' and confirmado
  union all
  select perfil_id, juntada_id, 'organizar', public.premios_valor('organizar'), cerrada_en
  from p where estado = 'cerrada' and perfil_id = organizador_id
  union all
  select perfil_id, juntada_id, 'te_colgaste', public.premios_valor('te_colgaste'), cerrada_en
  from p where estado = 'cerrada' and primer_voto is null
    and unido_en <= cerrada_en - make_interval(hours => public.premios_valor('horas_unido'))
  union all
  select perfil_id, juntada_id, 'cambio_ultimo_momento',
         public.premios_valor('cambio_ultimo_momento') * least(cambios, public.premios_valor('tope_cambios')),
         cerrada_en
  from p where estado = 'cerrada' and cambios > 0
  union all
  select perfil_id, juntada_id, 'cancelar', public.premios_valor('cancelar'), coalesce(cancelo_en, creada_en)
  from p where estado = 'cancelada' and perfil_id = organizador_id
$$;

-- Medallas ----------------------------------------------------------------------------------------
-- Una fila por medalla ganada (cada una, una sola vez), con su juntada de origen.

create function public.premios_medallas(perfiles uuid[])
returns table (perfil_id uuid, medalla text, juntada_id uuid, en timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  with e as (
    select * from public.premios_eventos(perfiles)
  ),
  n as (
    select e.*, row_number() over (partition by e.perfil_id, e.regla order by e.en, e.juntada_id) as k
    from e
  ),
  -- El que emitió el último voto (id más alto) de cada juntada cerrada.
  cierres as (
    select distinct on (m.juntada_id) m.juntada_id, m.perfil_id, j.cerrada_en
    from public.movimientos m
    join public.juntadas j on j.id = m.juntada_id
    where j.estado = 'cerrada' and m.tipo = 'voto'
      and m.juntada_id in (select pa.juntada_id from public.participantes pa where pa.perfil_id = any (perfiles))
    order by m.juntada_id, m.id desc
  ),
  destrabes as (
    select c.perfil_id, c.juntada_id, c.cerrada_en as en,
           row_number() over (partition by c.perfil_id order by c.cerrada_en, c.juntada_id) as k
    from cierres c
    where c.perfil_id = any (perfiles)
  ),
  -- Participaciones de cada persona en orden, para "Redención".
  part as (
    select pa.perfil_id, pa.juntada_id,
           row_number() over (partition by pa.perfil_id order by pa.unido_en, pa.juntada_id) as k
    from public.participantes pa
    where pa.perfil_id = any (perfiles)
  ),
  redenciones as (
    select b.perfil_id, b.juntada_id, v.en,
           row_number() over (partition by b.perfil_id order by v.en, b.juntada_id) as k
    from part a
    join part b on b.perfil_id = a.perfil_id and b.k = a.k + 1
    join e c on c.perfil_id = a.perfil_id and c.juntada_id = a.juntada_id and c.regla = 'te_colgaste'
    join e v on v.perfil_id = b.perfil_id and v.juntada_id = b.juntada_id and v.regla = 'votar'
  )
  select perfil_id, 'primer_voto', juntada_id, en from n where regla = 'votar' and k = 1
  union all
  select perfil_id, 'rayo', juntada_id, en from n
  where regla = 'voto_rapido' and k = public.premios_valor('umbral_rayo')
  union all
  select perfil_id, 'destrabador', juntada_id, en from destrabes where k = 1
  union all
  select perfil_id, 'infaltable', juntada_id, en from n
  where regla = 'confirmado' and k = public.premios_valor('umbral_infaltable')
  union all
  select perfil_id, 'anfitrion', juntada_id, en from n
  where regla = 'organizar' and k = public.premios_valor('umbral_anfitrion')
  union all
  select perfil_id, 'fantasma', juntada_id, en from n
  where regla = 'te_colgaste' and k = public.premios_valor('umbral_fantasma')
  union all
  select perfil_id, 'redencion', juntada_id, en from redenciones where k = 1
$$;

-- Funciones públicas ------------------------------------------------------------------------------

-- Ranking de una juntada, solo para sus participantes. Nombres, nunca emails ni ids.
create function public.ranking_juntada(codigo text)
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
  v_perfiles uuid[];
  v_r jsonb;
begin
  if v_uid is null then raise exception 'sin_sesion'; end if;
  select * into v_j from public.juntadas j where j.codigo = ranking_juntada.codigo;
  if not found then raise exception 'no_existe'; end if;
  if not exists (select 1 from public.participantes pa where pa.juntada_id = v_j.id and pa.perfil_id = v_uid) then
    raise exception 'no_participante';
  end if;

  v_perfiles := array(select pa.perfil_id from public.participantes pa where pa.juntada_id = v_j.id);

  with e as (select * from public.premios_eventos(v_perfiles)),
       m as (select * from public.premios_medallas(v_perfiles)),
       filas as (
         select p.nombre, pa.unido_en, pa.perfil_id,
                pa.perfil_id = v_uid as soy_yo,
                coalesce((select sum(e.puntos) from e where e.perfil_id = pa.perfil_id), 0)::int as puntos,
                (select count(*) from m where m.perfil_id = pa.perfil_id)::int as medallas
         from public.participantes pa
         join public.perfiles p on p.id = pa.perfil_id
         where pa.juntada_id = v_j.id
       )
  select jsonb_build_object(
    'creada_en', v_j.creada_en,
    'ranking', coalesce((
      select jsonb_agg(jsonb_build_object('nombre', f.nombre, 'puntos', f.puntos, 'medallas', f.medallas, 'soy_yo', f.soy_yo)
                       order by f.puntos desc, f.unido_en, f.perfil_id)
      from filas f), '[]'::jsonb),
    'medallas', coalesce((
      select jsonb_agg(jsonb_build_object('medalla', m.medalla, 'nombre', p.nombre) order by m.en, p.nombre)
      from m join public.perfiles p on p.id = m.perfil_id
      where m.juntada_id = v_j.id), '[]'::jsonb),
    'penalidades', coalesce((
      select jsonb_agg(jsonb_build_object('nombre', p.nombre, 'regla', e.regla, 'puntos', e.puntos) order by e.en, p.nombre)
      from e join public.perfiles p on p.id = e.perfil_id
      where e.juntada_id = v_j.id and e.puntos < 0), '[]'::jsonb)
  ) into v_r;

  return v_r;
end;
$$;

-- Lo de quien mira: puntos totales, medallas e historial de juntadas en las que participa.
create function public.mis_premios()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_r jsonb;
begin
  if v_uid is null then raise exception 'sin_sesion'; end if;

  with e as (select * from public.premios_eventos(array[v_uid])),
       m as (select * from public.premios_medallas(array[v_uid]))
  select jsonb_build_object(
    'puntos', coalesce((select sum(e.puntos) from e), 0)::int,
    'medallas', coalesce((
      select jsonb_agg(jsonb_build_object('medalla', m.medalla, 'fecha', m.en, 'codigo', j.codigo, 'titulo', j.titulo) order by m.en)
      from m join public.juntadas j on j.id = m.juntada_id), '[]'::jsonb),
    'historial', coalesce((
      select jsonb_agg(jsonb_build_object(
        'codigo', j.codigo, 'titulo', j.titulo, 'estado', j.estado,
        'puntos', coalesce((select sum(e.puntos) from e where e.juntada_id = j.id), 0)::int,
        'detalle', coalesce((
          select jsonb_agg(jsonb_build_object('regla', e.regla, 'puntos', e.puntos) order by e.en, e.regla)
          from e where e.juntada_id = j.id), '[]'::jsonb)
      ) order by pa.unido_en desc)
      from public.participantes pa
      join public.juntadas j on j.id = pa.juntada_id
      where pa.perfil_id = v_uid), '[]'::jsonb)
  ) into v_r;

  return v_r;
end;
$$;

-- Permisos ----------------------------------------------------------------------------------------
-- Las auxiliares no las ejecuta nadie más que las funciones de arriba (corren como su dueño).

revoke all on function public.premios_valor(text) from public, anon, authenticated;
revoke all on function public.premios_eventos(uuid[]) from public, anon, authenticated;
revoke all on function public.premios_medallas(uuid[]) from public, anon, authenticated;
revoke all on function public.ranking_juntada(text) from public, anon, authenticated;
revoke all on function public.mis_premios() from public, anon, authenticated;

grant execute on function public.ranking_juntada(text) to authenticated;
grant execute on function public.mis_premios() to authenticated;
