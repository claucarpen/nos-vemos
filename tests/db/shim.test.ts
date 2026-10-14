// Paso 0 de la spec 003: el Postgres embebido con el shim de Supabase se comporta como Supabase.
import { afterAll, beforeAll, expect, test } from 'vitest';
import { admin, anon, startDb, user, type Db } from './pg';

let db: Db;
beforeAll(async () => { db = await startDb(['001_leads.sql']); });
afterAll(async () => { await db?.stop(); });

test('paso 0: anon inserta en leads', async () => {
  await db.q(anon, "insert into public.leads (nombre, email) values ('Ana', 'ana@ejemplo.test')");
  const r = await db.q(admin, "select count(*)::int as n from public.leads where email = 'ana@ejemplo.test'");
  expect(r.rows[0].n).toBe(1);
});

test('paso 0: anon no lee leads (RLS devuelve 0 filas aunque haya datos)', async () => {
  const total = await db.q(admin, 'select count(*)::int as n from public.leads');
  expect(total.rows[0].n).toBeGreaterThan(0);
  const r = await db.q(anon, 'select * from public.leads');
  expect(r.rowCount).toBe(0);
});

test('paso 0: auth.uid() devuelve el id simulado bajo authenticated', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const r = await db.q(user(id), 'select auth.uid() as uid, current_user as rol');
  expect(r.rows[0]).toEqual({ uid: id, rol: 'authenticated' });
});

test('paso 0: auth.uid() también lee el claim viejo request.jwt.claim.sub', async () => {
  const id = '22222222-2222-4222-8222-222222222222';
  const r = await db.q(admin, "select set_config('request.jwt.claim.sub', $1, true), auth.uid() as uid", [id]);
  expect(r.rows[0].uid).toBe(id);
});
