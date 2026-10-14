-- Leads de la landing: el público solo puede insertar, nunca leer.
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null unique,
  fuente text not null default 'directo',
  creado_en timestamptz not null default now()
);

alter table public.leads enable row level security;

create policy "anon puede insertar leads"
  on public.leads
  for insert
  to anon
  with check (true);
