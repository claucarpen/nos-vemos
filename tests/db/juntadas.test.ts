// Spec 003, C3: reglas de la juntada y seguridad, sobre Postgres embebido + shim, con 001 y 002.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { admin, anon, startDb, user, type Db } from './pg';

let db: Db;
beforeAll(async () => { db = await startDb(['001_leads.sql', '002_juntadas.sql']); });
afterAll(async () => { await db?.stop(); });

const TABLAS = ['tipos_evento', 'perfiles', 'juntadas', 'opciones', 'participantes', 'disponibilidad', 'movimientos'];

let n = 0;
// Un usuario de Google simulado en auth.users; devuelve su id.
async function nuevoUsuario(nombre = `Persona ${++n}`, email = `p${n}-${randomUUID().slice(0, 8)}@ejemplo.test`) {
  const id = randomUUID();
  await db.q(admin, 'insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)', [id, email, { full_name: nombre }]);
  return id;
}

// Fechas futuras: `dias` días desde ahora, en ISO.
const enDias = (dias: number) => new Date(Date.now() + dias * 86_400_000).toISOString();

async function crear(org: string, opts: { titulo?: string; quorum?: number; tamano?: number; inicios?: string[] } = {}) {
  const r = await db.q(user(org), 'select public.crear_juntada($1, $2, $3, $4::timestamptz[]) as codigo', [
    opts.titulo ?? 'Cena del jueves', opts.quorum ?? 4, opts.tamano ?? 8, opts.inicios ?? [enDias(3), enDias(4)],
  ]);
  return r.rows[0].codigo as string;
}

const unirse = (u: string, codigo: string) => db.q(user(u), 'select public.unirse($1)', [codigo]);
const votar = (u: string, codigo: string, ids: string[]) =>
  db.q(user(u), 'select public.votar($1, $2::uuid[]) as estado', [codigo, ids]).then((r) => r.rows[0].estado as string);
const detalle = (u: string, codigo: string) =>
  db.q(user(u), 'select public.detalle_juntada($1) as d', [codigo]).then((r) => r.rows[0].d);
const juntada = (codigo: string) =>
  db.q(admin, 'select * from public.juntadas where codigo = $1', [codigo]).then((r) => r.rows[0]);
const opciones = (codigo: string) =>
  db.q(admin, 'select o.id, o.inicio from public.opciones o join public.juntadas j on j.id = o.juntada_id where j.codigo = $1 order by o.inicio', [codigo])
    .then((r) => r.rows.map((x) => x.id as string));

// Crea una juntada y suma `cuantos` participantes además del organizador.
async function conGrupo(cuantos: number, opts: Parameters<typeof crear>[1] = {}) {
  const org = await nuevoUsuario();
  const codigo = await crear(org, opts);
  const gente: string[] = [];
  for (let i = 0; i < cuantos; i++) {
    const u = await nuevoUsuario();
    await unirse(u, codigo);
    gente.push(u);
  }
  return { org, codigo, gente, ops: await opciones(codigo) };
}

describe('crear_juntada', () => {
  test('con 1 opción → rechazo', async () => {
    const org = await nuevoUsuario();
    await expect(crear(org, { inicios: [enDias(2)] })).rejects.toThrow('cantidad_opciones');
  });

  test('con 11 opciones → rechazo', async () => {
    const org = await nuevoUsuario();
    await expect(crear(org, { inicios: Array.from({ length: 11 }, (_, i) => enDias(i + 1)) })).rejects.toThrow('cantidad_opciones');
  });

  test('con una opción pasada → rechazo', async () => {
    const org = await nuevoUsuario();
    await expect(crear(org, { inicios: [enDias(-1), enDias(2)] })).rejects.toThrow('opcion_pasada');
  });

  test('con opciones repetidas → rechazo', async () => {
    const org = await nuevoUsuario();
    const f = enDias(2);
    await expect(crear(org, { inicios: [f, f] })).rejects.toThrow('opciones_repetidas');
  });

  test('quórum mayor que el tamaño del grupo → rechazo', async () => {
    const org = await nuevoUsuario();
    await expect(crear(org, { quorum: 5, tamano: 4 })).rejects.toThrow('quorum_invalido');
  });

  test('válido → código de ≥22 caracteres base64url y organizador como participante', async () => {
    const org = await nuevoUsuario();
    const codigo = await crear(org);
    expect(codigo).toMatch(/^[A-Za-z0-9_-]{22,}$/);
    const j = await juntada(codigo);
    expect(j).toMatchObject({ estado: 'abierta', quorum: 4, maximo: 10, tamano_grupo: 8, tipo: 'cena' });
    const p = await db.q(admin, 'select perfil_id from public.participantes where juntada_id = $1', [j.id]);
    expect(p.rows).toEqual([{ perfil_id: org }]);
  });

  test('10.000 códigos generados por crear_juntada son base64url de ≥22 caracteres y no se repiten', async () => {
    const org = await nuevoUsuario();
    await db.q(user(org), `
      select public.crear_juntada('Prueba ' || g, 2, 2, array[now() + interval '1 day', now() + interval '2 days'])
      from generate_series(1, 10000) g`);
    const r = await db.q(admin, `
      select count(*)::int as total, count(distinct codigo)::int as distintos,
             count(*) filter (where codigo !~ '^[A-Za-z0-9_-]{22,}$')::int as malos
      from public.juntadas where organizador_id = $1`, [org]);
    expect(r.rows[0]).toEqual({ total: 10000, distintos: 10000, malos: 0 });
  });
});

