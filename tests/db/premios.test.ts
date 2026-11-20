// Spec 010, C3–C5 y C13: puntos, medallas y ranking, sobre Postgres embebido + shim, con 001, 002 y 003.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { MEDALLAS, REGLAS, VENTANAS, puntosDe, type MisPremios, type ReglaId, type Ranking } from '../../src/lib/premios';
import { admin, anon, startDb, user, type Db } from './pg';

let db: Db;
beforeAll(async () => { db = await startDb(['001_leads.sql', '002_juntadas.sql', '003_premios.sql']); });
afterAll(async () => { await db?.stop(); });

let n = 0;
async function nuevoUsuario(nombre = `Persona ${++n}`) {
  const id = randomUUID();
  await db.q(admin, 'insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)',
    [id, `p${n}-${id.slice(0, 8)}@ejemplo.test`, { full_name: nombre }]);
  return id;
}

const enDias = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

async function crear(org: string, quorum = 2, tamano = 10) {
  const r = await db.q(user(org), 'select public.crear_juntada($1, $2, $3, $4::timestamptz[]) as c',
    ['Juntada de prueba', quorum, tamano, [enDias(3), enDias(4)]]);
  return r.rows[0].c as string;
}
const unirse = (u: string, c: string) => db.q(user(u), 'select public.unirse($1)', [c]);
const votar = (u: string, c: string, ids: string[]) =>
  db.q(user(u), 'select public.votar($1, $2::uuid[]) as e', [c, ids]).then((r) => r.rows[0].e as string);
const cancelar = (u: string, c: string) => db.q(user(u), 'select public.cancelar($1)', [c]);
const ops = (c: string) => db.q(admin,
  'select o.id from public.opciones o join public.juntadas j on j.id = o.juntada_id where j.codigo = $1 order by o.inicio', [c])
  .then((r) => r.rows.map((x) => x.id as string));
const premios = (u: string) => db.q(user(u), 'select public.mis_premios() as p').then((r) => r.rows[0].p as MisPremios);
const ranking = (u: string, c: string) =>
  db.q(user(u), 'select public.ranking_juntada($1) as r', [c]).then((r) => r.rows[0].r as Ranking);
const puntos = async (u: string) => (await premios(u)).puntos;
const medallas = async (u: string) => (await premios(u)).medallas.map((m) => m.medalla);

// Mueve la creación de la juntada `horas` hacia atrás (antes de votar: el voto queda `horas` después).
const atrasar = (c: string, horas: number) =>
  db.q(admin, "update public.juntadas set creada_en = now() - make_interval(hours => $2) where codigo = $1", [c, horas]);
// Pone la unión de alguien `horas` antes del cierre (después de cerrar).
const unidoAntesDelCierre = (u: string, c: string, horas: number) => db.q(admin,
  `update public.participantes pa set unido_en = j.cerrada_en - make_interval(hours => $3)
   from public.juntadas j where j.id = pa.juntada_id and j.codigo = $1 and pa.perfil_id = $2`, [c, u, horas]);

// Una juntada con organizador y `cuantos` participantes más, creada hace `horas` (30 por defecto:
// fuera de las ventanas de voto rápido y tardío, para aislar cada regla).
async function grupo(cuantos: number, horas = 30, quorum = 2) {
  const org = await nuevoUsuario();
  const c = await crear(org, quorum);
  const gente: string[] = [];
  for (let i = 0; i < cuantos; i++) { const u = await nuevoUsuario(); await unirse(u, c); gente.push(u); }
  if (horas) await atrasar(c, horas);
  return { org, c, gente, o: await ops(c) };
}

// Cierra la juntada: dos personas votan la primera opción (quórum 2).
async function cerrar(g: { c: string; o: string[] }, a: string, b: string) {
  await votar(a, g.c, [g.o[0]]);
  expect(await votar(b, g.c, [g.o[0]])).toBe('cerrada');
}

const detalleDe = async (u: string, c: string) =>
  (await premios(u)).historial.find((h) => h.codigo === c)!.detalle.map((d) => [d.regla, d.puntos]);

