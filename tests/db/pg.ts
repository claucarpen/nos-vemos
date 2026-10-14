// Postgres embebido (sin Docker) con el shim de Supabase, para `npm run test:db`.
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..', '..');

function freePort(): Promise<number> {
  return new Promise((ok, ko) => {
    const s = createServer();
    s.once('error', ko);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address() as { port: number };
      s.close(() => ok(port));
    });
  });
}

export type Who = { role: 'anon' } | { role: 'authenticated'; sub: string } | { role: 'postgres' };
export const anon: Who = { role: 'anon' };
export const admin: Who = { role: 'postgres' };
export const user = (sub: string): Who => ({ role: 'authenticated', sub });

export type Db = {
  // Corre una consulta en una transacción con el rol dado (y el JWT simulado si es `authenticated`).
  q<T extends pg.QueryResultRow = any>(who: Who, sql: string, params?: unknown[]): Promise<pg.QueryResult<T>>;
  stop(): Promise<void>;
};

// Levanta un cluster nuevo, crea los roles, aplica el shim y las migraciones pedidas (en orden).
export async function startDb(migrations: string[]): Promise<Db> {
  const dir = await mkdtemp(join(tmpdir(), 'nos-vemos-pg-'));
  const port = await freePort();
  const server = new EmbeddedPostgres({
    databaseDir: join(dir, 'data'), port, user: 'postgres', password: 'postgres', persistent: false,
    onLog: () => {}, onError: () => {},
  });
  await server.initialise();
  await server.start();

  const pool = new pg.Pool({ host: '127.0.0.1', port, user: 'postgres', password: 'postgres', database: 'postgres', max: 4 });
  await pool.query('create role anon nologin noinherit; create role authenticated nologin noinherit; create role service_role nologin noinherit bypassrls;');
  await pool.query(await readFile(join(root, 'tests/db/supabase-shim.sql'), 'utf8'));
  for (const m of migrations) await pool.query(await readFile(join(root, 'supabase/migrations', m), 'utf8'));

  return {
    async q(who, sql, params) {
      const c = await pool.connect();
      try {
        await c.query('begin');
        if (who.role !== 'postgres') await c.query(`set local role ${who.role}`);
        if (who.role === 'authenticated') {
          await c.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: who.sub, role: 'authenticated' })]);
        }
        const r = await c.query(sql, params as any[]);
        await c.query('commit');
        return r;
      } catch (e) {
        await c.query('rollback');
        throw e;
      } finally {
        c.release();
      }
    },
    async stop() {
      await pool.end();
      await server.stop();
      await rm(dir, { recursive: true, force: true });
    },
  };
}
