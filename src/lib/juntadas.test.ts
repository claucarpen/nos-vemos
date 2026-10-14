// Spec 003, C4: fechas en hora argentina, links de WhatsApp y forma del código.
// La generación del código (10.000 sin repetirse) vive en la base: tests/db/juntadas.test.ts.
import { describe, expect, test } from 'vitest';
import { desdeLocalArgentina, formatearInicio } from './fechas';
import { linkCierre, linkInvitacion, textoCierre } from './whatsapp';
import { esCodigo } from './codigo';
import { textoDeError } from './errores';

const PREFIJO = 'https://wa.me/?text=';
const decodificar = (link: string) => decodeURIComponent(link.slice(PREFIJO.length));

describe('fechas', () => {
  test('una fecha UTC se formatea en hora argentina', () => {
    // 00:00 UTC del viernes 24 es el jueves 23 a las 21:00 en Argentina.
    expect(formatearInicio('2025-10-24T00:00:00Z')).toBe('jueves 23/10, 21:00 h');
    expect(formatearInicio(new Date('2026-01-01T12:05:00Z'))).toBe('jueves 01/01, 09:05 h');
  });

  test('el valor de un datetime-local se interpreta como hora argentina', () => {
    expect(desdeLocalArgentina('2025-10-23T21:00')).toBe('2025-10-24T00:00:00.000Z');
    expect(desdeLocalArgentina('2026-02-31T10:00')).toBeNull();
    expect(desdeLocalArgentina('mañana')).toBeNull();
  });
});

describe('WhatsApp', () => {
  const url = 'https://nos-vemos.vercel.app/j/AbCdEfGhIjKlMnOpQrStUv';

  test('el aviso de cierre empieza con wa.me y decodifica al texto exacto', () => {
    const link = linkCierre('Cena del jueves', '2025-10-24T00:00:00Z', url);
    expect(link.startsWith(PREFIJO)).toBe(true);
    expect(decodificar(link)).toBe(`¡Nos vemos! Cena del jueves: jueves 23/10, 21:00 h. Detalle: ${url}`);
    expect(decodificar(link)).toBe(textoCierre('Cena del jueves', '2025-10-24T00:00:00Z', url));
  });

  test('"¿", "ñ" y "&" sobreviven codificados', () => {
    const titulo = '¿Asado & ñoquis? #29';
    const link = linkCierre(titulo, '2025-10-24T00:00:00Z', url);
    const crudo = link.slice(PREFIJO.length);
    expect(crudo).not.toMatch(/[¿ñ& #?]/);
    expect(crudo).toContain('%C2%BF');
    expect(crudo).toContain('%C3%B1');
    expect(crudo).toContain('%26');
    expect(decodificar(link)).toContain(titulo);
    expect(new URL(link).searchParams.get('text')).toContain(titulo);
  });

  test('la invitación lleva el link de la juntada', () => {
    const link = linkInvitacion('Cena & charla', url);
    expect(link.startsWith(PREFIJO)).toBe(true);
    expect(decodificar(link)).toBe(`¡Armemos Cena & charla! Entrá y marcá qué días podés: ${url}`);
  });
});

describe('código y errores', () => {
  test('esCodigo acepta base64url de 22 o más y rechaza lo demás', () => {
    expect(esCodigo('AbCdEfGhIjKlMnOpQrSt-_')).toBe(true);
    expect(esCodigo('corto')).toBe(false);
    expect(esCodigo('AbCdEfGhIjKlMnOpQrSt+/')).toBe(false);
    expect(esCodigo(undefined)).toBe(false);
  });

  test('los errores de la base se traducen; lo desconocido da el genérico', () => {
    expect(textoDeError({ message: 'juntada_no_abierta' })).toBe('La juntada ya no está abierta.');
    expect(textoDeError({ message: 'toString' })).toMatch(/GAME OVER/);
    expect(textoDeError(null)).toMatch(/GAME OVER/);
  });
});
