import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 375, height: 812 } });

test('006·C4: a 375px sin scroll horizontal y las 4 etiquetas visibles', async ({ page }) => {
  await page.goto('/');
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(375);

  const tags = page.locator('#solucion .tag');
  await expect(tags).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    await tags.nth(i).scrollIntoViewIfNeeded();
    await expect(tags.nth(i)).toBeVisible();
    const box = await tags.nth(i).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  }
});
