import { test, expect } from '@playwright/test';

// Spec 004, C5: /privacidad se ve en celular y carga limpia.
test.use({ viewport: { width: 375, height: 812 } });

test('C5: /privacidad a 375 px sin scroll horizontal y sin 404 ni errores de consola', async ({ page }) => {
  const bad: string[] = [];
  const errors: string[] = [];
  page.on('response', (res) => { if (res.status() >= 400) bad.push(`${res.status()} ${res.url()}`); });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const res = await page.goto('/privacidad');
  expect(res?.status()).toBe(200);
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await expect(page.getByRole('heading', { level: 1, name: 'Política de privacidad' })).toBeVisible();
  expect(bad, `respuestas con error: ${bad.join(', ')}`).toEqual([]);
  expect(errors, `errores de consola: ${errors.join(' | ')}`).toEqual([]);
});