describe('unirse', () => {
  test('el participante 11 → rechazo', async () => {
    const { codigo } = await conGrupo(9);
    const once = await nuevoUsuario();
    await expect(unirse(once, codigo)).rejects.toThrow('juntada_llena');
  });

  test('unirse dos veces → una sola fila', async () => {
    const { codigo, gente } = await conGrupo(1);
    await unirse(gente[0], codigo);
    const j = await juntada(codigo);
    const r = await db.q(admin, 'select count(*)::int as n from public.participantes where juntada_id = $1 and perfil_id = $2', [j.id, gente[0]]);
    expect(r.rows[0].n).toBe(1);
  });

  test('a una juntada cancelada → rechazo', async () => {
    const { org, codigo } = await conGrupo(0);
    await db.q(user(org), 'select public.cancelar($1)', [codigo]);
    await expect(unirse(await nuevoUsuario(), codigo)).rejects.toThrow('juntada_no_abierta');
  });
});

describe('votar y cierre por quórum', () => {
  test('votar sin ser participante → rechazo', async () => {
    const { codigo, ops } = await conGrupo(0);
    await expect(votar(await nuevoUsuario(), codigo, [ops[0]])).rejects.toThrow('no_participante');
  });

  test('votar una opción de otra juntada → rechazo', async () => {
    const a = await conGrupo(1);
    const b = await conGrupo(0);
    await expect(votar(a.gente[0], a.codigo, [b.ops[0]])).rejects.toThrow('opcion_ajena');
  });

  test('votar dos veces → reemplaza la disponibilidad', async () => {
    const { codigo, gente, ops } = await conGrupo(1);
    await votar(gente[0], codigo, [ops[0], ops[1]]);
    await votar(gente[0], codigo, [ops[1]]);
    const r = await db.q(admin, 'select opcion_id from public.disponibilidad where perfil_id = $1', [gente[0]]);
    expect(r.rows).toEqual([{ opcion_id: ops[1] }]);
  });

  test('llegar al quórum → cerrada con la ganadora correcta, cerrada_en y sin más votos', async () => {
    const { org, codigo, gente, ops } = await conGrupo(3, { quorum: 3, tamano: 6 });
    expect(await votar(org, codigo, [ops[1]])).toBe('abierta');
    expect(await votar(gente[0], codigo, [ops[0], ops[1]])).toBe('abierta');
    expect(await votar(gente[1], codigo, [ops[1]])).toBe('cerrada');
    const j = await juntada(codigo);
    expect(j.estado).toBe('cerrada');
    expect(j.opcion_ganadora_id).toBe(ops[1]);
    expect(j.cerrada_en).not.toBeNull();
    // votar con la juntada cerrada → rechazo
    await expect(votar(gente[2], codigo, [ops[0]])).rejects.toThrow('juntada_no_abierta');
  });

  test('dos opciones llegan juntas con distintos votos → gana la de más votos', async () => {
    // Con un solo voto cada opción suma a lo sumo 1, así que dos opciones solo llegan juntas empatadas.
    // Para probar la regla, se siembra directo (como admin) un estado con la más tardía arriba.
    const { codigo, gente, ops } = await conGrupo(4, { quorum: 2, tamano: 5 });
    const [temprana, tardia] = ops;
    await db.q(admin, 'insert into public.disponibilidad (opcion_id, perfil_id) values ($1, $2), ($1, $3), ($1, $4), ($5, $2)',
      [tardia, gente[0], gente[1], gente[2], temprana]);
    expect(await votar(gente[3], codigo, [temprana])).toBe('cerrada');
    expect((await juntada(codigo)).opcion_ganadora_id).toBe(tardia);
  });

  test('empate de votos → gana la más temprana', async () => {
    const { codigo, gente, ops } = await conGrupo(2, { quorum: 2, tamano: 3, inicios: [enDias(5), enDias(2), enDias(9)] });
    // `ops` viene ordenado por inicio: ops[0] es la más temprana (enDias(2)).
    await votar(gente[0], codigo, [ops[2], ops[0]]);
    expect(await votar(gente[1], codigo, [ops[0], ops[2]])).toBe('cerrada');
    expect((await juntada(codigo)).opcion_ganadora_id).toBe(ops[0]);
  });
});

