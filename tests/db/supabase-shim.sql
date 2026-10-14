-- Shim mínimo del entorno de Supabase para probar migraciones en un Postgres embebido.
-- Reproduce lo que las migraciones dan por sentado en un proyecto real:
--   roles `anon` y `authenticated` (se crean una vez por cluster, en `pg.ts`);
--   schema `auth` con `auth.users` y `auth.uid()` (misma definición que Supabase);
--   schema `extensions` con pgcrypto;
--   los privilegios por defecto de Supabase: todo objeto nuevo de `public` queda con `grant all`
--   para `anon` y `authenticated`. Por eso RLS y los `revoke` de cada migración son la única barrera.

create schema auth;

create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Igual que en Supabase: lee el claim viejo `request.jwt.claim.sub` o el JSON `request.jwt.claims`.
create function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create schema extensions;
create extension pgcrypto with schema extensions;
grant usage on schema extensions to anon, authenticated;

grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
