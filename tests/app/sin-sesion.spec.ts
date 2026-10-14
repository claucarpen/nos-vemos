import { test, expect, type Page } from '@playwright/test';

// Spec 003, C5: las páginas sin sesión se ven y funcionan.
const CODIGO_INEXISTENTE = 'AAAAAAAAAAAAAAAAAAAAAA'; // forma válida (22 base64url); el stub dice que no existe

const sinScrollHorizontal = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth);

test.describe('375 px', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('C5: /nueva sin sesión muestra "Entrar con Google" sin scroll horizontal', async ({ page }) => {
    const res = await page.goto('/nueva');
    expect(res?.status()).toBe(200);
    const boton = page.getByRole('button', { name: 'Entrar con Google' });
    await expect(boton).toBeVisible();
    const box = await boton.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(await sinScrollHorizontal(page)).toBeLessThanOrEqual(375);
  });

  test('C5: /j/<código-inexistente> responde 404 con "Esta juntada no existe" sin scroll horizontal', async ({ page }) => {
    const res = await page.goto(`/j/${CODIGO_INEXISTENTE}`);
    expect(res?.status()).toBe(404);
    await expect(page.getByText('Esta juntada no existe')).toBeVisible();
    expect(await sinScrollHorizontal(page)).toBeLessThanOrEqual(375);
  });

  test('C5: un código con forma inválida también da 404', async ({ page }) => {
    const res = await page.goto('/j/no-existe');
    expect(res?.status()).toBe(404);
    await expect(page.getByText('Esta juntada no existe')).toBeVisible();
  });
});
