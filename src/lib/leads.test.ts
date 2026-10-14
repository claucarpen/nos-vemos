import { describe, expect, it } from 'vitest';
import { processLead, MESSAGES, type LeadRow, type LeadsClient } from './leads';

function fakeClient(error: { code?: string } | null = null) {
  const inserted: LeadRow[] = [];
  const client: LeadsClient = {
    from: () => ({
      insert: async (row) => {
        inserted.push(row);
        return { error };
      },
    }),
  };
  return { client, inserted };
}

const valid = { nombre: 'Ana', email: 'ana@ejemplo.com' };

describe('saveLead (lógica)', () => {
  it('nombre vacío → rechazo', async () => {
    const { client, inserted } = fakeClient();
    for (const nombre of ['', '   ']) {
      const r = await processLead({ ...valid, nombre }, client);
      expect(r.status).toBe('invalid');
    }
    expect(inserted).toHaveLength(0);
  });

  it('nombre de más de 80 caracteres → rechazo', async () => {
    const { client } = fakeClient();
    const r = await processLead({ ...valid, nombre: 'a'.repeat(81) }, client);
    expect(r.status).toBe('invalid');
  });

  it('nombre sin espacios sobrantes', async () => {
    const { client, inserted } = fakeClient();
    await processLead({ ...valid, nombre: '  Ana  ' }, client);
    expect(inserted[0].nombre).toBe('Ana');
  });

  it('email inválido → rechazo', async () => {
    const { client, inserted } = fakeClient();
    for (const email of ['', 'ana', 'ana@', 'ana@ejemplo', 'a na@x.com']) {
      const r = await processLead({ ...valid, email }, client);
      expect(r.status).toBe('invalid');
    }
    expect(inserted).toHaveLength(0);
  });

  it('email con mayúsculas → se guarda en minúsculas', async () => {
    const { client, inserted } = fakeClient();
    const r = await processLead({ ...valid, email: 'Ana@Ejemplo.COM' }, client);
    expect(r.status).toBe('ok');
    expect(r.message).toBe(MESSAGES.ok);
    expect(inserted[0].email).toBe('ana@ejemplo.com');
  });

  it('honeypot con valor → éxito sin insertar', async () => {
    const { client, inserted } = fakeClient();
    const r = await processLead({ ...valid, honeypot: 'spam' }, client);
    expect(r.status).toBe('ok');
    expect(r.message).toBe(MESSAGES.ok);
    expect(inserted).toHaveLength(0);
  });

  it('utm_source=WhatsApp → whatsapp', async () => {
    const { client, inserted } = fakeClient();
    await processLead({ ...valid, utm_source: 'WhatsApp' }, client);
    expect(inserted[0].fuente).toBe('whatsapp');
  });

  it('utm_source ausente → directo', async () => {
    const { client, inserted } = fakeClient();
    await processLead(valid, client);
    await processLead({ ...valid, utm_source: '' }, client);
    expect(inserted.map((r) => r.fuente)).toEqual(['directo', 'directo']);
  });

  it('utm_source con caracteres inválidos o demasiado largo → directo', async () => {
    const { client, inserted } = fakeClient();
    for (const utm_source of ['wha tsapp', 'a<b>', 'ñandú', 'x'.repeat(51)]) {
      await processLead({ ...valid, utm_source }, client);
    }
    expect(inserted.every((r) => r.fuente === 'directo')).toBe(true);
    expect(inserted).toHaveLength(4);
  });

  it('utm_source de 50 caracteres válidos se conserva', async () => {
    const { client, inserted } = fakeClient();
    await processLead({ ...valid, utm_source: 'a'.repeat(50) }, client);
    expect(inserted[0].fuente).toBe('a'.repeat(50));
  });

  it('email duplicado (error 23505) → éxito con "¡Ya estabas en la lista!"', async () => {
    const { client } = fakeClient({ code: '23505' });
    const r = await processLead(valid, client);
    expect(r.status).toBe('duplicate');
    expect(r.message).toBe('¡Ya estabas en la lista!');
  });

  it('otro error de la base → GAME OVER', async () => {
    const { client } = fakeClient({ code: '42501' });
    const r = await processLead(valid, client);
    expect(r.status).toBe('error');
    expect(r.message).toBe('GAME OVER… algo falló. Probá de nuevo.');
  });
});