describe('010·C3 puntos', () => {
  test('votar una vez → 10', async () => {
    const g = await grupo(1);
    await votar(g.gente[0], g.c, [g.o[0]]);
    expect(await puntos(g.gente[0])).toBe(10);
  });

  test('votar en menos de 24 h → +5', async () => {
    const g = await grupo(1, 0);
    await votar(g.gente[0], g.c, [g.o[0]]);
    expect(await puntos(g.gente[0])).toBe(15);
  });

  test('votar a las 25 h → sin +5', async () => {
    const g = await grupo(1, 25);
    await votar(g.gente[0], g.c, [g.o[0]]);
    expect(await puntos(g.gente[0])).toBe(10);
  });

  test('votar 3 veces en la misma juntada → 10, no 30', async () => {
    const g = await grupo(1);
    for (const o of [g.o[0], g.o[1], g.o[0]]) await votar(g.gente[0], g.c, [o]);
    expect(await puntos(g.gente[0])).toBe(10);
  });

  test('confirmado → +20', async () => {
    const g = await grupo(2);
    await cerrar(g, g.gente[0], g.gente[1]);
    expect(await detalleDe(g.gente[0], g.c)).toEqual([['votar', 10], ['confirmado', 20]]);
    expect(await puntos(g.gente[0])).toBe(30);
  });

  test('organizador de una cerrada → +30', async () => {
    const g = await grupo(2);
    await cerrar(g, g.gente[0], g.gente[1]);
    await unidoAntesDelCierre(g.org, g.c, 1); // el organizador no votó: que no cuente "Te colgaste"
    expect(await detalleDe(g.org, g.c)).toEqual([['organizar', 30]]);
  });

  test('votos en una juntada luego cancelada → 0', async () => {
    const g = await grupo(1);
    await votar(g.gente[0], g.c, [g.o[0]]);
    await cancelar(g.org, g.c);
    expect(await puntos(g.gente[0])).toBe(0);
  });

  test('primer voto a las 72 h → 10 − 5 = 5', async () => {
    const g = await grupo(1, 72);
    await votar(g.gente[0], g.c, [g.o[0]]);
    expect(await puntos(g.gente[0])).toBe(5);
  });

  test('primer voto a las 71 h → 10', async () => {
    const g = await grupo(1, 71);
    await votar(g.gente[0], g.c, [g.o[0]]);
    expect(await puntos(g.gente[0])).toBe(10);
  });

  test('no votar, unido 13 h antes del cierre → −15', async () => {
    const g = await grupo(3);
    await cerrar(g, g.gente[0], g.gente[1]);
    await unidoAntesDelCierre(g.gente[2], g.c, 13);
    expect(await puntos(g.gente[2])).toBe(-15);
  });

  test('no votar, unido 11 h antes del cierre → 0', async () => {
    const g = await grupo(3);
    await cerrar(g, g.gente[0], g.gente[1]);
    await unidoAntesDelCierre(g.gente[2], g.c, 11);
    expect(await puntos(g.gente[2])).toBe(0);
  });

  test('no votar en una cancelada → 0', async () => {
    const g = await grupo(1);
    await db.q(admin, "update public.participantes set unido_en = now() - interval '48 hours' where perfil_id = $1", [g.gente[0]]);
    await cancelar(g.org, g.c);
    expect(await puntos(g.gente[0])).toBe(0);
  });

  test('organizador de una cancelada → −15', async () => {
    const g = await grupo(1);
    await cancelar(g.org, g.c);
    expect(await puntos(g.org)).toBe(-15);
  });

  test('2 cambios de voto en la última hora antes del cierre → −6', async () => {
    const g = await grupo(2);
    const u = g.gente[0];
    await votar(u, g.c, [g.o[1]]); // primer voto
    await votar(u, g.c, [g.o[1]]); // cambio 1
    await votar(u, g.c, [g.o[0]]); // cambio 2
    expect(await votar(g.gente[1], g.c, [g.o[0]])).toBe('cerrada');
    expect(await detalleDe(u, g.c)).toContainEqual(['cambio_ultimo_momento', -6]);
  });

  test('5 cambios → −9 (tope 3)', async () => {
    const g = await grupo(2);
    const u = g.gente[0];
    for (let i = 0; i < 6; i++) await votar(u, g.c, [g.o[1]]);
    await votar(u, g.c, [g.o[0]]);
    expect(await votar(g.gente[1], g.c, [g.o[0]])).toBe('cerrada');
    expect(await detalleDe(u, g.c)).toContainEqual(['cambio_ultimo_momento', -9]);
  });

  test('cambio de voto 3 h antes del cierre → 0', async () => {
    const g = await grupo(2);
    const u = g.gente[0];
    await votar(u, g.c, [g.o[1]]);
    await votar(u, g.c, [g.o[0]]);
    expect(await votar(g.gente[1], g.c, [g.o[0]])).toBe('cerrada');
    await db.q(admin, `update public.movimientos m set creado_en = j.cerrada_en - interval '3 hours'
      from public.juntadas j where j.id = m.juntada_id and j.codigo = $1 and m.perfil_id = $2 and m.tipo = 'voto'`, [g.c, u]);
    expect((await detalleDe(u, g.c)).map(([r]) => r)).not.toContain('cambio_ultimo_momento');
  });

  test('alguien con solo penalidades queda con total negativo', async () => {
    const g = await grupo(1);
    await cancelar(g.org, g.c);
    const h = await grupo(3);
    await cerrar(h, h.gente[0], h.gente[1]);
    await unidoAntesDelCierre(h.gente[2], h.c, 20);
    expect(await puntos(g.org)).toBeLessThan(0);
    expect(await puntos(h.gente[2])).toBeLessThan(0);
  });
});

