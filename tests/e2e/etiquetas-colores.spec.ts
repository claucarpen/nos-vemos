import { test, expect } from '@playwright/test';

test('007·C2: las etiquetas de #solucion tienen los colores de estado', async ({ page }) => {
  await page.goto('/');
  const tags = page.locator('#solucion .tag');
  await expect(tags).toHaveCount(4);

  const ok = tags.filter({ hasText: 'Disponible' });
  await expect(ok).toHaveCount(1);
  await expect(ok).toHaveCSS('background-color', 'rgb(187, 247, 208)');
  await expect(ok).toHaveCSS('color', 'rgb(20, 83, 45)');

  const soon = tags.filter({ hasText: 'Próximamente' });
  await expect(soon).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    await expect(soon.nth(i)).toHaveCSS('background-color', 'rgb(254, 240, 138)');
    await expect(soon.nth(i)).toHaveCSS('color', 'rgb(113, 63, 18)');
  }
});
