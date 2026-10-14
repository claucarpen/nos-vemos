import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

test('C8: sin scroll horizontal a 375px y el botón del formulario es visible', async ({ page }) => {
  await page.goto('/');
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(375);

  const button = page.locator('#form-leads button[type="submit"]');
  await button.scrollIntoViewIfNeeded();
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
});