describe('cancelar', () => {
  test('sin ser organizador → rechazo', async () => {
    const { codigo, gente } = await conGrupo(1);
    await expect(db.q(user(gente[0]), 'select public.cancelar($1)', [codigo])).rejects.toThrow('no_organizador');
  });

  test('el organizador cancela → cancelada; después no se vota', async () => {
    const { org, codigo, gente, ops } = await conGrupo(1);
    await db.q(user(org), 'select public.cancelar($1)', [codigo]);
    expect((await juntada(codigo)).estado).toBe('cancelada');
    await expect(votar(gente[0], codigo, [ops[0]])).rejects.toThrow('juntada_no_abierta');
  });
});

test('movimientos registra creo_juntada, se_unio, voto, confirmado y cancelo', async () => {
  const { org, codigo, gente, ops } = await conGrupo(1, { quorum: 2, tamano: 2 });
  await votar(org, codigo, [ops[0]]);
  await votar(gente[0], codigo, [ops[0], ops[1]]);
  const j = await juntada(codigo);
  const r = await db.q(admin, 'select perfil_id, tipo from public.movimientos where juntada_id = $1 order by id', [j.id]);
  expect(r.rows.slice(0, 4)).toEqual([
    { perfil_id: org, tipo: 'creo_juntada' },
    { perfil_id: gente[0], tipo: 'se_unio' },
    { perfil_id: org, tipo: 'voto' },
    { perfil_id: gente[0], tipo: 'voto' },
  ]);
  expect(r.rows.slice(4)).toHaveLength(2);
  expect(r.rows.slice(4)).toEqual(expect.arrayContaining([
    { perfil_id: org, tipo: 'confirmado' },
    { perfil_id: gente[0], tipo: 'confirmado' },
  ]));

  const otra = await conGrupo(0);
  await db.q(user(otra.org), 'select public.cancelar($1)', [otra.codigo]);
  const c = await db.q(admin, "select m.tipo from public.movimientos m join public.juntadas j on j.id = m.juntada_id where j.codigo = $1 and m.tipo = 'cancelo'", [otra.codigo]);
  expect(c.rowCount).toBe(1);
});

