import { test, expect } from '@playwright/test';

// Spec 011, C4: en /perfil, las medallas por ganar se dibujan solo en el color apagado (y huecos).
test('011·C4: los íconos de medallas por ganar usan solo #4a4672 y el fondo', async ({ page }) => {
  await page.goto('/vista-previa/perfil');
  const porGanar = page.locator('.medallas li.por-ganar');
  expect(await porGanar.count()).toBeGreaterThan(0);
  const fills = await porGanar.locator('svg path').evaluateAll((ps) => ps.map((p) => p.getAttribute('fill')));
  expect(fills.length).toBeGreaterThan(0);
  for (const f of fills) expect(['#4a4672', '#1e1b3a']).toContain(f);
  const ganadas = await page.locator('.medallas li.ganada svg path').evaluateAll((ps) => ps.map((p) => p.getAttribute('fill')));
  expect(ganadas.some((f) => f !== '#4a4672' && f !== '#1e1b3a')).toBe(true);
});
