// Spec 011, C3: cada medalla de premios.ts tiene ícono, y la versión apagada usa un solo color.
import { describe, expect, test } from 'vitest';
import { APAGADA, HUECO, ICONOS, capasDe } from './iconos-medallas';
import { MEDALLAS } from './premios';

describe('011·C3 íconos de medallas', () => {
  test('cada medalla de MEDALLAS tiene ícono con al menos una capa', () => {
    for (const m of MEDALLAS) {
      expect(ICONOS[m.id], m.id).toBeDefined();
      expect(ICONOS[m.id].capas.length, m.id).toBeGreaterThan(0);
    }
  });

  test('no hay íconos de medallas que no existen', () => {
    expect(Object.keys(ICONOS).sort()).toEqual(MEDALLAS.map((m) => m.id).sort());
  });

  test('los siete dibujos son distintos', () => {
    const dibujos = MEDALLAS.map((m) => ICONOS[m.id].capas.map((c) => c.d).join(''));
    expect(new Set(dibujos).size).toBe(MEDALLAS.length);
  });

  test('apagada: solo el color apagado y los huecos', () => {
    for (const m of MEDALLAS) {
      for (const c of capasDe(m.id, true)) expect([APAGADA, HUECO], m.id).toContain(c.color);
    }
  });
});