describe('seguridad', () => {
  test('anon no puede leer ninguna tabla nueva', async () => {
    await conGrupo(1);
    for (const t of TABLAS) {
      await expect(db.q(anon, `select * from public.${t}`), t).rejects.toThrow('permission denied');
    }
  });

  test('authenticated no puede insertar directo en ninguna tabla nueva', async () => {
    const u = await nuevoUsuario();
    const intentos: Record<string, string> = {
      tipos_evento: "insert into public.tipos_evento values ('futbol', 'Fútbol', 4, 10)",
      perfiles: `insert into public.perfiles (id, nombre) values ('${u}', 'Yo')`,
      juntadas: `insert into public.juntadas (codigo, titulo, organizador_id, quorum, tamano_grupo) values ('${'a'.repeat(22)}', 'x', '${u}', 2, 2)`,
      opciones: `insert into public.opciones (juntada_id, inicio) values ('${randomUUID()}', now())`,
      participantes: `insert into public.participantes (juntada_id, perfil_id) values ('${randomUUID()}', '${u}')`,
      disponibilidad: `insert into public.disponibilidad (opcion_id, perfil_id) values ('${randomUUID()}', '${u}')`,
      movimientos: `insert into public.movimientos (perfil_id, juntada_id, tipo) values ('${u}', '${randomUUID()}', 'voto')`,
    };
    for (const [t, sql] of Object.entries(intentos)) {
      await expect(db.q(user(u), sql), t).rejects.toThrow('permission denied');
    }
  });

  test('authenticated solo lee su propia fila de perfiles y ninguna otra tabla nueva', async () => {
    const { org, gente } = await conGrupo(1);
    const r = await db.q(user(gente[0]), 'select id from public.perfiles');
    expect(r.rows).toEqual([{ id: gente[0] }]);
    expect(r.rows).not.toContainEqual({ id: org });
    for (const t of TABLAS.filter((t) => t !== 'perfiles')) {
      await expect(db.q(user(gente[0]), `select * from public.${t}`), t).rejects.toThrow('permission denied');
    }
  });

  test('anon no puede llamar a las funciones de authenticated', async () => {
    const { codigo } = await conGrupo(0);
    for (const sql of [
      'select public.asegurar_perfil()',
      `select public.crear_juntada('x', 2, 2, array[now() + interval '1 day', now() + interval '2 days'])`,
      `select public.unirse('${codigo}')`,
      `select public.detalle_juntada('${codigo}')`,
      `select public.votar('${codigo}', '{}'::uuid[])`,
      `select public.cancelar('${codigo}')`,
    ]) {
      await expect(db.q(anon, sql), sql).rejects.toThrow('permission denied');
    }
  });

  test('juntada_publica (anon) devuelve solo título, organizador y estado', async () => {
    const org = await nuevoUsuario('Clau Organiza', 'clau@ejemplo.test');
    const codigo = await crear(org, { titulo: 'Asado' });
    const r = await db.q(anon, 'select * from public.juntada_publica($1)', [codigo]);
    expect(r.rows).toEqual([{ titulo: 'Asado', organizador: 'Clau Organiza', estado: 'abierta' }]);
    const nada = await db.q(anon, 'select * from public.juntada_publica($1)', ['x'.repeat(22)]);
    expect(nada.rowCount).toBe(0);
  });

  test('detalle_juntada no expone emails', async () => {
    const { org, codigo, gente } = await conGrupo(2);
    const d = await detalle(gente[0], codigo);
    const texto = JSON.stringify(d);
    expect(texto).not.toMatch(/@/);
    expect(texto).not.toContain(org);
    expect(d.participantes).toHaveLength(3);
    expect(Object.keys(d.participantes[0]).sort()).toEqual(['nombre', 'numero', 'soy_yo', 'voto']);
    expect(d.participantes.map((p: { numero: number }) => p.numero)).toEqual([1, 2, 3]);
  });

  test('un usuario no ve el detalle de una juntada ajena', async () => {
    const { codigo } = await conGrupo(1);
    await expect(detalle(await nuevoUsuario(), codigo)).rejects.toThrow('no_participante');
  });

  test('asegurar_perfil vincula el lead por email sin importar mayúsculas', async () => {
    await db.q(anon, "insert into public.leads (nombre, email) values ('Lead', 'mixto@ejemplo.test')");
    const u = await nuevoUsuario('Mixto', 'MiXto@Ejemplo.TEST');
    await db.q(user(u), 'select public.asegurar_perfil()');
    await db.q(user(u), 'select public.asegurar_perfil()');
    const r = await db.q(admin, 'select p.nombre, l.email from public.perfiles p join public.leads l on l.id = p.lead_id where p.id = $1', [u]);
    expect(r.rows).toEqual([{ nombre: 'Mixto', email: 'mixto@ejemplo.test' }]);
  });

  test('anon sigue pudiendo insertar en leads y no leer', async () => {
    await db.q(anon, "insert into public.leads (nombre, email) values ('Otro', 'otro-lead@ejemplo.test')");
    const r = await db.q(anon, 'select * from public.leads');
    expect(r.rowCount).toBe(0);
    const total = await db.q(admin, "select count(*)::int as n from public.leads where email = 'otro-lead@ejemplo.test'");
    expect(total.rows[0].n).toBe(1);
  });

  test('metricas_experimento: 6 votantes de 8 → 0.75; ni anon ni authenticated la leen', async () => {
    const { org, codigo, gente, ops } = await conGrupo(6, { quorum: 8, tamano: 8 });
    for (const u of gente) await votar(u, codigo, [ops[0]]);
    const r = await db.q(admin, 'select tamano_grupo, votantes, tasa_voto::float as tasa, estado, horas_hasta_cierre from public.metricas_experimento where codigo = $1', [codigo]);
    expect(r.rows).toEqual([{ tamano_grupo: 8, votantes: 6, tasa: 0.75, estado: 'abierta', horas_hasta_cierre: null }]);
    await expect(db.q(anon, 'select * from public.metricas_experimento')).rejects.toThrow('permission denied');
    await expect(db.q(user(org), 'select * from public.metricas_experimento')).rejects.toThrow('permission denied');
  });
});
