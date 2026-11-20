import { test, expect, type Page } from '@playwright/test';

// Spec 010, C6 y C12: /perfil sin sesión, /reglas y los links "¿Cómo se cuentan?" hacia /reglas.
// Corre contra `astro dev` (playwright.app.config.ts), así que la vista previa existe acá.
const sinScrollHorizontal = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth);

test.describe('375 px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('010·C6: /perfil sin sesión muestra "Entrar con Google" sin scroll horizontal', async ({ page }) => {
    const res = await page.goto('/perfil');
    expect(res?.status()).toBe(200);
    const boton = page.getByRole('button', { name: 'Entrar con Google' });
    await expect(boton).toBeVisible();
    expect((await boton.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await sinScrollHorizontal(page)).toBeLessThanOrEqual(375);
    await expect(page.getByRole('link', { name: 'Mi perfil' })).toHaveCount(0);
  });

  test('010·C12: /reglas se ve a 375 px sin scroll horizontal, con sus 4 secciones', async ({ page }) => {
    const res = await page.goto('/reglas');
    expect(res?.status()).toBe(200);
    for (const id of ['suman', 'restan', 'medallas', 'ejemplo']) await expect(page.locator(`#${id}`)).toBeVisible();
    expect(await sinScrollHorizontal(page)).toBeLessThanOrEqual(375);
  });

  for (const pantalla of ['votar', 'cerrada', 'perfil']) {
    test(`010·C12: la vista previa "${pantalla}" enlaza a /reglas y se ve sin scroll horizontal`, async ({ page }) => {
      await page.goto(`/vista-previa/${pantalla}`);
      const link = page.locator('a[href^="/reglas"]').first();
      await expect(link).toBeVisible();
      expect(await sinScrollHorizontal(page)).toBeLessThanOrEqual(375);
      await expect(page.getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('href', '/perfil');
    });
  }

  test('010·C12: en "votar" la grilla sigue arriba del ranking y el aviso enlaza a #restan', async ({ page }) => {
    await page.goto('/vista-previa/votar');
    await expect(page.locator('.en-juego a')).toHaveAttribute('href', '/reglas#restan');
    const grilla = await page.locator('.grilla').boundingBox();
    const ranking = await page.locator('.ranking').boundingBox();
    expect(grilla!.y).toBeLessThan(ranking!.y);
    await expect(page.locator('.ranking a', { hasText: '¿Cómo se cuentan?' })).toHaveAttribute('href', '/reglas');
  });
});

test('010·C12: el panel "Con premios" de la landing enlaza a /reglas', async ({ page }) => {
  await page.goto('/');
  const panel = page.locator('#solucion .panel', { hasText: 'Con premios' });
  await expect(panel.locator('a[href="/reglas"]')).toHaveCount(1);
});