describe('010·C4 medallas', () => {
  test('primer_voto al primer voto', async () => {
    const g = await grupo(1);
    expect(await medallas(g.gente[0])).not.toContain('primer_voto');
    await votar(g.gente[0], g.c, [g.o[0]]);
    expect(await medallas(g.gente[0])).toContain('primer_voto');
  });

  test('rayo al tercer voto rápido, no al segundo', async () => {
    const u = await nuevoUsuario();
    const cods: string[] = [];
    for (let i = 0; i < 3; i++) {
      const g = await grupo(0, 0);
      await unirse(u, g.c);
      await votar(u, g.c, [g.o[0]]);
      cods.push(g.c);
      if (i === 1) expect(await medallas(u)).not.toContain('rayo');
    }
    const p = await premios(u);
    expect(p.medallas.find((m) => m.medalla === 'rayo')?.codigo).toBe(cods[2]);
  });

  test('destrabador para quien emitió el último voto antes del cierre, y para nadie más', async () => {
    const g = await grupo(3);
    await votar(g.gente[2], g.c, [g.o[1]]);
    await cerrar(g, g.gente[0], g.gente[1]);
    const r = await ranking(g.gente[0], g.c);
    const llaves = r.medallas.filter((m) => m.medalla === 'destrabador');
    expect(llaves.length).toBe(1);
    expect(await medallas(g.gente[1])).toContain('destrabador');
    expect(await medallas(g.gente[0])).not.toContain('destrabador');
  });

  test('infaltable al quinto confirmado', async () => {
    const u = await nuevoUsuario();
    for (let i = 0; i < 5; i++) {
      const g = await grupo(1);
      await unirse(u, g.c);
      await votar(u, g.c, [g.o[0]]);
      expect(await votar(g.gente[0], g.c, [g.o[0]])).toBe('cerrada');
      if (i === 3) expect(await medallas(u)).not.toContain('infaltable');
    }
    expect(await medallas(u)).toContain('infaltable');
  });

  test('anfitrion a la tercera cerrada como organizador', async () => {
    const org = await nuevoUsuario();
    for (let i = 0; i < 3; i++) {
      const c = await crear(org);
      const a = await nuevoUsuario(); const b = await nuevoUsuario();
      await unirse(a, c); await unirse(b, c);
      const o = await ops(c);
      await votar(a, c, [o[0]]); await votar(b, c, [o[0]]);
      if (i === 1) expect(await medallas(org)).not.toContain('anfitrion');
    }
    expect(await medallas(org)).toContain('anfitrion');
  });

  // `u` se une a una juntada que se cierra sin su voto.
  async function colgarse(u: string) {
    const g = await grupo(2);
    await unirse(u, g.c);
    await cerrar(g, g.gente[0], g.gente[1]);
    await unidoAntesDelCierre(u, g.c, 24);
    return g.c;
  }

  test('fantasma al tercer "Te colgaste"', async () => {
    const u = await nuevoUsuario();
    await colgarse(u); await colgarse(u);
    expect(await medallas(u)).not.toContain('fantasma');
    await colgarse(u);
    expect(await medallas(u)).toContain('fantasma');
  });

  test('redencion al votar en la juntada siguiente a un "Te colgaste"', async () => {
    const u = await nuevoUsuario();
    await colgarse(u);
    const g = await grupo(1);
    await unirse(u, g.c);
    await votar(u, g.c, [g.o[0]]);
    const p = await premios(u);
    expect(p.medallas.find((m) => m.medalla === 'redencion')?.codigo).toBe(g.c);
  });

  test('sin redencion si votó en una que no era la siguiente', async () => {
    const u = await nuevoUsuario();
    await colgarse(u);
    const g1 = await grupo(1); await unirse(u, g1.c); // la siguiente: no vota
    const g2 = await grupo(1); await unirse(u, g2.c);
    await votar(u, g2.c, [g2.o[0]]);
    expect(await medallas(u)).not.toContain('redencion');
  });

  test('ninguna medalla se repite y la juntada de origen es la correcta', async () => {
    const u = await nuevoUsuario();
    const cods: string[] = [];
    for (let i = 0; i < 4; i++) {
      const g = await grupo(1, 0);
      await unirse(u, g.c);
      await votar(u, g.c, [g.o[0]]);
      cods.push(g.c);
    }
    const p = await premios(u);
    const ids = p.medallas.map((m) => m.medalla);
    expect(new Set(ids).size).toBe(ids.length);
    expect(p.medallas.find((m) => m.medalla === 'primer_voto')?.codigo).toBe(cods[0]);
    expect(p.medallas.find((m) => m.medalla === 'rayo')?.codigo).toBe(cods[2]);
  });
});

