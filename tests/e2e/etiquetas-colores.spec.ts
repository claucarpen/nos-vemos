import { test, expect } from '@playwright/test';

test('007·C2: las etiquetas de #solucion tienen los colores de estado', async ({ page }) => {
  await page.goto('/');
  const tags = page.locator('#solucion .tag');
  await expect(tags).toHaveCount(4);

  // Spec 010: "Con premios" pasó a Disponible; quedan 2 y 2.
  const ok = tags.filter({ hasText: 'Disponible' });
  await expect(ok).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    await expect(ok.nth(i)).toHaveCSS('background-color', 'rgb(187, 247, 208)');
    await expect(ok.nth(i)).toHaveCSS('color', 'rgb(20, 83, 45)');
  }

  const soon = tags.filter({ hasText: 'Próximamente' });
  await expect(soon).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    await expect(soon.nth(i)).toHaveCSS('background-color', 'rgb(254, 240, 138)');
    await expect(soon.nth(i)).toHaveCSS('color', 'rgb(113, 63, 18)');
  }
});