describe('010·C5 ranking seguro', () => {
  test('de una juntada ajena → no_participante', async () => {
    const g = await grupo(1);
    const otro = await nuevoUsuario();
    await expect(ranking(otro, g.c)).rejects.toThrow('no_participante');
  });

  test('código inexistente → no_existe', async () => {
    const u = await nuevoUsuario();
    await expect(ranking(u, 'NoExisteNoExisteNoExiste')).rejects.toThrow('no_existe');
  });

  test('no expone emails', async () => {
    const g = await grupo(3);
    await cerrar(g, g.gente[0], g.gente[1]);
    await unidoAntesDelCierre(g.gente[2], g.c, 20);
    const r = await ranking(g.gente[0], g.c);
    const texto = JSON.stringify(r);
    expect(texto).not.toMatch(/"email"/);
    expect(texto).not.toContain('@');
    expect(texto).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/); // tampoco ids
    expect(r.penalidades).toEqual([expect.objectContaining({ regla: 'te_colgaste', puntos: -15 })]);
  });

  test('orden por puntos y, en empate, por unido_en', async () => {
    const g = await grupo(3);
    await votar(g.gente[2], g.c, [g.o[0]]); // 10
    const r = await ranking(g.org, g.c);
    expect(r.ranking[0].puntos).toBe(10);
    // org, gente[0] y gente[1] con 0: en el orden en que se unieron (org primero).
    expect(r.ranking.slice(1).map((f) => f.puntos)).toEqual([0, 0, 0]);
    expect(r.ranking[1].soy_yo).toBe(true);
  });

  test('anon no puede ejecutar mis_premios ni ranking_juntada', async () => {
    await expect(db.q(anon, 'select public.mis_premios()')).rejects.toThrow(/permission denied/);
    await expect(db.q(anon, "select public.ranking_juntada('x')")).rejects.toThrow(/permission denied/);
  });

  test('authenticated no puede ejecutar las auxiliares', async () => {
    const u = await nuevoUsuario();
    for (const sql of ["select public.premios_valor('votar')", 'select * from public.premios_eventos(array[]::uuid[])',
      'select * from public.premios_medallas(array[]::uuid[])']) {
      await expect(db.q(user(u), sql)).rejects.toThrow(/permission denied/);
    }
  });

  test('mis_premios no incluye juntadas en las que no participa', async () => {
    const g = await grupo(1);
    const otro = await grupo(1);
    await votar(otro.gente[0], otro.c, [otro.o[0]]);
    const p = await premios(g.gente[0]);
    expect(p.historial.map((h) => h.codigo)).toEqual([g.c]);
  });

  test('ranking_juntada tarda menos de 200 ms con 50 juntadas y 10 personas', async () => {
    const gente = await Promise.all(Array.from({ length: 10 }, () => nuevoUsuario()));
    let ultima = '';
    for (let i = 0; i < 50; i++) {
      const org = gente[i % 10];
      const c = await crear(org, 10);
      for (const u of gente) if (u !== org) await unirse(u, c);
      const o = await ops(c);
      for (const u of gente.slice(0, 5)) await votar(u, c, [o[i % 2]]);
      ultima = c;
    }
    await ranking(gente[0], ultima); // calienta
    const t = performance.now();
    await ranking(gente[0], ultima);
    const ms = performance.now() - t;
    console.log(`ranking_juntada: ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(200);
  }, 120_000);
});

describe('010·C13 los valores coinciden con src/lib/premios.ts', () => {
  const valor = (k: string) => db.q(admin, 'select public.premios_valor($1) as v', [k]).then((r) => r.rows[0].v as number);

  test('ventanas, tope y umbrales de medallas', async () => {
    for (const [k, v] of Object.entries(VENTANAS)) expect(await valor(k), k).toBe(v);
    for (const m of MEDALLAS.filter((x) => x.umbral !== null)) expect(await valor(`umbral_${m.id}`), m.id).toBe(m.umbral);
  });

  // Un escenario por regla: el valor que calcula la base es exactamente el del módulo.
  const escenarios: Record<ReglaId, () => Promise<[string, string]>> = {
    async votar() { const g = await grupo(1); await votar(g.gente[0], g.c, [g.o[0]]); return [g.gente[0], g.c]; },
    async voto_rapido() { const g = await grupo(1, 0); await votar(g.gente[0], g.c, [g.o[0]]); return [g.gente[0], g.c]; },
    async voto_tardio() { const g = await grupo(1, 80); await votar(g.gente[0], g.c, [g.o[0]]); return [g.gente[0], g.c]; },
    async confirmado() { const g = await grupo(2); await cerrar(g, g.gente[0], g.gente[1]); return [g.gente[0], g.c]; },
    async organizar() { const g = await grupo(2); await cerrar(g, g.gente[0], g.gente[1]); return [g.org, g.c]; },
    async te_colgaste() {
      const g = await grupo(3); await cerrar(g, g.gente[0], g.gente[1]); await unidoAntesDelCierre(g.gente[2], g.c, 20);
      return [g.gente[2], g.c];
    },
    async cambio_ultimo_momento() {
      const g = await grupo(2); await votar(g.gente[0], g.c, [g.o[1]]); await cerrar(g, g.gente[0], g.gente[1]);
      return [g.gente[0], g.c];
    },
    async cancelar() { const g = await grupo(1); await cancelar(g.org, g.c); return [g.org, g.c]; },
  };

  test.each(REGLAS.map((r) => [r.id]))('%s', async (id) => {
    const [u, c] = await escenarios[id as ReglaId]();
    const d = await detalleDe(u, c);
    expect(d.find(([r]) => r === id), `${id} no apareció`).toEqual([id, puntosDe(id as ReglaId)]);
  });
});
